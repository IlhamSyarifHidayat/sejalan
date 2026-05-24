import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import MobileContainer from "../components/MobileContainer";
import FloatingHearts from "../components/FloatingHearts";
import ThemeToggle from "../components/ThemeToggle";
import { useSejalan } from "../context/SejalanContext";
import { supabase, isSupabaseReady } from "../lib/supabase";
import { formatAnniversaryDate } from "../utils/anniversary";
import {
  Images,
  Calendar,
  Flame,
  MessageCircleHeart,
  StickyNote,
  Download,
  Upload as UploadIcon,
  LogOut,
  X,
  RefreshCw,
  Copy,
  Check,
  Share2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

const QUESTIONS = [
  "Apa hal kecil yang bikin kamu senyum hari ini?",
  "Hari ini capek nggak?",
  "Apa yang paling kamu syukuri dari hubungan ini?",
  "Apa yang bikin hubungan ini terasa nyaman?",
  "Kalau lagi sedih, aku bisa bantu apa?",
  "Hal random apa yang bikin kamu inget aku?",
  "Apa memori favoritmu minggu ini?",
  "Apa yang pengen kita lakukan bareng minggu ini?",
  "Apa yang bikin kamu merasa dicintai?",
  "Kalau bisa peluk sekarang, kamu mau bilang apa?",
];

const MOODS = [
  { emoji: "😊", label: "happy", key: "😊 happy" },
  { emoji: "😴", label: "tired", key: "😴 tired" },
  { emoji: "😔", label: "sad", key: "😔 sad" },
  { emoji: "🔥", label: "excited", key: "🔥 excited" },
  { emoji: "🌸", label: "calm", key: "🌸 calm" },
  { emoji: "🥰", label: "loved", key: "🥰 loved" },
  { emoji: "😪", label: "sleepy", key: "😪 sleepy" },
  { emoji: "💭", label: "thinking", key: "💭 thinking" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const {
    inRoom,
    username,
    inviteCode,
    role,
    room,
    state,
    syncStatus,
    partnerUsername,
    isRoomActive,
    myMoodKey,
    partnerMoodKey,
    myMood,
    partnerMood,
    persistPatch,
    leaveRoom,
  } = useSejalan();

  const [question, setQuestion] = useState(QUESTIONS[0]);
  const [planInput, setPlanInput] = useState("");
  const [notesValue, setNotesValue] = useState(state.shared_notes || "");
  const [photoCount, setPhotoCount] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);
  const notesDebounce = useRef(null);
  const fileImportRef = useRef(null);

  useEffect(() => {
    setQuestion(QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)]);
  }, []);

  useEffect(() => {
    setNotesValue(state.shared_notes || "");
  }, [state.shared_notes]);

  useEffect(() => {
    if (!isSupabaseReady() || !inviteCode) return;
    (async () => {
      try {
        const { count } = await supabase
          .from("photos")
          .select("id", { count: "exact", head: true })
          .eq("couple_code", inviteCode);
        setPhotoCount(count || 0);
      } catch {}
    })();
  }, [inviteCode]);

  // Anniversary countdown (must be above early returns)
  const countdown = useMemo(() => {
    if (!room?.anniversary_date) return "Belum diatur";
    const start = new Date(room?.anniversary_date);
    const diffMs = Math.abs(new Date() - start);
    const days = Math.floor(diffMs / 86400000);
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    const rem = (days % 365) % 30;
    return `${years}y ${months}m ${rem}d`;
  }, [room?.anniversary_date]);

  if (!inRoom) return <Navigate to="/auth" replace />;

  const now = new Date();
  const hour = now.getHours();
  let greeting = "Selamat malam";
  if (hour >= 4 && hour < 11) greeting = "Selamat pagi";
  else if (hour >= 11 && hour < 15) greeting = "Selamat siang";
  else if (hour >= 15 && hour < 18) greeting = "Selamat sore";

  const today = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const setMood = async (mood) => {
    const activity = `💖 ${username} merasa ${mood}`;
    await persistPatch({ [myMoodKey]: mood, partner_activity: activity });
  };

  const onNotes = (e) => {
    const v = e.target.value;
    setNotesValue(v);
    clearTimeout(notesDebounce.current);
    notesDebounce.current = setTimeout(() => {
      persistPatch({
        shared_notes: v,
        partner_activity: `📝 ${username} menulis sesuatu di Shared Notes`,
      });
    }, 500);
  };

  const checkin = async () => {
    const todayStr = new Date().toDateString();
    const lastKey = `sejalan_last_check_${inviteCode}_${username}`;
    const last = localStorage.getItem(lastKey);
    if (last === todayStr) {
      toast.info("Hari ini sudah check-in 💖");
      return;
    }
    localStorage.setItem(lastKey, todayStr);
    const next = Number(state.streak || 0) + 1;
    await persistPatch({ streak: next });
    toast.success(`Check-in berhasil! Streak ${next} hari 🔥`);
  };

  const addPlan = async () => {
    const v = planInput.trim();
    if (!v) return;
    const plans = Array.isArray(state.plans) ? state.plans : [];
    await persistPatch({ plans: [...plans, v] });
    setPlanInput("");
  };

  const removePlan = async (idx) => {
    const plans = Array.isArray(state.plans) ? [...state.plans] : [];
    plans.splice(idx, 1);
    await persistPatch({ plans });
  };

  const exportData = () => {
    const payload = {
      version: 2,
      invite_code: inviteCode,
      username,
      role,
      state,
      room,
      theme_dark: document.documentElement.classList.contains("dark"),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sejalan-${inviteCode}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Backup di-export 💾");
  };

  const importData = () => fileImportRef.current?.click();

  const onImportFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      if (data?.state) await persistPatch(data.state);
      toast.success("Backup berhasil di-import 💖");
    } catch {
      toast.error("File tidak valid");
    } finally {
      e.target.value = "";
    }
  };

  const handleLogout = () => {
    if (window.confirm("Keluar dari room? Data room tetap aman, kamu bisa join lagi nanti.")) {
      leaveRoom();
      navigate("/");
    }
  };

  const copyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopiedCode(true);
      toast.success("Invite code disalin");
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error("Gagal copy");
    }
  };

  const shareInviteCode = async () => {
    const text = `Yuk masuk ke Sejalan kita 💖\n\nInvite code: ${inviteCode}\nLink: ${window.location.origin}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Sejalan 💖", text });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Pesan disalin");
    } catch {}
  };

  const dotClass =
    syncStatus.type === "ok"
      ? "bg-emerald-400"
      : syncStatus.type === "err"
      ? "bg-rose-400"
      : "bg-amber-400";

  const partnerEmoji = String(partnerMood || "💖").split(" ")[0];

  return (
    <MobileContainer className="pb-12">
      <div className="absolute inset-0 -z-10 sj-bg" aria-hidden="true" />
      <FloatingHearts count={8} />

      <div className="relative z-10 px-5 pt-6">
        {/* Topbar */}
        <div className="flex items-center justify-between mb-5">
          <div className="min-w-0">
            <h2
              className="font-heading text-[22px] font-semibold text-[#2D2640] dark:text-[#F8F4FF] leading-tight truncate"
              data-testid="dashboard-welcome"
            >
              {greeting}, {username} 💖
            </h2>
            <div className="text-[12px] text-[#6E628A] dark:text-[#A295B8] mt-0.5">{today}</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle size="sm" testId="dashboard-theme-toggle" />
            <button
              type="button"
              onClick={handleLogout}
              data-testid="dashboard-logout-btn"
              aria-label="Keluar room"
              className="w-10 h-10 rounded-2xl glass-soft flex items-center justify-center text-[#6E628A] dark:text-[#F8F4FF] hover:scale-105 active:scale-95 transition-all"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Hero / Invite code card */}
        <div className="glass-card p-5 mb-4 sj-animate-up relative overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 dark:bg-white/10 border border-white/60 dark:border-white/10">
              <span className={`w-2 h-2 rounded-full ${dotClass} animate-pulse`} />
              <span
                className="text-[11px] tracking-wide text-[#6E628A] dark:text-[#B0A2C9]"
                data-testid="dashboard-sync-status"
              >
                {syncStatus.text}
              </span>
            </div>
            <span
              className={`text-[10.5px] uppercase tracking-wider px-2.5 py-1 rounded-full font-medium ${
                isRoomActive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              }`}
              data-testid="dashboard-room-status"
            >
              {isRoomActive ? "● Aktif" : "○ Menunggu pasangan"}
            </span>
          </div>

          <h2 className="font-logo text-3xl sm:text-4xl font-bold sj-logo-gradient leading-none mb-1">
            {username}{" "}
            <span className="text-xl">{isRoomActive ? "❤️" : "💞"}</span>{" "}
            {partnerUsername || "..."}
          </h2>
          <p className="text-[12.5px] text-[#6E628A] dark:text-[#A295B8] leading-relaxed">
            Hubungan ini mungkin sederhana, tapi selalu berarti.
          </p>

          {/* Invite code mini card */}
          <div className="mt-4 flex items-center justify-between rounded-2xl px-4 py-3 bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10 gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-[#6E628A] dark:text-[#B0A2C9]">
                Invite Code
              </div>
              <div
                className="font-mono font-semibold text-[15px] text-[#2D2640] dark:text-[#F8F4FF] truncate"
                data-testid="dashboard-invite-code"
              >
                {inviteCode}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={copyInviteCode}
                aria-label="Copy invite code"
                data-testid="dashboard-copy-code"
                className="w-9 h-9 rounded-xl bg-white/55 dark:bg-white/10 border border-white/55 dark:border-white/10 flex items-center justify-center text-[#6E628A] dark:text-[#F8F4FF] hover:scale-105 active:scale-95 transition-all"
              >
                {copiedCode ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                type="button"
                onClick={shareInviteCode}
                aria-label="Share invite code"
                data-testid="dashboard-share-code"
                className="w-9 h-9 rounded-xl bg-white/55 dark:bg-white/10 border border-white/55 dark:border-white/10 flex items-center justify-center text-[#6E628A] dark:text-[#F8F4FF] hover:scale-105 active:scale-95 transition-all"
              >
                <Share2 size={14} />
              </button>
            </div>
          </div>

          {/* Partner card */}
          {isRoomActive ? (
            <div className="mt-3 flex items-center justify-between rounded-2xl px-4 py-3 bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10">
              <div className="min-w-0">
                <div
                  className="font-heading font-semibold text-[14px] text-[#2D2640] dark:text-[#F8F4FF] truncate"
                  data-testid="partner-name"
                >
                  {partnerUsername}
                </div>
                <div
                  className="text-[12px] text-[#6E628A] dark:text-[#A295B8] mt-0.5"
                  data-testid="partner-mood"
                >
                  {partnerMood}
                </div>
              </div>
              <div className="text-3xl" data-testid="partner-emoji">
                {partnerEmoji}
              </div>
            </div>
          ) : (
            <div
              className="mt-3 flex items-center gap-3 rounded-2xl px-4 py-3 bg-gradient-to-r from-amber-50 to-pink-50 dark:from-amber-900/20 dark:to-pink-900/20 border border-amber-200/60 dark:border-amber-700/30"
              data-testid="dashboard-waiting-card"
            >
              <UserPlus size={20} className="text-amber-600 dark:text-amber-300 flex-shrink-0" />
              <div className="text-[12.5px] text-[#3a2f4a] dark:text-[#E7DEF7] leading-snug">
                Menunggu pasangan join. Bagikan invite code di atas 💞
              </div>
            </div>
          )}
        </div>

        {/* Mood */}
        <div className="glass-card p-5 mb-4 sj-animate-up">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-heading font-semibold text-[16px] text-[#2D2640] dark:text-[#F8F4FF]">
              💗 Mood Hari Ini
            </h3>
            <span className="text-[11px] text-[#6E628A] dark:text-[#A295B8]">shared realtime</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {MOODS.map((m) => {
              const active = myMood === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMood(m.key)}
                  data-testid={`mood-${m.label}`}
                  className={`flex flex-col items-center gap-1 py-3 rounded-2xl transition-all ${
                    active
                      ? "sj-mood-active text-white shadow-lg scale-105"
                      : "bg-white/55 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 text-[#2D2640] dark:text-[#F8F4FF]"
                  }`}
                >
                  <span className="text-xl">{m.emoji}</span>
                  <span
                    className={`text-[10px] ${
                      active ? "text-white/90" : "text-[#6E628A] dark:text-[#A295B8]"
                    }`}
                  >
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Partner activity */}
        <div className="glass-card p-5 mb-4 sj-animate-up">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-heading font-semibold text-[16px] text-[#2D2640] dark:text-[#F8F4FF]">
              👀 Aktivitas Terbaru
            </h3>
            <span className="text-[11px] text-[#6E628A] dark:text-[#A295B8]">live</span>
          </div>
          <div
            data-testid="partner-activity"
            className="text-[13.5px] text-[#3a2f4a] dark:text-[#E7DEF7] leading-relaxed rounded-2xl px-4 py-3 bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10"
          >
            {state.partner_activity || "Belum ada aktivitas 💞"}
          </div>
        </div>

        {/* Gallery access */}
        <button
          type="button"
          onClick={() => navigate("/gallery")}
          data-testid="dashboard-gallery-card"
          className="w-full glass-card p-5 mb-4 sj-animate-up text-left hover:scale-[1.01] active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FFD6E2] to-[#E0CCFF] dark:from-[#3a2347] dark:to-[#2a1838] flex items-center justify-center">
              <Images size={26} className="text-[#E284BC]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-semibold text-[16px] text-[#2D2640] dark:text-[#F8F4FF]">
                📸 Galeri Memori
              </h3>
              <p className="text-[12.5px] text-[#6E628A] dark:text-[#A295B8] mt-0.5">
                {photoCount > 0
                  ? `${photoCount} foto tersimpan 💖`
                  : "Mulai simpan momen pertama kalian"}
              </p>
            </div>
            <span className="text-[#E284BC] text-xl flex-shrink-0">→</span>
          </div>
        </button>

        {/* Anniversary */}
        <div className="glass-card p-5 mb-4 sj-animate-up">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-heading font-semibold text-[16px] text-[#2D2640] dark:text-[#F8F4FF]">
              <Calendar size={16} className="inline -mt-1 mr-1 text-[#E284BC]" /> Anniversary
            </h3>
            <span className="text-[11px] text-[#6E628A] dark:text-[#A295B8]"> {formatAnniversaryDate(room?.anniversary_date)}</span>
          </div>
          <div
            className="font-logo text-[38px] sm:text-[44px] sj-logo-gradient font-bold leading-none mt-2"
            data-testid="anniversary-countdown"
          >
            {countdown}
          </div>
          <p className="text-[12px] text-[#6E628A] dark:text-[#A295B8] mt-2">
            Setiap hari kecil tetap berarti 💞
          </p>
        </div>

        {/* Daily question */}
        <div className="glass-card p-5 mb-4 sj-animate-up">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-heading font-semibold text-[16px] text-[#2D2640] dark:text-[#F8F4FF]">
              <MessageCircleHeart size={16} className="inline -mt-1 mr-1 text-[#E284BC]" /> Daily
              Question
            </h3>
            <span className="text-[11px] text-[#6E628A] dark:text-[#A295B8]">hari ini</span>
          </div>
          <p
            className="text-[16px] leading-relaxed text-[#3a2f4a] dark:text-[#E7DEF7] font-medium my-3"
            data-testid="daily-question"
          >
            {question}
          </p>
          <button
            type="button"
            data-testid="new-question-btn"
            onClick={() => setQuestion(QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)])}
            className="sj-btn-soft"
          >
            <RefreshCw size={14} className="mr-1.5" /> Pertanyaan baru
          </button>
        </div>

        {/* Shared notes */}
        <div className="glass-card p-5 mb-4 sj-animate-up">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-heading font-semibold text-[16px] text-[#2D2640] dark:text-[#F8F4FF]">
              <StickyNote size={16} className="inline -mt-1 mr-1 text-[#E284BC]" /> Shared Notes
            </h3>
            <span className="text-[11px] text-[#6E628A] dark:text-[#A295B8]">auto sync</span>
          </div>
          <textarea
            value={notesValue}
            onChange={onNotes}
            placeholder="tulis sesuatu untuk dia..."
            data-testid="shared-notes-textarea"
            className="sj-input min-h-[120px] resize-none leading-relaxed"
          />
        </div>

        {/* Streak */}
        <div className="glass-card p-5 mb-4 sj-animate-up">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-heading font-semibold text-[16px] text-[#2D2640] dark:text-[#F8F4FF]">
              <Flame size={16} className="inline -mt-1 mr-1 text-[#FF8FB9]" /> Relationship Streak
            </h3>
            <span className="text-[11px] text-[#6E628A] dark:text-[#A295B8]">shared progress</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div
                className="font-logo text-[52px] font-bold leading-none sj-logo-gradient"
                data-testid="streak-number"
              >
                {Number(state.streak || 0)}
              </div>
              <div className="text-[12px] text-[#6E628A] dark:text-[#A295B8] mt-1">hari bersama</div>
            </div>
            <button
              type="button"
              onClick={checkin}
              data-testid="checkin-btn"
              className="sj-cta px-5 py-3"
            >
              <span className="font-semibold">Check-in</span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="glass-card p-5 mb-4 sj-animate-up">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-heading font-semibold text-[16px] text-[#2D2640] dark:text-[#F8F4FF]">
              📅 Shared Plans
            </h3>
            <span className="text-[11px] text-[#6E628A] dark:text-[#A295B8]">mini calendar</span>
          </div>
          <input
            type="text"
            value={planInput}
            onChange={(e) => setPlanInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPlan()}
            placeholder="contoh: date night minggu ini 💖"
            data-testid="plan-input"
            className="sj-input"
          />
          <button
            type="button"
            onClick={addPlan}
            data-testid="add-plan-btn"
            className="sj-cta w-full mt-3 justify-center"
          >
            <span className="font-semibold">Tambah</span>
          </button>
          <div className="mt-3 space-y-2" data-testid="plans-list">
            {Array.isArray(state.plans) && state.plans.length > 0 ? (
              state.plans.map((p, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-2 rounded-2xl px-4 py-3 bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10"
                >
                  <div className="text-[13px] text-[#2D2640] dark:text-[#F8F4FF] leading-relaxed">
                    💖 {p}
                  </div>
                  <button
                    type="button"
                    onClick={() => removePlan(i)}
                    aria-label="Remove plan"
                    data-testid={`remove-plan-${i}`}
                    className="text-[#FF8FB9] hover:text-rose-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-[12.5px] text-[#6E628A] dark:text-[#A295B8] rounded-2xl px-4 py-3 bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/10">
                Belum ada shared plan. Tambah date night atau reminder kecil kalian 💞
              </div>
            )}
          </div>
        </div>

        {/* Backup */}
        <div className="glass-card p-5 mb-6 sj-animate-up">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-heading font-semibold text-[16px] text-[#2D2640] dark:text-[#F8F4FF]">
              ☁️ Backup Data
            </h3>
            <span className="text-[11px] text-[#6E628A] dark:text-[#A295B8]">export / import</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={exportData}
              data-testid="export-btn"
              className="sj-btn-outline justify-center"
            >
              <Download size={15} className="mr-1.5" /> Export
            </button>
            <button
              type="button"
              onClick={importData}
              data-testid="import-btn"
              className="sj-btn-outline justify-center"
            >
              <UploadIcon size={15} className="mr-1.5" /> Import
            </button>
          </div>
          <input
            type="file"
            ref={fileImportRef}
            accept="application/json"
            onChange={onImportFile}
            className="hidden"
            data-testid="import-file-input"
          />
        </div>

        <div className="text-center text-[12px] text-[#8a7da3] dark:text-[#9F90BC] pb-6">
          Langgeng terus {username} 💖 {partnerUsername || "..."}
        </div>
      </div>
    </MobileContainer>
  );
};

export default Dashboard;
