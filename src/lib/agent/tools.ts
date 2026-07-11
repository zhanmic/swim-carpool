import {
  claimAssignment,
  clearAbsence,
  clearWeekAssignments,
  copyScheduleFromPreviousWeek,
  getFamilies,
  getSessionByDateForTeam,
  markAbsence,
  releaseAssignment,
  updateSession,
} from "@/lib/db";
import { buildDefaultHomePickups, finalizeDropoffPickupsForSession, isValidSessionDate, resolveFamilyId } from "@/lib/scheduleApi";
import type { AssignmentRole } from "@/lib/types";
import { Type, type FunctionDeclaration } from "@google/genai";
import type { AgentContext, AgentToolCall, ToolExecutionResult } from "./types";

export const AGENT_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "claim_slot",
    description: "Claim drop-off or pick-up driver slot for a family on a practice day.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: "Practice date YYYY-MM-DD" },
        family_name: { type: Type.STRING, description: "Family name, or omit when user means active family" },
        role: { type: Type.STRING, description: "dropoff or pickup" },
      },
      required: ["date", "role"],
    },
  },
  {
    name: "release_slot",
    description: "Release whichever family holds a drop-off or pick-up slot on a day.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: "Practice date YYYY-MM-DD" },
        role: { type: Type.STRING, description: "dropoff or pickup" },
      },
      required: ["date", "role"],
    },
  },
  {
    name: "mark_skip",
    description: "Mark a family as skipping practice on a day.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: "Practice date YYYY-MM-DD" },
        family_name: { type: Type.STRING, description: "Family name" },
      },
      required: ["date", "family_name"],
    },
  },
  {
    name: "clear_skip",
    description: "Clear a skip/absence for a family on a day.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: "Practice date YYYY-MM-DD" },
        family_name: { type: Type.STRING, description: "Family name" },
      },
      required: ["date", "family_name"],
    },
  },
  {
    name: "set_session_notes",
    description: "Set other notes for drivers on a practice day.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: "Practice date YYYY-MM-DD" },
        notes: { type: Type.STRING, description: "Notes text, or empty string to clear" },
      },
      required: ["date", "notes"],
    },
  },
  {
    name: "set_default_home_pickups",
    description: "Set home pickup times to 30 minutes before practice start for a day.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: "Practice date YYYY-MM-DD" },
      },
      required: ["date"],
    },
  },
  {
    name: "clear_week",
    description:
      "Clear all driver slots, notes, and home pickup times for every visible day in the current week. Destructive.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "copy_previous_week",
    description:
      "Clear this week's driver slots then copy each day's location and time from the previous week. Destructive to slots.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
];

async function loadSession(ctx: AgentContext, date: string): Promise<{ session: Awaited<ReturnType<typeof getSessionByDateForTeam>> & object } | { error: string }> {
  if (!isValidSessionDate(date)) {
    return { error: "date must be YYYY-MM-DD" };
  }
  const session = await getSessionByDateForTeam(
    ctx.teamId,
    date,
    ctx.teamCreatedAt,
    ctx.visibleDays
  );
  if (!session) return { error: `No practice session for ${date}` };
  return { session };
}

function parseRole(value: unknown): AssignmentRole | null {
  return value === "dropoff" || value === "pickup" ? value : null;
}

