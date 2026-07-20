import type { AssignmentRole, ScheduleIntegration } from "@/lib/types";

export interface AgentChatTurn {
  role: "user" | "assistant";
  text: string;
}

export interface AgentRequestBody {
  message?: string;
  week_start?: string;
  active_family_id?: string | null;
  client_today?: string | null;
  history?: AgentChatTurn[];
  confirm?: {
    token: string;
    approved: boolean;
  };
}

export interface AgentToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface AgentActionSummary {
  tool: string;
  summary: string;
}

export interface AgentProposedPlan {
  summary: string;
  destructive: boolean;
  token: string;
}

export interface AgentResponseBody {
  reply: string;
  actions_taken?: AgentActionSummary[];
  proposed_plan?: AgentProposedPlan;
  week_mutated: boolean;
}

export interface AgentContext {
  slug: string;
  teamId: string;
  teamName: string;
  weekStart: string;
  visibleDays: number[];
  teamCreatedAt: string;
  activeFamilyId: string | null;
  activeFamilyName: string | null;
  scheduleIntegration: ScheduleIntegration | null;
}

export interface ToolExecutionResult {
  ok: boolean;
  message: string;
}

export type ClaimRole = AssignmentRole;
