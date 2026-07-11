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
        <ellipse cx="12" cy="10" rx="8.25" ry="6.25" />
        <path d="M7.6 15.4 5.2 18.6 9.4 16.1" />
      </g>
      <path d={sparkle(11.5, 10, 3.1, 2.7)} />
      <path d={sparkle(15.1, 7.6, 1.2, 1.15)} />
      <path d={sparkle(8.4, 12.1, 1.1, 1.05)} />
      <path d={sparkle(14.6, 12.4, 1.1, 1.05)} />
    </svg>
  );
}
