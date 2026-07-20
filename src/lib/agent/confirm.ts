import { createHmac, timingSafeEqual } from "crypto";
import type { AgentToolCall } from "./types";

const PLAN_TTL_MS = 10 * 60 * 1000;

interface SignedPlanPayload {
  slug: string;
  week_start: string;
  active_family_id: string | null;
  tools: AgentToolCall[];
  exp: number;
}

function planSecret(): string {
  return process.env.AGENT_PLAN_SECRET ?? process.env.GEMINI_API_KEY ?? "dev-agent-plan";
}

export function signAgentPlan(payload: Omit<SignedPlanPayload, "exp">): string {
  const body: SignedPlanPayload = { ...payload, exp: Date.now() + PLAN_TTL_MS };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = createHmac("sha256", planSecret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyAgentPlan(token: string, slug: string): SignedPlanPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", planSecret()).update(encoded).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SignedPlanPayload;
    if (payload.slug !== slug || payload.exp < Date.now()) return null;
    if (!Array.isArray(payload.tools) || payload.tools.length === 0) return null;
    return payload;
  } catch {
    return null;
  }
}

export function summarizePlan(tools: AgentToolCall[]): { summary: string; destructive: boolean } {
  const labels = tools.map((tool) => {
    switch (tool.name) {
      case "clear_week":
        return "clear this week's slots, notes, home pickups, and skips";
      case "copy_previous_week":
        return "copy last week's times and locations (clears current slots)";
      case "import_from_commit": {
        const group = typeof tool.args?.group === "string" && tool.args.group.trim()
          ? tool.args.group.trim()
          : null;
        return group
          ? `fill this week's practices from Commit for ${group}`
          : "fill this week's practices from Commit";
      }
      default:
        return tool.name.replaceAll("_", " ");
    }
  });
  const destructive = tools.some((tool) => DESTRUCTIVE_AGENT_TOOLS.has(tool.name));
  return {
    summary: labels.join("; then "),
    destructive,
  };
}

export const DESTRUCTIVE_AGENT_TOOLS = new Set([
  "clear_week",
  "copy_previous_week",
  "import_from_commit",
]);
