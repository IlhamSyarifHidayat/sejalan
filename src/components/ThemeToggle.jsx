import React from "react";
import { useSejalan } from "../context/SejalanContext";
import { Sun, Moon } from "lucide-react";

const ThemeToggle = ({ size = "md", testId = "theme-toggle" }) => {
  const { dark, toggleDark } = useSejalan();
  const dim = size === "sm" ? "w-10 h-10" : "w-12 h-12";
  return (
    <button
      type="button"
      onClick={toggleDark}
      data-testid={testId}
      aria-label="Toggle theme"
      className={`${dim} rounded-2xl glass-soft flex items-center justify-center text-[#6E628A] dark:text-[#F8F4FF] hover:scale-105 active:scale-95 transition-all`}
    >
      {dark ? <Sun size={18} strokeWidth={2.2} /> : <Moon size={18} strokeWidth={2.2} />}
    </button>
  );
};

export default ThemeToggle;
