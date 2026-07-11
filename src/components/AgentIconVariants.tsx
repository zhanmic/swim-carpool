/** Agent entry-point icon options — pick one, then promote to AgentIcon.tsx */

import type { ComponentType, ReactNode } from "react";

export type AgentIconVariantId =
  | "sparkle-classic"
  | "bubble-chat"
  | "bubble-sparkle"
  | "sparkle-in-bubble"
  | "bubble-sparkle-badge"
  | "robot-face"
  | "robot-bubble"
  | "robot-sparkle"
  | "ai-monogram"
  | "wand-sparkle";

export const AGENT_ICON_VARIANTS: {
  id: AgentIconVariantId;
  label: string;
  description: string;
}[] = [
  { id: "sparkle-classic", label: "Sparkle", description: "Current — generic generative AI" },
  { id: "bubble-chat", label: "Chat", description: "Speech bubble only — help / ask" },
  { id: "bubble-sparkle", label: "Chat + sparkle", description: "Bubble with sparkle inside" },
  { id: "sparkle-in-bubble", label: "Sparkle bubble", description: "Sparkle as the message" },
  { id: "bubble-sparkle-badge", label: "Badge", description: "Chat with sparkle notification dot" },
  { id: "robot-face", label: "Robot", description: "Friendly bot face" },
  { id: "robot-bubble", label: "Robot chat", description: "Bot inside speech bubble" },
  { id: "robot-sparkle", label: "Robot + sparkle", description: "Bot with AI accent" },
  { id: "ai-monogram", label: "AI", description: "Compact AI monogram" },
  { id: "wand-sparkle", label: "Wand", description: "Magic wand + sparkle — “fix schedule”" },
];

interface IconProps {
  className?: string;
}

