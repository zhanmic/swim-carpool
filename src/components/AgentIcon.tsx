interface AgentIconProps {
  className?: string;
}

/** Large symmetric sparkle left, two smaller sparkles on the right. */
export function AgentIcon({ className = "h-5 w-5" }: AgentIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      {/* center (6.5, 12); top/bottom ±9.5, left/right ±6, inner points mirrored */}
      <path d="M6.5 2.5 8.8 8.4 12.5 12 8.8 15.6 6.5 21.5 4.2 15.6 0.5 12 4.2 8.4 6.5 2.5Z" />
      <path d="M17.2 3.1 17.95 4.28 19.25 5 17.95 5.72 17.2 6.9 16.45 5.72 15.15 5 16.45 4.28 17.2 3.1Z" />
      <path d="M18 14.75 18.65 15.77 19.75 16.4 18.65 17.03 18 18.05 17.35 17.03 16.25 16.4 17.35 15.77 18 14.75Z" />
    </svg>
  );
}
