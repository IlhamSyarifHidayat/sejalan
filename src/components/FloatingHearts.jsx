import React, { useMemo } from "react";

/**
 * Soft floating heart particles. Pure CSS. Pointer-events none.
 */
const FloatingHearts = ({ count = 14, className = "" }) => {
  const hearts = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 12,
        duration: 10 + Math.random() * 14,
        size: 10 + Math.random() * 18,
        opacity: 0.35 + Math.random() * 0.55,
        drift: (Math.random() - 0.5) * 60,
      })),
    [count]
  );

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      data-testid="floating-hearts"
    >
      {hearts.map((h) => (
        <span
          key={h.id}
          className="sj-heart"
          style={{
            left: `${h.left}%`,
            animationDelay: `${h.delay}s`,
            animationDuration: `${h.duration}s`,
            fontSize: `${h.size}px`,
            opacity: h.opacity,
            "--drift": `${h.drift}px`,
          }}
        >
          ♥
        </span>
      ))}
    </div>
  );
};

export default FloatingHearts;
