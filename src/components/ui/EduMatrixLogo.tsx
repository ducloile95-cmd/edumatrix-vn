import React from "react";

interface EduMatrixLogoProps {
  className?: string;
  variant?: "full" | "icon-only" | "light";
  size?: "sm" | "md" | "lg" | "xl";
}

export const EduMatrixLogo: React.FC<EduMatrixLogoProps> = ({
  className = "",
  variant = "full",
  size = "md",
}) => {
  const sizeClasses = {
    sm: "h-7",
    md: "h-9",
    lg: "h-12",
    xl: "h-16",
  };

  const isLight = variant === "light";
  const primaryColor = isLight ? "#FFFFFF" : "#0F2942";
  const secondaryColor = isLight ? "#FF6B6B" : "#E54B4B";

  return (
    <div className={`inline-flex items-center gap-3 select-none ${sizeClasses[size]} ${className}`}>
      {/* SVG Icon: Isometric Cube with Circuit Nodes */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto aspect-square flex-shrink-0"
      >
        {/* Isometric Cube Outer Outline */}
        <path
          d="M50 15 L82 32 L82 68 L50 85 L18 68 L18 32 Z"
          stroke={primaryColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Inner Top Facet Line */}
        <path
          d="M50 15 L50 50 L82 32"
          stroke={primaryColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Inner Bottom Split Line */}
        <path
          d="M50 50 L18 32"
          stroke={primaryColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 3 Circuit Nodes on Left */}
        {/* Top Node */}
        <path
          d="M18 36 L10 36 M10 36"
          stroke={primaryColor}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="8" cy="36" r="3.5" fill={primaryColor} />

        {/* Middle Node */}
        <path
          d="M18 50 L6 50 M6 50"
          stroke={primaryColor}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="5" cy="50" r="3.5" fill={secondaryColor} />

        {/* Bottom Node */}
        <path
          d="M18 64 L10 64 M10 64"
          stroke={primaryColor}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="8" cy="64" r="3.5" fill={primaryColor} />
      </svg>

      {/* Brand Typography */}
      {variant !== "icon-only" && (
        <div className="flex flex-col justify-center leading-none">
          <span
            className="font-bold tracking-tight text-xl font-sans"
            style={{ color: primaryColor }}
          >
            EduMatrix
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="h-[1px] w-4"
              style={{ backgroundColor: isLight ? "rgba(255,255,255,0.4)" : "#0F2942" }}
            />
            <span
              className="font-bold tracking-widest text-[11px] font-sans"
              style={{ color: secondaryColor }}
            >
              V N
            </span>
            <span
              className="h-[1px] w-4"
              style={{ backgroundColor: isLight ? "rgba(255,255,255,0.4)" : "#0F2942" }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
