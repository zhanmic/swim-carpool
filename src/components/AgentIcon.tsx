interface AgentIconProps {
  className?: string;
}

/** Three-star generative-AI sparkle (main star + two accents). */
export function AgentIcon({ className = "h-5 w-5" }: AgentIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M8.5 5.5 9.6 10.2 14.3 11.3 9.6 12.4 8.5 17.1 7.4 12.4 2.7 11.3 7.4 10.2 8.5 5.5Z" />
      <path d="M17.8 2.8 18.35 5.1 20.65 5.65 18.35 6.2 17.8 8.5 17.25 6.2 14.95 5.65 17.25 5.1 17.8 2.8Z" />
      <path d="M19.2 14.2 19.6 16.1 21.5 16.5 19.6 16.9 19.2 18.8 18.8 16.9 16.9 16.5 18.8 16.1 19.2 14.2Z" />
    </svg>
  );
}
