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
      <path
        d="M11.5 3.8c5.8 0 9.2 3.1 9.2 6.7 0 2.7-2.1 5.2-5.8 5.7-.8.1-1.7.5-2.4 1.9l2-2.1c-3.2-.3-5.6-2.6-5.6-5.3 0-3.6 3.4-6.7 9.6-6.9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path d={sparkle(10.6, 10.3, 3.8, 3.2)} />
      <path d={sparkle(15.5, 7.2, 1.4, 1.35)} />
      <path d={sparkle(7.5, 12.3, 1.3, 1.25)} />
      <path d={sparkle(14.9, 13, 1.3, 1.25)} />
    </svg>
  );
}
