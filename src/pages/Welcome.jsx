import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileContainer from "../components/MobileContainer";
import FloatingHearts from "../components/FloatingHearts";
import Sparkles from "../components/Sparkles";
import { Shield, Lock, CloudIcon, Heart, ArrowRight } from "lucide-react";

const HERO_IMG =
  "https://customer-assets.emergentagent.com/job_251be368-c987-4946-8cfb-bb030166bb99/artifacts/8us5yzo9_Desain%20Ui%20Halaman%20Awal.png";

const FeatureCard = ({ icon, title, desc, testId }) => (
  <div
    data-testid={testId}
    className="rounded-3xl px-3 py-4 sm:px-4 sm:py-5 text-center glass-feature flex flex-col items-center"
  >
    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#FFD6E2] to-[#E0CCFF] dark:from-[#3a2347] dark:to-[#2a1838] flex items-center justify-center shadow-inner mb-2.5">
      {icon}
    </div>
    <div className="font-heading font-semibold text-sm text-[#2D2640] dark:text-[#F8F4FF]">
      {title}
    </div>
    <div className="text-[10.5px] sm:text-[11px] leading-snug text-[#6E628A] dark:text-[#A295B8] mt-1">
      {desc}
    </div>
  </div>
);

const Welcome = () => {
  const navigate = useNavigate();
  const [imgReady, setImgReady] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  const timeText = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <MobileContainer className="pb-10">
      {/* Soft ambient background */}
      <div className="absolute inset-0 -z-10 sj-welcome-bg" aria-hidden="true" />
      <FloatingHearts count={16} className="z-0" />
      <Sparkles count={22} className="z-0" />

      <div className="relative z-10 flex flex-col items-center px-5 pt-8">
        {/* Top mini status */}
        <div
          className="text-[12.5px] tracking-[0.18em] font-medium text-[#6E628A] dark:text-[#B0A2C9] uppercase mb-2"
          data-testid="welcome-time"
        >
          {timeText}
        </div>

        {/* Logo */}
        <h1
          className="font-logo text-[64px] sm:text-[76px] leading-[0.9] font-bold tracking-tight text-center sj-logo-gradient"
          data-testid="welcome-logo"
        >
          Sejalan
          <span className="inline-block ml-1 align-middle">
            <svg
              width="42"
              height="42"
              viewBox="0 0 24 24"
              fill="none"
              className="inline-block -translate-y-3"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FF8FB9" />
                  <stop offset="100%" stopColor="#B892FF" />
                </linearGradient>
              </defs>
              <path
                d="M12 21s-7-4.35-9.5-9C.42 7.62 3.5 3 7.5 3c2 0 3.4 1.18 4.5 2.8C13.1 4.18 14.5 3 16.5 3 20.5 3 23.58 7.62 21.5 12c-2.5 4.65-9.5 9-9.5 9z"
                fill="url(#hg)"
              />
            </svg>
          </span>
        </h1>

        {/* Tagline */}
        <p className="font-body text-center text-[14.5px] leading-relaxed text-[#3a2f4a] dark:text-[#E7DEF7] max-w-[340px] mt-3 mb-4">
          Ruang privat untuk menyimpan semua kenangan, momen, dan cerita{" "}
          <span className="font-semibold sj-text-gradient">kita berdua.</span>
          <span className="inline-block ml-1">💖</span>
        </p>

        {/* Sparkle divider */}
        <div className="flex items-center gap-2 mb-2 opacity-80">
          <span className="text-[#E284BC] text-sm">✦</span>
          <span className="text-[#B892FF] text-xs">✧</span>
          <span className="text-[#E284BC] text-sm">✦</span>
        </div>

        {/* Hero illustration - zoomed crop on couple + sunset */}
        <div
          className="w-full mt-2 rounded-[36px] overflow-hidden relative aspect-[3/2] sj-hero-frame"
          data-testid="welcome-hero"
        >
          {!imgReady && (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-[#fcd9e9] to-[#e6d4ff] dark:from-[#2a1c40] dark:to-[#1a1129]" />
          )}
          <img
            src={HERO_IMG}
            alt="Couple watching sunset"
            onLoad={() => setImgReady(true)}
            className="w-full h-full object-cover transition-opacity duration-700"
            style={{
              opacity: imgReady ? 1 : 0,
              objectPosition: "center 56%",
            }}
            loading="eager"
          />
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-4 gap-2 w-full mt-5" data-testid="welcome-features">
          <FeatureCard
            testId="feature-privat"
            icon={<Shield size={20} className="text-[#E284BC]" strokeWidth={2.2} />}
            title="Privat"
            desc="Hanya kamu & pasangan"
          />
          <FeatureCard
            testId="feature-aman"
            icon={<Lock size={20} className="text-[#E284BC]" strokeWidth={2.2} />}
            title="Aman"
            desc="Kenangan terlindungi"
          />
          <FeatureCard
            testId="feature-tersimpan"
            icon={<CloudIcon size={20} className="text-[#E284BC]" strokeWidth={2.2} />}
            title="Tersimpan"
            desc="Akses kapan pun"
          />
          <FeatureCard
            testId="feature-bersama"
            icon={<Heart size={20} className="text-[#E284BC] fill-[#FFB6CF]" strokeWidth={2.2} />}
            title="Bersama"
            desc="Setiap hari"
          />
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={() => navigate("/auth")}
          data-testid="welcome-enter-btn"
          className="sj-cta mt-6 group"
        >
          <span className="text-white font-semibold tracking-wide">Masuk ke Sejalan</span>
          <span className="ml-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/25 group-hover:translate-x-1 transition-transform">
            <ArrowRight size={16} className="text-white" />
          </span>
        </button>

        {/* dots indicator */}
        <div className="flex items-center gap-1.5 mt-5">
          <span className="w-6 h-1.5 rounded-full bg-gradient-to-r from-[#FF8FB9] to-[#B892FF]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#6E628A]/30" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#6E628A]/30" />
        </div>

        <div className="text-[11px] text-[#8a7da3] dark:text-[#9F90BC] mt-4 mb-2 tracking-wide">
          made with 💖 for ilham × lisna
        </div>
      </div>
    </MobileContainer>
  );
};

export default Welcome;
