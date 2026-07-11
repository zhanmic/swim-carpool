interface AgentIconProps {
  className?: string;
}

/** Speech bubble with two AI sparkles inside (option 3). */
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
        d="M12 2.5a8.5 8.5 0 0 0-8.5 8.5c0 1.5.4 2.9 1.1 4.1L3.5 20.5l5.4-1.05A8.5 8.5 0 1 0 12 2.5Zm0 2a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M11.2 8.2 11.7 10.4 13.9 10.9 11.7 11.4 11.2 13.6 10.7 11.4 8.5 10.9 10.7 10.4 11.2 8.2Z" />
      <path d="M14.8 7.1 15.1 8.2 16.2 8.5 15.1 8.8 14.8 9.9 14.5 8.8 13.4 8.5 14.5 8.2 14.8 7.1Z" />
    </svg>
  );
}
