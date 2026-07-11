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
      <path d="M17.2 3.6 17.45 4.55 18.4 4.8 17.45 5.05 17.2 5.9 16.95 5.05 16 4.8 16.95 4.55 17.2 3.6Z" />
      <path d="M18 15.3 18.22 16.1 19 16.32 18.22 16.54 18 17.3 17.78 16.54 17 16.32 17.78 16.1 18 15.3Z" />
    </svg>
  );
}
