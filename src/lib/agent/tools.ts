import {
  applyLocationToWeek,
  applyTimeToWeek,
  claimAssignment,
  clearAbsence,
  clearWeekAssignments,
  copyScheduleFromPreviousWeek,
  getFamilies,
  getSessionByDateForTeam,
  markAbsence,
  releaseAssignment,
  unclaimAssignment,
  updateSession,
} from "@/lib/db";
import { snapTimeToStep } from "@/lib/dates";
import { applyCommitWeekImport } from "@/lib/commitImport";
import {
  buildDefaultHomePickups,
  finalizeDropoffPickupsForSession,
  isValidSessionDate,
  resolveDropoffPickupsInput,
  resolveFamilyId,
} from "@/lib/scheduleApi";
import type { AssignmentRole } from "@/lib/types";
import { Type, type FunctionDeclaration } from "@google/genai";
import { formatAgentError } from "./errors";
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
    name: "unclaim_slot",
    description: "Remove a family's claim on drop-off or pick-up without affecting other families.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: "Practice date YYYY-MM-DD" },
        family_name: { type: Type.STRING, description: "Family name" },
        role: { type: Type.STRING, description: "dropoff or pickup" },
      },
      required: ["date", "family_name", "role"],
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
    name: "set_home_pickup",
    description: "Set one family's home pickup time on a practice day (HH:MM, 24h).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: "Practice date YYYY-MM-DD" },
        family_name: { type: Type.STRING, description: "Family name" },
        time: { type: Type.STRING, description: "Pickup time HH:MM" },
      },
      required: ["date", "family_name", "time"],
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
    name: "set_session_time",
    description: "Set start and end time for one practice day.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: "Practice date YYYY-MM-DD" },
        start_time: { type: Type.STRING, description: "Start time HH:MM" },
        end_time: { type: Type.STRING, description: "End time HH:MM" },
      },
      required: ["date", "start_time", "end_time"],
    },
  },
  {
    name: "set_session_location",
    description: "Set practice location name for one day.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: "Practice date YYYY-MM-DD" },
        location_name: { type: Type.STRING, description: "Location name" },
      },
      required: ["date", "location_name"],
    },
  },
  {
    name: "set_session_cancelled",
    description: "Cancel or uncancel practice on a single day. Use when practice was scheduled but is now cancelled. For days that never had practice scheduled, use set_session_no_practice instead.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: "Practice date YYYY-MM-DD" },
        cancelled: { type: Type.BOOLEAN, description: "true to cancel, false to restore" },
      },
      required: ["date", "cancelled"],
    },
  },
  {
    name: "set_session_no_practice",
    description: "Mark a day as having no practice or restore practice on a no-practice day. Use no_practice=true when there is no practice scheduled (never was scheduled). Use no_practice=false to restore practice on a day that was marked as no practice.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: "Practice date YYYY-MM-DD" },
        no_practice: { type: Type.BOOLEAN, description: "true to mark as no practice, false to restore normal practice" },
      },
      required: ["date", "no_practice"],
    },
  },
  {
    name: "set_week_time",
    description: "Set start and end time for all visible practice days this week.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        start_time: { type: Type.STRING, description: "Start time HH:MM" },
        end_time: { type: Type.STRING, description: "End time HH:MM" },
      },
      required: ["start_time", "end_time"],
    },
  },
  {
    name: "set_week_location",
    description: "Set practice location for all visible days this week.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        location_name: { type: Type.STRING, description: "Location name" },
      },
      required: ["location_name"],
    },
  },
  {
    name: "clear_week",
    description:
      "Clear all driver slots, notes, home pickup times, and skips for every visible day in the current week. Destructive.",
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
  {
    name: "import_from_commit",
    description:
      "Fill this week's practices from the team's connected Commit Swimming schedule: sets each day's time, location, and no-practice/cancelled status for the selected group. Keeps existing driver slots, skips, and home pickups. Only works when a Commit schedule source is connected.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        group: {
          type: Type.STRING,
          description:
            "Optional training group to import (e.g. Sr, Jr). Omit to use the team's configured group.",
        },
      },
    },
  },
];

async function loadSession(
  ctx: AgentContext,
  date: string
): Promise<{ session: NonNullable<Awaited<ReturnType<typeof getSessionByDateForTeam>>> } | { error: string }> {
  if (!isValidSessionDate(date)) {
    return { error: "Use a practice date from the date map (YYYY-MM-DD)." };
  }
  const session = await getSessionByDateForTeam(
    ctx.teamId,
    date,
    ctx.teamCreatedAt,
    ctx.visibleDays
  );
  if (!session) return { error: `There is no practice on ${date} for this team.` };
  return { session };
}

function parseRole(value: unknown): AssignmentRole | null {
  return value === "dropoff" || value === "pickup" ? value : null;
}

function parseTime(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return snapTimeToStep(value.trim());
}

