import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseReady } from "../lib/supabase";
import { generateInviteCode, normalizeInviteCode } from "../lib/inviteCode";
import {
  sanitizeUsername,
  validateInviteCode
} from "../lib/validators";

const SejalanContext = createContext(null);

const defaultState = {
  couple_code: null,
  mood_creator: "😊 happy",
  mood_partner: "🌸 calm",
  shared_notes: "",
  partner_activity: "",
  streak: 0,
  plans: [],
  updated_at: new Date().toISOString(),
};

const LS = {
  username: "sejalan_username",
  inviteCode: "sejalan_invite_code",
  role: "sejalan_role",
  localState: "sejalan_local_state",
  theme: "sejalan_theme",
};

// Clean up legacy localStorage keys from the v1 hardcoded-couple version
(function cleanupLegacy() {
  try {
    ["sejalan_user", "sejalan_couple_ok", "sejalan_last_check_ilham", "sejalan_last_check_lisna"].forEach((k) => {
      if (localStorage.getItem(k) !== null) localStorage.removeItem(k);
    });
  } catch {}
})();

export const SejalanProvider = ({ children }) => {
  const [username, setUsername] = useState(() => localStorage.getItem(LS.username) || null);
  const [inviteCode, setInviteCode] = useState(() => localStorage.getItem(LS.inviteCode) || null);
  const [role, setRole] = useState(() => localStorage.getItem(LS.role) || null); // 'creator' | 'partner'
  const [room, setRoom] = useState(null);
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(LS.localState);
      return raw ? { ...defaultState, ...JSON.parse(raw) } : { ...defaultState };
    } catch {
      return { ...defaultState };
    }
  });
  const [syncStatus, setSyncStatus] = useState({ type: "pending", text: "Menyiapkan..." });
  const [dark, setDark] = useState(() => localStorage.getItem(LS.theme) === "true");
  const stateChannelRef = useRef(null);
  const roomChannelRef = useRef(null);

  // Theme
  useEffect(() => {
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem(LS.theme, String(dark));
  }, [dark]);

  const toggleDark = useCallback(() => setDark((d) => !d), []);

  // Persist local state
  useEffect(() => {
    if (inviteCode) localStorage.setItem(LS.localState, JSON.stringify(state));
  }, [state, inviteCode]);

  // ------ Supabase helpers ------
  const fetchRoom = useCallback(async (code) => {
    if (!isSupabaseReady()) return null;
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .eq("invite_code", code)
      .maybeSingle();
    return data || null;
  }, []);

  const fetchState = useCallback(async (code) => {
    if (!isSupabaseReady()) return null;
    const { data } = await supabase
      .from("sejalan_state")
      .select("*")
      .eq("couple_code", code)
      .maybeSingle();
    return data || null;
  }, []);

  const ensureState = useCallback(
    async (code) => {
      if (!isSupabaseReady()) return;
      const existing = await fetchState(code);
      if (!existing) {
        await supabase.from("sejalan_state").upsert(
          {
            couple_code: code,
            mood_creator: defaultState.mood_creator,
            mood_partner: defaultState.mood_partner,
            shared_notes: "",
            streak: 0,
            plans: [],
            updated_at: new Date().toISOString(),
          },
          { onConflict: "couple_code" }
        );
      }
    },
    [fetchState]
  );

  // ------ Auth actions ------
  const createRoom = useCallback(
    async (rawUsername) => {
      if (!isSupabaseReady()) throw new Error("Koneksi Supabase belum siap");
      const uname = sanitizeUsername(rawUsername);
      if (!uname) throw new Error("Username wajib diisi");
      if (uname.length > 20) throw new Error("Username maksimal 20 karakter");

      // Generate unique invite code (retry up to 6 times)
      let code = null;
      for (let i = 0; i < 6; i++) {
        const candidate = generateInviteCode();
        const exists = await fetchRoom(candidate);
        if (!exists) {
          code = candidate;
          break;
        }
      }
      if (!code) throw new Error("Gagal generate kode, coba lagi");

      const { data, error } = await supabase
        .from("rooms")
        .insert({
          invite_code: code,
          creator_username: uname,
          status: "waiting_partner",
        })
        .select()
        .single();
      if (error) throw new Error(error.message || "Gagal bikin room");

      await ensureState(code);

      localStorage.setItem(LS.username, uname);
      localStorage.setItem(LS.inviteCode, code);
      localStorage.setItem(LS.role, "creator");
      setUsername(uname);
      setInviteCode(code);
      setRole("creator");
      setRoom(data);
      return data;
    },
    [fetchRoom, ensureState]
  );

  const joinRoom = useCallback(
    async (rawUsername, rawCode) => {
      if (!isSupabaseReady()) throw new Error("Koneksi Supabase belum siap");
      const uname = sanitizeUsername(rawUsername);
      const code = normalizeInviteCode(rawCode);
      if (!uname) throw new Error("Username wajib diisi");
      if (!code) throw new Error("Invite code wajib diisi");

      if (!validateInviteCode(code)) {
        throw new Error("Invite code tidak valid");
      }

      const target = await fetchRoom(code);
      if (!target) throw new Error("invalid_invite_code");

      // Returning creator → rejoin same role
      if (target.creator_username === uname) {
        localStorage.setItem(LS.username, uname);
        localStorage.setItem(LS.inviteCode, code);
        localStorage.setItem(LS.role, "creator");
        setUsername(uname);
        setInviteCode(code);
        setRole("creator");
        setRoom(target);
        return target;
      }

      // Returning partner → rejoin same role
      if (target.partner_username && target.partner_username === uname) {
        localStorage.setItem(LS.username, uname);
        localStorage.setItem(LS.inviteCode, code);
        localStorage.setItem(LS.role, "partner");
        setUsername(uname);
        setInviteCode(code);
        setRole("partner");
        setRoom(target);
        return target;
      }

      // Room already has 2 different users
      if (target.partner_username) {
        throw new Error("Room sudah penuh (maks 2 user)");
      }

      // Join as partner
      const { data, error } = await supabase
        .from("rooms")
        .update({
          partner_username: uname,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("invite_code", code)
        .select()
        .single();
      if (error) throw new Error(error.message || "Gagal join");

      await ensureState(code);

      localStorage.setItem(LS.username, uname);
      localStorage.setItem(LS.inviteCode, code);
      localStorage.setItem(LS.role, "partner");
      setUsername(uname);
      setInviteCode(code);
      setRole("partner");
      setRoom(data);
      return data;
    },
    [fetchRoom, ensureState]
  );

  // Leave room: clears local session only (does NOT delete room data)
  const leaveRoom = useCallback(() => {
    localStorage.removeItem(LS.username);
    localStorage.removeItem(LS.inviteCode);
    localStorage.removeItem(LS.role);
    localStorage.removeItem(LS.localState);
    if (stateChannelRef.current && isSupabaseReady()) supabase.removeChannel(stateChannelRef.current);
    if (roomChannelRef.current && isSupabaseReady()) supabase.removeChannel(roomChannelRef.current);
    stateChannelRef.current = null;
    roomChannelRef.current = null;
    setUsername(null);
    setInviteCode(null);
    setRole(null);
    setRoom(null);
    setState({ ...defaultState });
    setSyncStatus({ type: "pending", text: "Belum dalam room" });
  }, []);

  // ------ Patch sejalan_state ------
  const persistPatch = useCallback(
    async (patch) => {
      setState((prev) => ({ ...prev, ...patch, updated_at: new Date().toISOString() }));
      if (!isSupabaseReady() || !inviteCode) {
        setSyncStatus({ type: "err", text: "Mode offline" });
        return;
      }
      try {
        await supabase
          .from("sejalan_state")
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq("couple_code", inviteCode);
        setSyncStatus({ type: "ok", text: "Realtime tersambung" });
      } catch {
        setSyncStatus({ type: "err", text: "Sync gagal" });
      }
    },
    [inviteCode]
  );

  // ------ Realtime + initial fetch ------
  useEffect(() => {
    if (!inviteCode) {
      setSyncStatus({ type: "pending", text: "Belum dalam room" });
      return;
    }
    if (!isSupabaseReady()) {
      setSyncStatus({ type: "err", text: "Mode offline" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [r, s] = await Promise.all([fetchRoom(inviteCode), fetchState(inviteCode)]);
        if (!cancelled) {
          if (r) setRoom(r);
          if (s) setState((p) => ({ ...defaultState, ...p, ...s }));
          setSyncStatus({ type: "ok", text: "Realtime tersambung" });
        }

        if (stateChannelRef.current) supabase.removeChannel(stateChannelRef.current);
        const stateCh = supabase
          .channel(`state-${inviteCode}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "sejalan_state",
              filter: `couple_code=eq.${inviteCode}`,
            },
            (payload) => {
              if (payload?.new) {
                setState((prev) => ({ ...defaultState, ...prev, ...payload.new }));
                setSyncStatus({ type: "ok", text: "Realtime tersambung" });
              }
            }
          )
          .subscribe();
        stateChannelRef.current = stateCh;

        if (roomChannelRef.current) supabase.removeChannel(roomChannelRef.current);
        const roomCh = supabase
          .channel(`room-${inviteCode}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "rooms",
              filter: `invite_code=eq.${inviteCode}`,
            },
            (payload) => {
              if (payload?.new) setRoom(payload.new);
            }
          )
          .subscribe();
        roomChannelRef.current = roomCh;
      } catch {
        if (!cancelled) setSyncStatus({ type: "err", text: "Gagal konek" });
      }
    })();
    return () => {
      cancelled = true;
      if (stateChannelRef.current) supabase.removeChannel(stateChannelRef.current);
      if (roomChannelRef.current) supabase.removeChannel(roomChannelRef.current);
      stateChannelRef.current = null;
      roomChannelRef.current = null;
    };
  }, [inviteCode, fetchRoom, fetchState]);

  // Derived values
  const inRoom = !!inviteCode && !!username && !!role;
  const partnerUsername = room
    ? role === "creator"
      ? room.partner_username
      : room.creator_username
    : null;
  const roomStatus = room?.status || "waiting_partner";
  const isRoomActive = roomStatus === "active";

  const myMoodKey = role === "creator" ? "mood_creator" : "mood_partner";
  const partnerMoodKey = role === "creator" ? "mood_partner" : "mood_creator";
  const myMood = state?.[myMoodKey] || (role === "creator" ? "😊 happy" : "🌸 calm");
  const partnerMood = state?.[partnerMoodKey] || (role === "creator" ? "🌸 calm" : "😊 happy");

  const value = {
    username,
    inviteCode,
    role,
    room,
    state,
    syncStatus,
    dark,
    inRoom,
    partnerUsername,
    roomStatus,
    isRoomActive,
    myMoodKey,
    partnerMoodKey,
    myMood,
    partnerMood,
    createRoom,
    joinRoom,
    leaveRoom,
    persistPatch,
    toggleDark,
  };
  return <SejalanContext.Provider value={value}>{children}</SejalanContext.Provider>;
};

export const useSejalan = () => {
  const ctx = useContext(SejalanContext);
  if (!ctx) throw new Error("useSejalan must be used inside SejalanProvider");
  return ctx;
};
