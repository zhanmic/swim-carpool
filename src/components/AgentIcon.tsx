"use client";

import { useId } from "react";

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

/** Continuous outline (counterclockwise) so dash travel reads as clockwise with the tip leading. */
const OUTLINE_PATH =
  "M5 3 a3 3 0 0 0 -3 3 v9 a3 3 0 0 0 3 3 h3 L10 19 L6 22 L8 18 h11 a3 3 0 0 0 3 -3 v-9 a3 3 0 0 0 -3 -3 h-14 Z";

/** Rounded rectangle chat bubble with neon outline and a white-tip / dark-tail comet. */
export function AgentIcon({ className = "h-6 w-6", animated = false }: AgentIconProps) {
  const uid = useId().replace(/:/g, "");
  const fillGradId = `ai-fill-${uid}`;
  const sparkleBgId = `sparkle-bg-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={fillGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <radialGradient id={sparkleBgId} cx="50%" cy="50%">
          <stop offset="0%" stopColor="#1E3A8A" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.5" />
        </radialGradient>
      </defs>
      {animated && (
        <style>
          {`
            @keyframes sparkle-blink-${uid} {
              0%, 100% { opacity: 1; filter: drop-shadow(0 0 1px #FFD700); }
              50% { opacity: 0.3; filter: drop-shadow(0 0 0px #FFD700); }
            }
            @keyframes border-glow-${uid} {
              0%, 100% { stroke: #22D3EE; filter: drop-shadow(0 0 2px #22D3EE); }
              33% { stroke: #38BDF8; filter: drop-shadow(0 0 2.5px #38BDF8); }
              66% { stroke: #67E8F9; filter: drop-shadow(0 0 2px #67E8F9); }
            }
            /* Increasing offset: short white tip leads, longer dark dashes trail behind. */
            @keyframes dash-travel-${uid} {
              0% { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: 100; }
            }
            /* Darker shade cycle along the fading tail */
            @keyframes tail-shade-${uid} {
              0% { stroke: #334155; }
              25% { stroke: #1E293B; }
              50% { stroke: #0F172A; }
              75% { stroke: #1E293B; }
              100% { stroke: #334155; }
            }
            @keyframes mid-shade-${uid} {
              0% { stroke: #64748B; }
              25% { stroke: #475569; }
              50% { stroke: #334155; }
              75% { stroke: #475569; }
              100% { stroke: #64748B; }
            }
            .sparkle-animate-${uid} {
              animation: sparkle-blink-${uid} 2.5s ease-in-out infinite;
            }
            .border-animate-${uid} {
              animation: border-glow-${uid} 4s ease-in-out infinite;
            }
            .comet-tail-${uid} {
              stroke-dasharray: 22 78;
              stroke-opacity: 0.55;
              animation:
                dash-travel-${uid} 2.8s linear infinite,
                tail-shade-${uid} 2.8s linear infinite;
            }
            .comet-mid-${uid} {
              stroke-dasharray: 11 89;
              stroke-opacity: 0.75;
              animation:
                dash-travel-${uid} 2.8s linear infinite,
                mid-shade-${uid} 2.8s linear infinite;
            }
            .comet-near-${uid} {
              stroke-dasharray: 5 95;
              stroke: #94A3B8;
              stroke-opacity: 0.9;
              animation: dash-travel-${uid} 2.8s linear infinite;
            }
            .comet-head-${uid} {
              stroke-dasharray: 2.2 97.8;
              stroke: #FFFFFF;
              animation: dash-travel-${uid} 2.8s linear infinite;
            }
          `}
        </style>
      )}
      <rect x="2" y="3" width="20" height="15" rx="3" ry="3" fill={`url(#${sparkleBgId})`} />
      <g
        fill="none"
        stroke={animated ? "#22D3EE" : `url(#${fillGradId})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animated ? `border-animate-${uid}` : ""}
      >
        <rect x="2" y="3" width="20" height="15" rx="3" ry="3" />
        <path d="M8 18 L6 22 L10 19" />
      </g>
      {animated && (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Long dark fading tail (behind the tip) */}
          <path
            d={OUTLINE_PATH}
            pathLength={100}
            strokeWidth="2.8"
            className={`comet-tail-${uid}`}
            style={{ filter: "drop-shadow(0 0 1.5px #1E293B)" }}
          />
          {/* Mid slate trail */}
          <path
            d={OUTLINE_PATH}
            pathLength={100}
            strokeWidth="2.2"
            className={`comet-mid-${uid}`}
            style={{ filter: "drop-shadow(0 0 1.5px #475569)" }}
          />
          {/* Near-head light grey bridge into the white tip */}
          <path
            d={OUTLINE_PATH}
            pathLength={100}
            strokeWidth="2"
            className={`comet-near-${uid}`}
            style={{ filter: "drop-shadow(0 0 1.5px #94A3B8)" }}
          />
          {/* Bright white leading tip */}
          <path
            d={OUTLINE_PATH}
            pathLength={100}
            strokeWidth="2.6"
            className={`comet-head-${uid}`}
            style={{ filter: "drop-shadow(0 0 3px #FFFFFF)" }}
          />
        </g>
      )}
      <path
        d={sparkle(12, 10.5, 3.2, 3)}
        fill="#FFF700"
        stroke="#FFA500"
        strokeWidth="0.3"
        className={animated ? `sparkle-animate-${uid}` : ""}
      />
      <path
        d={sparkle(16, 7.5, 1.4, 1.3)}
        fill="#FFF700"
        stroke="#FFA500"
        strokeWidth="0.2"
        className={animated ? `sparkle-animate-${uid}` : ""}
        style={animated ? { animationDelay: "0.3s" } : undefined}
      />
      <path
        d={sparkle(8, 13, 1.4, 1.3)}
        fill="#FFF700"
        stroke="#FFA500"
        strokeWidth="0.2"
        className={animated ? `sparkle-animate-${uid}` : ""}
        style={animated ? { animationDelay: "0.6s" } : undefined}
      />
      <path
        d={sparkle(16, 13.5, 1.4, 1.3)}
        fill="#FFF700"
        stroke="#FFA500"
        strokeWidth="0.2"
        className={animated ? `sparkle-animate-${uid}` : ""}
        style={animated ? { animationDelay: "0.9s" } : undefined}
      />
    </svg>
  );
}