async function resolveFamily(
  ctx: AgentContext,
  familyName: string
): Promise<{ familyId: string; familyName: string } | { error: string }> {
  const trimmed = familyName.trim();
  if (!trimmed && ctx.activeFamilyName) {
    const active = await resolveFamilyId(ctx.teamId, { family_name: ctx.activeFamilyName });
    if ("error" in active) {
      return { error: formatAgentError(active.error, "Could not resolve active family.", { familyName: ctx.activeFamilyName }) };
    }
    return { familyId: active.familyId, familyName: ctx.activeFamilyName };
  }
  if (!trimmed) return { error: "Which family? Use a name from the team list." };

  const family = await resolveFamilyId(ctx.teamId, { family_name: trimmed });
  if ("error" in family) {
    return { error: formatAgentError(family.error, "Family not found.", { familyName: trimmed }) };
  }
  return { familyId: family.familyId, familyName: trimmed };
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
        if (!role) return { ok: false, message: "Say dropoff or pickup." };
        const loaded = await loadSession(ctx, date);
        if ("error" in loaded) return { ok: false, message: loaded.error };

        const familyRef = await resolveFamily(ctx, typeof args.family_name === "string" ? args.family_name : "");
        if ("error" in familyRef) return { ok: false, message: familyRef.error };

        const result = await claimAssignment(loaded.session.id, familyRef.familyId, role);
        if (!result.ok) {
          return {
            ok: false,
            message: formatAgentError(result.error, "Could not claim slot.", {
              familyName: familyRef.familyName,
              role,
            }),
          };
        }
        return { ok: true, message: `${familyRef.familyName} is ${role} on ${date}.` };
      }

      case "unclaim_slot": {
        const date = String(args.date ?? "");
        const role = parseRole(args.role);
        const familyName = String(args.family_name ?? "").trim();
        if (!role) return { ok: false, message: "Say dropoff or pickup." };
        const loaded = await loadSession(ctx, date);
        if ("error" in loaded) return { ok: false, message: loaded.error };

        const familyRef = await resolveFamily(ctx, familyName);
        if ("error" in familyRef) return { ok: false, message: familyRef.error };

        const result = await unclaimAssignment(loaded.session.id, familyRef.familyId, role);
        if (!result.ok) {
          return {
            ok: false,
            message: formatAgentError(result.error, "Could not unclaim slot.", {
              familyName: familyRef.familyName,
              role,
            }),
          };
        }
        return { ok: true, message: `${familyRef.familyName} removed from ${role} on ${date}.` };
      }

      case "release_slot": {
        const date = String(args.date ?? "");
        const role = parseRole(args.role);
        if (!role) return { ok: false, message: "Say dropoff or pickup." };
        const loaded = await loadSession(ctx, date);
        if ("error" in loaded) return { ok: false, message: loaded.error };

        const result = await releaseAssignment(loaded.session.id, role);
        if (!result.ok) return { ok: false, message: formatAgentError(result.error, "Could not release slot.", { role }) };
        return { ok: true, message: `${role} slot opened on ${date}.` };
      }

      case "mark_skip": {
        const date = String(args.date ?? "");
        const loaded = await loadSession(ctx, date);
        if ("error" in loaded) return { ok: false, message: loaded.error };

        const familyRef = await resolveFamily(ctx, String(args.family_name ?? ""));
        if ("error" in familyRef) return { ok: false, message: familyRef.error };

        const result = await markAbsence(loaded.session.id, familyRef.familyId);
        if (!result.ok) return { ok: false, message: formatAgentError(result.error, "Could not mark skip.") };
        return { ok: true, message: `${familyRef.familyName} marked skip on ${date}.` };
      }

      case "clear_skip": {
        const date = String(args.date ?? "");
        const loaded = await loadSession(ctx, date);
        if ("error" in loaded) return { ok: false, message: loaded.error };

        const familyRef = await resolveFamily(ctx, String(args.family_name ?? ""));
        if ("error" in familyRef) return { ok: false, message: familyRef.error };

        const result = await clearAbsence(loaded.session.id, familyRef.familyId);
        if (!result.ok) return { ok: false, message: formatAgentError(result.error, "Could not clear skip.") };
        return { ok: true, message: `${familyRef.familyName} skip cleared on ${date}.` };
      }

      case "set_session_notes": {
        const date = String(args.date ?? "");
        const notesRaw = typeof args.notes === "string" ? args.notes : "";
        const loaded = await loadSession(ctx, date);
        if ("error" in loaded) return { ok: false, message: loaded.error };

        const notes = notesRaw.trim() || null;
        await updateSession(loaded.session.id, { location_notes: notes });
        return { ok: true, message: notes ? `Notes set on ${date}.` : `Notes cleared on ${date}.` };
      }

      case "set_home_pickup": {
        const date = String(args.date ?? "");
        const time = parseTime(args.time);
        if (!time) return { ok: false, message: "Give a pickup time like 07:00." };
        const loaded = await loadSession(ctx, date);
        if ("error" in loaded) return { ok: false, message: loaded.error };

        const familyRef = await resolveFamily(ctx, String(args.family_name ?? ""));
        if ("error" in familyRef) return { ok: false, message: familyRef.error };

        const resolved = await resolveDropoffPickupsInput(ctx.teamId, { [familyRef.familyName]: time });
        if ("error" in resolved) return { ok: false, message: resolved.error };

        const merged = { ...loaded.session.dropoff_pickups, ...resolved.pickups };
        const pickups = finalizeDropoffPickupsForSession(loaded.session, merged);
        await updateSession(loaded.session.id, { dropoff_pickups: pickups });
        return { ok: true, message: `${familyRef.familyName} home pickup set to ${time} on ${date}.` };
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
        return { ok: true, message: `Default home pickups set on ${date}.` };
      }

      case "set_session_time": {
        const date = String(args.date ?? "");
        const startTime = parseTime(args.start_time);
        const endTime = parseTime(args.end_time);
        if (!startTime || !endTime) return { ok: false, message: "Give start and end times like 05:45 and 06:45." };
        const loaded = await loadSession(ctx, date);
        if ("error" in loaded) return { ok: false, message: loaded.error };

        await updateSession(loaded.session.id, { start_time: startTime, end_time: endTime });
        return { ok: true, message: `Practice time on ${date} set to ${startTime}–${endTime}.` };
      }

      case "set_session_location": {
        const date = String(args.date ?? "");
        const locationName = String(args.location_name ?? "").trim();
        if (!locationName) return { ok: false, message: "Which location?" };
        const loaded = await loadSession(ctx, date);
        if ("error" in loaded) return { ok: false, message: loaded.error };

        await updateSession(loaded.session.id, { location_name: locationName });
        return { ok: true, message: `Location on ${date} set to ${locationName}.` };
      }

      case "set_session_cancelled": {
        const date = String(args.date ?? "");
        const cancelled = args.cancelled === true;
        const loaded = await loadSession(ctx, date);
        if ("error" in loaded) return { ok: false, message: loaded.error };

        await updateSession(loaded.session.id, { cancelled });
        return {
          ok: true,
          message: cancelled ? `Practice cancelled on ${date}.` : `Practice restored on ${date}.`,
        };
      }

      case "set_session_no_practice": {
        const date = String(args.date ?? "");
        const noPractice = args.no_practice === true;
        const loaded = await loadSession(ctx, date);
        if ("error" in loaded) return { ok: false, message: loaded.error };

        await updateSession(loaded.session.id, { no_practice: noPractice });
        return {
          ok: true,
          message: noPractice ? `${date} marked as no practice day.` : `Practice restored on ${date}.`,
        };
      }

      case "set_week_time": {
        const startTime = parseTime(args.start_time);
        const endTime = parseTime(args.end_time);
        if (!startTime || !endTime) return { ok: false, message: "Give start and end times like 05:45 and 06:45." };
        const updated = await applyTimeToWeek(ctx.teamId, ctx.weekStart, startTime, endTime, ctx.visibleDays);
        return { ok: true, message: `Week practice time set to ${startTime}–${endTime} (${updated} days).` };
      }

      case "set_week_location": {
        const locationName = String(args.location_name ?? "").trim();
        if (!locationName) return { ok: false, message: "Which location?" };
        const updated = await applyLocationToWeek(ctx.teamId, ctx.weekStart, locationName, ctx.visibleDays);
        return { ok: true, message: `Week location set to ${locationName} (${updated} days).` };
      }

      case "clear_week": {
        const cleared = await clearWeekAssignments(ctx.teamId, ctx.weekStart, ctx.visibleDays, {
          notesAndPickups: true,
        });
        return {
          ok: true,
          message: `Cleared week slots, notes, home pickups, and skips (${cleared} assignments removed).`,
        };
      }

      case "copy_previous_week": {
        const result = await copyScheduleFromPreviousWeek(ctx.teamId, ctx.weekStart, ctx.visibleDays);
        return {
          ok: true,
          message: `Copied previous week (${result.copied} days updated, ${result.cleared} slots cleared).`,
        };
      }

      case "import_from_commit": {
        if (!ctx.scheduleIntegration) {
          return {
            ok: false,
            message:
              "No Commit schedule source is connected. Add one in Team settings → Schedule source.",
          };
        }
        const groupArg =
          typeof args.group === "string" && args.group.trim() ? args.group.trim() : undefined;
        const result = await applyCommitWeekImport({
          teamId: ctx.teamId,
          teamCreatedAt: ctx.teamCreatedAt,
          visibleDays: ctx.visibleDays,
          integration: ctx.scheduleIntegration,
          weekStart: ctx.weekStart,
          ...(groupArg !== undefined ? { group: groupArg } : {}),
        });
        const groupLabel = result.group ?? "all practices";
        return {
          ok: true,
          message: `Imported this week from Commit for ${groupLabel} (${result.updated} day(s) updated).`,
        };
      }

      default:
        return { ok: false, message: `Unknown tool: ${call.name}` };
    }
  } catch (err) {
    console.error("agent tool error", call.name, err);
    return { ok: false, message: `Something went wrong running ${call.name}. Try again.` };
  }
}

export const AGENT_TOOL_NAMES = AGENT_TOOL_DECLARATIONS.map((tool) => tool.name);

export function isKnownAgentTool(name: string): boolean {
  return AGENT_TOOL_NAMES.includes(name);
}
