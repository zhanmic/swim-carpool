interface AgentIconProps {
  className?: string;
}

/** Speech bubble with multiple AI sparkles inside (option 3, enhanced). */
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
      {/* center — largest */}
      <path d="M12 8.6 12.5 10.55 14.45 11.05 12.5 11.55 12 13.5 11.5 11.55 9.55 11.05 11.5 10.55 12 8.6Z" />
      {/* upper right */}
      <path d="M15.1 7 15.45 8.05 16.5 8.4 15.45 8.75 15.1 9.8 14.75 8.75 13.7 8.4 14.75 8.05 15.1 7Z" opacity="0.9" />
      {/* upper left */}
      <path d="M8.4 7.35 8.62 8.1 9.37 8.32 8.62 8.54 8.4 9.29 8.18 8.54 7.43 8.32 8.18 8.1 8.4 7.35Z" opacity="0.85" />
      {/* lower left */}
      <path d="M8.55 13.05 8.78 13.82 9.55 14.05 8.78 14.28 8.55 15.05 8.32 14.28 7.55 14.05 8.32 13.82 8.55 13.05Z" opacity="0.8" />
      {/* lower right */}
      <path d="M14.85 12.95 15.05 13.55 15.65 13.75 15.05 13.95 14.85 14.55 14.65 13.95 14.05 13.75 14.65 13.55 14.85 12.95Z" opacity="0.75" />
    </svg>
  );
}
