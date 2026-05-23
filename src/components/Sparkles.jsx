import React, { useMemo } from "react";

const Sparkles = ({ count = 18, className = "" }) => {
  const dots = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        delay: Math.random() * 6,
        duration: 2.5 + Math.random() * 3.5,
        size: 2 + Math.random() * 3,
      })),
    [count]
  );
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      data-testid="sparkles"
    >
      {dots.map((d) => (
        <span
          key={d.id}
          className="sj-sparkle"
          style={{
            top: `${d.top}%`,
            left: `${d.left}%`,
            width: `${d.size}px`,
            height: `${d.size}px`,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

export default Sparkles;
