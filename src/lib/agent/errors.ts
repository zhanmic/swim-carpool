import type { AssignmentRole } from "@/lib/types";

const ASSIGNMENT_ERRORS: Record<string, string> = {
  "Slot already claimed by another family":
    "That slot is already claimed by another family. Say who should release it, or pick a different day.",
  "Assignment not found or not yours":
    "That family does not hold that slot on that day.",
};

const FAMILY_ERRORS: Record<string, (name: string) => string> = {
  "Family not found": (name) => `I could not find a family named "${name}". Check the spelling.`,
};

export function formatAgentError(
  error: string | undefined,
  fallback: string,
  context?: { familyName?: string; role?: AssignmentRole }
): string {
  if (!error) return fallback;

  if (error in ASSIGNMENT_ERRORS) {
    const base = ASSIGNMENT_ERRORS[error]!;
    if (context?.role) {
      return base.replace("That slot", `That ${context.role} slot`);
    }
    return base;
  }

  if (error.startsWith("Family not found:") && context?.familyName) {
    return `I could not find a family named "${context.familyName}".`;
  }

  if (error === "Family not found" && context?.familyName) {
    return FAMILY_ERRORS["Family not found"]!(context.familyName);
  }

  return error;
}

export function formatToolSuccess(tool: string, detail: string): string {
  return `${tool}: ${detail}`;
}
