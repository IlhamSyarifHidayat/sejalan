import React, { useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Copy, Share2, Check, KeyRound, UserRound, Sparkles as SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import MobileContainer from "../components/MobileContainer";
import FloatingHearts from "../components/FloatingHearts";
import ThemeToggle from "../components/ThemeToggle";
import { useSejalan } from "../context/SejalanContext";

const Auth = () => {
  const navigate = useNavigate();
  const { inRoom, createRoom, joinRoom, syncStatus } = useSejalan();
  const [tab, setTab] = useState("join"); // 'join' | 'create'
  const [username, setUsername] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [createdRoom, setCreatedRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (inRoom && !createdRoom) return <Navigate to="/dashboard" replace />;

  const submitJoin = async (e) => {
    e?.preventDefault?.();
    if (loading) return;
    setLoading(true);
    try {
      await joinRoom(username, inviteCode);
      toast.success("Berhasil bergabung 💖", { description: "Selamat datang di room kalian" });
      navigate("/dashboard");
    } catch (err) {
      const msg =
        err?.message === "invalid_invite_code"
          ? "Invite code tidak ditemukan 💔"
          : err?.message || "Gagal join room";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const submitCreate = async (e) => {
    e?.preventDefault?.();
    if (loading) return;
    setLoading(true);
    try {
      const r = await createRoom(username);
      setCreatedRoom(r);
      toast.success("Room dibuat 💖", { description: "Bagikan invite code ke pasanganmu" });
    } catch (err) {
      toast.error(err?.message || "Gagal bikin room");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!createdRoom?.invite_code) return;
    try {
      await navigator.clipboard.writeText(createdRoom.invite_code);
      setCopied(true);
      toast.success("Code disalin");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal copy code");
    }
  };

  const shareCode = async () => {
    if (!createdRoom?.invite_code) return;
    const text = `Yuk masuk ke Sejalan kita 💖\n\nInvite code: ${createdRoom.invite_code}\nLink: ${window.location.origin}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Sejalan 💖", text });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Pesan disalin, paste ke chat pasanganmu 💖");
    } catch {
      toast.error("Tidak bisa share");
    }
  };

  const dotClass =
    syncStatus.type === "ok"
      ? "bg-emerald-400"
      : syncStatus.type === "err"
      ? "bg-rose-400"
      : "bg-amber-400";

  return (
    <MobileContainer className="pb-10">
      <div className="absolute inset-0 -z-10 sj-welcome-bg" aria-hidden="true" />
      <FloatingHearts count={10} />

      <div className="relative z-10 flex flex-col min-h-screen px-5 pt-6">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            data-testid="auth-back-btn"
            className="w-10 h-10 rounded-2xl glass-soft flex items-center justify-center text-[#6E628A] dark:text-[#F8F4FF] hover:scale-105 active:scale-95 transition-all"
          >
            <ArrowLeft size={18} />
          </Link>
          <ThemeToggle size="sm" testId="auth-theme-toggle" />
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="glass-card p-7 sj-animate-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 dark:bg-white/10 border border-white/60 dark:border-white/10 mb-4">
              <span className={`w-2 h-2 rounded-full ${dotClass}`} />
              <span
                className="text-[11px] tracking-wide text-[#6E628A] dark:text-[#B0A2C9]"
                data-testid="auth-sync-status"
              >
                {syncStatus.text}
              </span>
            </div>

            <h1 className="font-logo text-5xl sm:text-6xl font-bold sj-logo-gradient leading-none mb-2">
              Sejalan
            </h1>
            <p className="font-body text-[13.5px] leading-relaxed text-[#3a2f4a] dark:text-[#E7DEF7] mb-5">
              Ruang privat untuk berdua 💖
            </p>

            {!createdRoom && (
              <>
                {/* Tabs */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 mb-5">
                  <button
                    type="button"
                    onClick={() => setTab("join")}
                    data-testid="auth-tab-join"
                    className={`py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                      tab === "join"
                        ? "bg-white dark:bg-white/15 text-[#2D2640] dark:text-[#F8F4FF] shadow-sm"
                        : "text-[#6E628A] dark:text-[#A295B8]"
                    }`}
                  >
                    Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("create")}
                    data-testid="auth-tab-create"
                    className={`py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                      tab === "create"
                        ? "bg-white dark:bg-white/15 text-[#2D2640] dark:text-[#F8F4FF] shadow-sm"
                        : "text-[#6E628A] dark:text-[#A295B8]"
                    }`}
                  >
                    Buat Room
                  </button>
                </div>

                {tab === "join" ? (
                  <form onSubmit={submitJoin}>
                    <label className="block text-[11.5px] font-semibold uppercase tracking-wider text-[#6E628A] dark:text-[#B0A2C9] mb-1.5">
                      Username
                    </label>
                    <div className="relative mb-3">
                      <UserRound
                        size={17}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E284BC]"
                      />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="namamu di room ini"
                        maxLength={20}
                        autoComplete="off"
                        data-testid="auth-username-input"
                        className="sj-input pl-11"
                      />
                    </div>

                    <label className="block text-[11.5px] font-semibold uppercase tracking-wider text-[#6E628A] dark:text-[#B0A2C9] mb-1.5">
                      Invite Code
                    </label>
                    <div className="relative">
                      <KeyRound
                        size={17}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E284BC]"
                      />
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        placeholder="SEJ-XXXXX"
                        maxLength={12}
                        autoComplete="off"
                        spellCheck="false"
                        data-testid="auth-invite-input"
                        className="sj-input pl-11 font-mono tracking-wider"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      data-testid="auth-join-submit"
                      className="sj-cta w-full mt-5 justify-center disabled:opacity-60"
                    >
                      <span className="font-semibold">
                        {loading ? "Memproses..." : "Masuk ke Sejalan 💖"}
                      </span>
                    </button>
                  </form>
                ) : (
                  <form onSubmit={submitCreate}>
                    <label className="block text-[11.5px] font-semibold uppercase tracking-wider text-[#6E628A] dark:text-[#B0A2C9] mb-1.5">
                      Username
                    </label>
                    <div className="relative">
                      <UserRound
                        size={17}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E284BC]"
                      />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="namamu di room ini"
                        maxLength={20}
                        autoComplete="off"
                        data-testid="auth-create-username-input"
                        className="sj-input pl-11"
                      />
                    </div>
                    <p className="text-[11.5px] text-[#8a7da3] dark:text-[#A295B8] mt-3 leading-relaxed">
                      Setelah room dibuat, kamu dapat <strong>kode invite</strong> (SEJ-XXXXX) yang
                      bisa kamu kirim ke pasangan supaya dia bisa join.
                    </p>

                    <button
                      type="submit"
                      disabled={loading}
                      data-testid="auth-create-submit"
                      className="sj-cta w-full mt-5 justify-center disabled:opacity-60"
                    >
                      <span className="font-semibold">
                        {loading ? "Membuat room..." : "Buat Room Sejalan 💖"}
                      </span>
                    </button>
                  </form>
                )}
              </>
            )}

            {createdRoom && (
              <div data-testid="auth-room-created" className="sj-animate-up">
                <div className="flex items-center gap-2 mb-3">
                  <SparklesIcon size={16} className="text-[#E284BC]" />
                  <p className="text-[14px] text-[#3a2f4a] dark:text-[#E7DEF7] font-medium">
                    Room kamu sudah dibuat 💖
                  </p>
                </div>
                <div className="rounded-3xl bg-gradient-to-br from-[#FFD6E2] to-[#E0CCFF] dark:from-[#3a2347] dark:to-[#2a1838] p-5 text-center mb-4 border border-white/60 dark:border-white/10">
                  <div className="text-[10.5px] uppercase tracking-[0.18em] text-[#6E628A] dark:text-[#B0A2C9] mb-1.5">
                    Kode Invite
                  </div>
                  <div
                    className="font-logo text-[36px] sm:text-[42px] font-bold sj-logo-gradient leading-none break-all"
                    data-testid="auth-created-code"
                  >
                    {createdRoom.invite_code}
                  </div>
                  <div className="text-[11px] text-[#8a7da3] dark:text-[#A295B8] mt-3">
                    Bagikan ke pasanganmu untuk join 💞
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={copyCode}
                    data-testid="auth-copy-btn"
                    className="sj-btn-outline justify-center"
                  >
                    {copied ? (
                      <>
                        <Check size={15} className="mr-1.5" /> Tersalin
                      </>
                    ) : (
                      <>
                        <Copy size={15} className="mr-1.5" /> Copy
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={shareCode}
                    data-testid="auth-share-btn"
                    className="sj-btn-outline justify-center"
                  >
                    <Share2 size={15} className="mr-1.5" /> Share
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  data-testid="auth-enter-dashboard"
                  className="sj-cta w-full mt-4 justify-center"
                >
                  <span className="font-semibold">Lanjut ke Dashboard →</span>
                </button>
                <p className="text-center text-[11.5px] text-[#8a7da3] dark:text-[#A295B8] mt-4">
                  status:{" "}
                  <span className="font-medium">
                    {createdRoom.status === "active" ? "Aktif" : "Menunggu pasangan"}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MobileContainer>
  );
};

export default Auth;