function Svg({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconSparkleClassic({ className = "h-6 w-6" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M8.5 5.5 9.6 10.2 14.3 11.3 9.6 12.4 8.5 17.1 7.4 12.4 2.7 11.3 7.4 10.2 8.5 5.5Z" />
      <path d="M17.8 2.8 18.35 5.1 20.65 5.65 18.35 6.2 17.8 8.5 17.25 6.2 14.95 5.65 17.25 5.1 17.8 2.8Z" />
      <path d="M19.2 14.2 19.6 16.1 21.5 16.5 19.6 16.9 19.2 18.8 18.8 16.9 16.9 16.5 18.8 16.1 19.2 14.2Z" />
    </Svg>
  );
}

export function IconBubbleChat({ className = "h-6 w-6" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3a8 8 0 0 0-8 8c0 1.45.39 2.81 1.07 3.98L4 20l5.24-1.01A8 8 0 1 0 12 3Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm-2.2 4.5h4.4a1 1 0 1 1 0 2H9.8a1 1 0 1 1 0-2Zm0 3h2.8a1 1 0 1 1 0 2H9.8a1 1 0 1 1 0-2Z" />
    </Svg>
  );
}

export function IconBubbleSparkle({ className = "h-6 w-6" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 2.5a8.5 8.5 0 0 0-8.5 8.5c0 1.5.4 2.9 1.1 4.1L3.5 20.5l5.4-1.05A8.5 8.5 0 1 0 12 2.5Zm0 2a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Z" opacity="0.35" />
      <path d="M12 2.5a8.5 8.5 0 0 0-8.5 8.5c0 1.5.4 2.9 1.1 4.1L3.5 20.5l5.4-1.05A8.5 8.5 0 1 0 12 2.5Zm0 2a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11.2 8.2 11.7 10.4 13.9 10.9 11.7 11.4 11.2 13.6 10.7 11.4 8.5 10.9 10.7 10.4 11.2 8.2Z" />
      <path d="M14.8 7.1 15.1 8.2 16.2 8.5 15.1 8.8 14.8 9.9 14.5 8.8 13.4 8.5 14.5 8.2 14.8 7.1Z" />
    </Svg>
  );
}

export function IconSparkleInBubble({ className = "h-6 w-6" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4.5 5.5c0-1.1.9-2 2-2h11c1.1 0 2 .9 2 2v7.5c0 1.1-.9 2-2 2H9.8L5.5 19.5V14.5c-1.1-.2-2-1.1-2-2.2V5.5Z" opacity="0.22" />
      <path d="M4.5 5.5c0-1.1.9-2 2-2h11c1.1 0 2 .9 2 2v7.5c0 1.1-.9 2-2 2H9.8L5.5 19.5V14.5c-1.1-.2-2-1.1-2-2.2V5.5Z" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
      <path d="M12.2 7.4 13 10.1 15.7 10.9 13 11.7 12.2 14.4 11.4 11.7 8.7 10.9 11.4 10.1 12.2 7.4Z" />
      <path d="M16.4 6.2 16.8 7.4 18 7.8 16.8 8.2 16.4 9.4 16 8.2 14.8 7.8 16 7.4 16.4 6.2Z" />
    </Svg>
  );
}

export function IconBubbleSparkleBadge({ className = "h-6 w-6" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3a8 8 0 0 0-8 8c0 1.35.36 2.62.99 3.72L4.2 19.8l5.05-.98A8 8 0 1 0 12 3Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm-1.75 4.25h3.5a.9.9 0 1 1 0 1.8h-3.5a.9.9 0 1 1 0-1.8Zm0 2.8h2.2a.9.9 0 1 1 0 1.8h-2.2a.9.9 0 1 1 0-1.8Z" />
      <path d="M17.6 4.2 18.05 5.55 19.4 6 18.05 6.45 17.6 7.8 17.15 6.45 15.8 6 17.15 5.55 17.6 4.2Z" />
    </Svg>
  );
}

export function IconRobotFace({ className = "h-6 w-6" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 2.5a1.8 1.8 0 0 1 1.8 1.8v.7h2.2a3.2 3.2 0 0 1 3.2 3.2v6.3a3.2 3.2 0 0 1-3.2 3.2H8.2a3.2 3.2 0 0 1-3.2-3.2V8.2a3.2 3.2 0 0 1 3.2-3.2h2.2v-.7A1.8 1.8 0 0 1 12 2.5ZM9.4 8.6a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 0 0 0-2.7Zm5.2 0a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 0 0 0-2.7ZM8.8 14.1h6.4a1.1 1.1 0 0 0 0-2.2H8.8a1.1 1.1 0 0 0 0 2.2Z" />
    </Svg>
  );
}

export function IconRobotBubble({ className = "h-6 w-6" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 2.2a9 9 0 0 0-9 9c0 1.55.42 3 1.15 4.25L3 21.8l6.35-1.22A9 9 0 1 0 12 2.2Zm0 2a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z" opacity="0.25" />
      <path d="M12 2.2a9 9 0 0 0-9 9c0 1.55.42 3 1.15 4.25L3 21.8l6.35-1.22A9 9 0 1 0 12 2.2Zm0 2a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9.1 9.4a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Zm5.8 0a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM9.2 13.6h5.6a1 1 0 0 0 0-2H9.2a1 1 0 0 0 0 2Z" />
      <path d="M12 5.1v1.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="12" cy="4.3" r=".75" />
    </Svg>
  );
}

export function IconRobotSparkle({ className = "h-6 w-6" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M10.5 3.2a1.5 1.5 0 0 1 1.5 1.5v.55h1.85a2.7 2.7 0 0 1 2.7 2.7v5.35a2.7 2.7 0 0 1-2.7 2.7H7.95a2.7 2.7 0 0 1-2.7-2.7V8.15a2.7 2.7 0 0 1 2.7-2.7h1.85v-.55A1.5 1.5 0 0 1 10.5 3.2ZM8.55 8.1a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3Zm3.9 0a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3ZM8.2 12.85h4.6a.95.95 0 0 0 0-1.9H8.2a.95.95 0 0 0 0 1.9Z" />
      <path d="M17.4 4.1 17.85 5.45 19.2 5.9 17.85 6.35 17.4 7.7 16.95 6.35 15.6 5.9 16.95 5.45 17.4 4.1Z" />
      <path d="M19.1 11.2 19.4 12.2 20.4 12.5 19.4 12.8 19.1 13.8 18.8 12.8 17.8 12.5 18.8 12.2 19.1 11.2Z" />
    </Svg>
  );
}

export function IconAiMonogram({ className = "h-6 w-6" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6.2 6.5h2.45l1.15 3.05 1.15-3.05h2.45L11.1 14.2H9.35L8.7 12.1 8.05 14.2H6.3L6.2 6.5ZM13.55 6.5H17.8v1.65h-2.35v1.05h2.15v1.6h-2.15v1.05h2.45V14.2h-4.25V6.5Z" />
      <path d="M5 16.8h14v1.5H5z" opacity="0.2" />
    </Svg>
  );
}

export function IconWandSparkle({ className = "h-6 w-6" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m5.2 16.8 1.1-1.1 7.5-7.5 2.2 2.2-7.5 7.5-1.1 1.1-2.2-2.2ZM15.4 5.6l1.5-1.5 2.1 2.1-1.5 1.5-2.1-2.1Z" />
      <path d="M16.8 3.2 17.35 4.75 18.9 5.3 17.35 5.85 16.8 7.4 16.25 5.85 14.7 5.3 16.25 4.75 16.8 3.2Z" />
      <path d="M19.5 9.1 19.85 10.15 20.9 10.5 19.85 10.85 19.5 11.9 19.15 10.85 18.1 10.5 19.15 10.15 19.5 9.1Z" />
    </Svg>
  );
}

const ICON_MAP: Record<AgentIconVariantId, ComponentType<IconProps>> = {
  "sparkle-classic": IconSparkleClassic,
  "bubble-chat": IconBubbleChat,
  "bubble-sparkle": IconBubbleSparkle,
  "sparkle-in-bubble": IconSparkleInBubble,
  "bubble-sparkle-badge": IconBubbleSparkleBadge,
  "robot-face": IconRobotFace,
  "robot-bubble": IconRobotBubble,
  "robot-sparkle": IconRobotSparkle,
  "ai-monogram": IconAiMonogram,
  "wand-sparkle": IconWandSparkle,
};

export function AgentIconVariant({
  id,
  className = "h-6 w-6",
}: {
  id: AgentIconVariantId;
  className?: string;
}) {
  const Icon = ICON_MAP[id];
  return <Icon className={className} />;
}
