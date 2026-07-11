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
export function AgentIcon({ className = "h-6 w-6" }: AgentIconProps) {
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
        <ellipse cx="12" cy="9.75" rx="10.55" ry="8.35" />
        <path d="M7.1 17.2 3.6 20.8 9.1 17.6" />
      </g>
      <path d={sparkle(11.5, 9.75, 3.55, 3.1)} />
      <path d={sparkle(15.8, 7.1, 1.35, 1.3)} />
      <path d={sparkle(7.6, 12.1, 1.25, 1.2)} />
      <path d={sparkle(15.3, 12.5, 1.25, 1.2)} />
    </svg>
  );
}