export async function executeAgentTool(
  ctx: AgentContext,
  call: AgentToolCall
): Promise<ToolExecutionResult> {
  const args = call.args ?? {};

  try {
    switch (call.name) {
      case "claim_slot": {
        const date = String(args.date ?? "");
        const role = parseRole(args.role);
        if (!role) return { ok: false, message: "role must be dropoff or pickup" };
        const loaded = await loadSession(ctx, date);
        if ("error" in loaded) return { ok: false, message: loaded.error };

        let familyName = typeof args.family_name === "string" ? args.family_name.trim() : "";
        if (!familyName && ctx.activeFamilyName) familyName = ctx.activeFamilyName;
        if (!familyName) return { ok: false, message: "family_name is required" };

        const family = await resolveFamilyId(ctx.teamId, { family_name: familyName });
        if ("error" in family) return { ok: false, message: family.error };

        const result = await claimAssignment(loaded.session.id, family.familyId, role);
        if (!result.ok) return { ok: false, message: result.error ?? "Could not claim slot" };
        return { ok: true, message: `${familyName} claimed ${role} on ${date}` };
      }

      case "release_slot": {
        const date = String(args.date ?? "");
        const role = parseRole(args.role);
        if (!role) return { ok: false, message: "role must be dropoff or pickup" };
        const loaded = await loadSession(ctx, date);
        if ("error" in loaded) return { ok: false, message: loaded.error };

        const result = await releaseAssignment(loaded.session.id, role);
        if (!result.ok) return { ok: false, message: result.error ?? "Could not release slot" };
        return { ok: true, message: `Released ${role} on ${date}` };
      }

      case "mark_skip": {
        const date = String(args.date ?? "");
        const familyName = String(args.family_name ?? "").trim();
        const loaded = await loadSession(ctx, date);
        if ("error" in loaded) return { ok: false, message: loaded.error };

        const family = await resolveFamilyId(ctx.teamId, { family_name: familyName });
        if ("error" in family) return { ok: false, message: family.error };

        const result = await markAbsence(loaded.session.id, family.familyId);
        if (!result.ok) return { ok: false, message: result.error ?? "Could not mark skip" };
        return { ok: true, message: `${familyName} marked skip on ${date}` };
      }

      case "clear_skip": {
        const date = String(args.date ?? "");
        const familyName = String(args.family_name ?? "").trim();
        const loaded = await loadSession(ctx, date);
        if ("error" in loaded) return { ok: false, message: loaded.error };

        const family = await resolveFamilyId(ctx.teamId, { family_name: familyName });
        if ("error" in family) return { ok: false, message: family.error };

        const result = await clearAbsence(loaded.session.id, family.familyId);
        if (!result.ok) return { ok: false, message: result.error ?? "Could not clear skip" };
        return { ok: true, message: `${familyName} skip cleared on ${date}` };
      }

      case "set_session_notes": {
        const date = String(args.date ?? "");
        const notesRaw = typeof args.notes === "string" ? args.notes : "";
        const loaded = await loadSession(ctx, date);
        if ("error" in loaded) return { ok: false, message: loaded.error };

        const notes = notesRaw.trim() || null;
        await updateSession(loaded.session.id, { location_notes: notes });
        return { ok: true, message: notes ? `Notes set on ${date}` : `Notes cleared on ${date}` };
      }

      case "set_default_home_pickups": {
        const date = String(args.date ?? "");
        const loaded = await loadSession(ctx, date);
        if ("error" in loaded) return { ok: false, message: loaded.error };

        const families = await getFamilies(ctx.teamId);
        const pickups = finalizeDropoffPickupsForSession(
          loaded.session,
          buildDefaultHomePickups(families, loaded.session, loaded.session.dropoff_pickups)
        );
        await updateSession(loaded.session.id, { dropoff_pickups: pickups });
        return { ok: true, message: `Default home pickups set on ${date}` };
      }

      case "clear_week": {
        const cleared = await clearWeekAssignments(ctx.teamId, ctx.weekStart, ctx.visibleDays, {
          notesAndPickups: true,
        });
        return {
          ok: true,
          message: `Cleared week driver slots, notes, and home pickups (${cleared} assignments removed)`,
        };
      }

      case "copy_previous_week": {
        const result = await copyScheduleFromPreviousWeek(ctx.teamId, ctx.weekStart, ctx.visibleDays);
        return {
          ok: true,
          message: `Copied previous week schedule (${result.copied} days updated, ${result.cleared} slots cleared)`,
        };
      }

      default:
        return { ok: false, message: `Unknown tool: ${call.name}` };
    }
  } catch (err) {
    console.error("agent tool error", call.name, err);
    return { ok: false, message: `Tool failed: ${call.name}` };
  }
}

export function isMutatingTool(name: string): boolean {
  return AGENT_TOOL_DECLARATIONS.some((tool) => tool.name === name);
}
