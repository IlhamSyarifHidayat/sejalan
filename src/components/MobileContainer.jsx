import React from "react";

const MobileContainer = ({ children, className = "" }) => {
  return (
    <div
      className={`relative mx-auto w-full max-w-[470px] min-h-screen overflow-x-hidden ${className}`}
      data-testid="mobile-container"
    >
      {children}
    </div>
  );
};

export default MobileContainer;
