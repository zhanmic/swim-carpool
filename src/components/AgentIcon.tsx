interface AgentIconProps {
  className?: string;
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

/** Oval chat bubble with one large sparkle and three smaller sparkles inside. */
export function AgentIcon({ className = "h-5 w-5" }: AgentIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <ellipse cx="12" cy="9.6" rx="9.35" ry="7.1" />
        <path d="M6.9 16 4.1 19.5 8.8 16.6" />
      </g>
      <path d={sparkle(11.5, 9.6, 3.2, 2.8)} />
      <path d={sparkle(15.4, 7.2, 1.25, 1.2)} />
      <path d={sparkle(8.1, 11.8, 1.15, 1.1)} />
      <path d={sparkle(14.9, 12.2, 1.15, 1.1)} />
    </svg>
  );
}
