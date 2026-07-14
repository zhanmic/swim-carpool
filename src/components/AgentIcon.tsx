interface AgentIconProps {
  className?: string;
  animated?: boolean;
}

function sparkle(cx: number, cy: number, hy: number, hx: number): string {
  const ix = hx * 0.38;
  const iy = hy * 0.38;
  return [
    `M${cx} ${cy - hy}`,
    `${cx + ix} ${cy - iy}`,
    `${cx + hx} ${cy}`,
    `${cx + ix} ${cy + iy}`,
    `${cx} ${cy + hy}`,
    `${cx - ix} ${cy + iy}`,
    `${cx - hx} ${cy}`,
    `${cx - ix} ${cy - iy}`,
    "Z",
  ].join(" ");
}

/** Rounded rectangle chat bubble with neon animated outline and sparkles inside. */
export function AgentIcon({ className = "h-6 w-6", animated = false }: AgentIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="ai-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      {animated && (
        <style>
          {`
            @keyframes sparkle-blink {
              0%, 100% { opacity: 1; filter: drop-shadow(0 0 1px #FFD700); }
              50% { opacity: 0.3; filter: drop-shadow(0 0 0px #FFD700); }
            }
            @keyframes neon-glow {
              0% { stroke: #3B82F6; filter: drop-shadow(0 0 2px #3B82F6); }
              25% { stroke: #8B5CF6; filter: drop-shadow(0 0 3px #8B5CF6); }
              50% { stroke: #EC4899; filter: drop-shadow(0 0 2px #EC4899); }
              75% { stroke: #8B5CF6; filter: drop-shadow(0 0 3px #8B5CF6); }
              100% { stroke: #3B82F6; filter: drop-shadow(0 0 2px #3B82F6); }
            }
            .sparkle-animate {
              animation: sparkle-blink 2.5s ease-in-out infinite;
            }
            .neon-animate {
              animation: neon-glow 4s ease-in-out infinite;
            }
          `}
        </style>
      )}
      <g
        fill="none"
        stroke={animated ? "#3B82F6" : "url(#ai-gradient)"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animated ? "neon-animate" : ""}
      >
        <rect x="2" y="3" width="20" height="15" rx="3" ry="3" />
        <path d="M8 18 L6 22 L10 19" />
      </g>
      <path d={sparkle(12, 10.5, 3.2, 3)} fill="#FFF700" stroke="#FFA500" strokeWidth="0.3" className={animated ? "sparkle-animate" : ""} />
      <path d={sparkle(16, 7.5, 1.4, 1.3)} fill="#FFF700" stroke="#FFA500" strokeWidth="0.2" className={animated ? "sparkle-animate" : ""} style={animated ? { animationDelay: "0.3s" } : undefined} />
      <path d={sparkle(8, 13, 1.4, 1.3)} fill="#FFF700" stroke="#FFA500" strokeWidth="0.2" className={animated ? "sparkle-animate" : ""} style={animated ? { animationDelay: "0.6s" } : undefined} />
      <path d={sparkle(16, 13.5, 1.4, 1.3)} fill="#FFF700" stroke="#FFA500" strokeWidth="0.2" className={animated ? "sparkle-animate" : ""} style={animated ? { animationDelay: "0.9s" } : undefined} />
    </svg>
  );
}
