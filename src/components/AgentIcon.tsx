interface AgentIconProps {
  className?: string;
}

/** Large sparkle left, two smaller sparkles on the right. */
export function AgentIcon({ className = "h-5 w-5" }: AgentIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M6.8 2.2 8.35 7.8 13.9 9.35 8.35 10.9 6.8 21.8 5.25 10.9 0.7 9.35 5.25 7.8 6.8 2.2Z" />
      <path d="M17.2 3 17.55 4.35 18.9 4.7 17.55 5.05 17.2 6.4 16.85 5.05 15.5 4.7 16.85 4.35 17.2 3Z" />
      <path d="M18 15.1 18.3 16.15 19.35 16.45 18.3 16.75 18 17.8 17.7 16.75 16.65 16.45 17.7 16.15 18 15.1Z" />
    </svg>
  );
}
