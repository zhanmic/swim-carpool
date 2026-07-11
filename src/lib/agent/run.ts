import { GoogleGenAI, createPartFromFunctionResponse, type Content, type Part } from "@google/genai";
import { DESTRUCTIVE_AGENT_TOOLS, signAgentPlan, summarizePlan, verifyAgentPlan } from "./confirm";
import { buildAgentSystemPrompt, loadAgentScheduleContext } from "./context";
import { AGENT_TOOL_DECLARATIONS, executeAgentTool } from "./tools";
import type {
  AgentActionSummary,
  AgentContext,
  AgentProposedPlan,
  AgentResponseBody,
  AgentToolCall,
} from "./types";

const MAX_TOOL_ROUNDS = 6;
const DEFAULT_MODEL = "gemini-2.5-flash";
const MODEL_FALLBACKS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"] as const;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

function modelCandidates(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim();
  const chain = preferred ? [preferred, ...MODEL_FALLBACKS] : [...MODEL_FALLBACKS];
  return [...new Set(chain)];
}

function isModelUnavailableError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /not found|404/i.test(message) && /model/i.test(message);
}

function formatGeminiError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/API key not valid|API_KEY_INVALID|invalid api key/i.test(message)) {
    return "Invalid GEMINI_API_KEY. Check the key in Vercel matches Google AI Studio.";
  }
  if (isModelUnavailableError(err)) {
    return `Gemini model not available. Set GEMINI_MODEL to gemini-2.5-flash in Vercel (gemini-2.0-flash is retired).`;
  }
  if (/quota|rate limit|429/i.test(message)) {
    return "Gemini rate limit hit. Wait a minute or check Google AI Studio quotas.";
  }
  return `Gemini error: ${message.slice(0, 200)}`;
}

async function generateWithModels(
  ai: GoogleGenAI,
  request: {
    contents: Content[];
    config: {
      systemInstruction: string;
      tools: [{ functionDeclarations: typeof AGENT_TOOL_DECLARATIONS }];
    };
    pinnedModel?: string | null;
  }
): Promise<{ response: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>; model: string } | { error: string }> {
  const models = request.pinnedModel ? [request.pinnedModel] : modelCandidates();
  let lastError: unknown = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: request.contents,
        config: request.config,
      });
      return { response, model };
    } catch (err) {
      lastError = err;
      if (!isModelUnavailableError(err)) {
        return { error: formatGeminiError(err) };
      }
      console.warn(`Gemini model unavailable: ${model}`);
    }
  }

  return { error: formatGeminiError(lastError) };
}

function isThoughtSignatureError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /thought_signature|thought signature/i.test(message);
}

function toolCallsFromResponse(response: { functionCalls?: Array<{ name?: string; args?: Record<string, unknown>; id?: string }> }): AgentToolCall[] {
  const calls = response.functionCalls ?? [];
  return calls
    .filter((call) => call.name)
    .map((call) => ({
      name: call.name!,
      args: (call.args ?? {}) as Record<string, unknown>,
    }));
}

function modelTurnParts(
  response: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>
): Part[] {
  const parts = response.candidates?.[0]?.content?.parts;
  if (parts && parts.length > 0) return parts;
  const calls = response.functionCalls ?? [];
  return calls.map((call) => ({
    functionCall: call,
  }));
}

function functionCallId(
  response: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>,
  call: AgentToolCall,
  index: number
): string {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const functionParts = parts.filter((part) => part.functionCall);
  const match =
    functionParts[index] ??
    functionParts.find((part) => part.functionCall?.name === call.name);
  return match?.functionCall?.id ?? call.name;
}

async function runConfirmedTools(
  ctx: AgentContext,
  tools: AgentToolCall[]
): Promise<{ actions: AgentActionSummary[]; weekMutated: boolean; errors: string[] }> {
  const actions: AgentActionSummary[] = [];
  const errors: string[] = [];
  let weekMutated = false;

  for (const call of tools) {
    const result = await executeAgentTool(ctx, call);
    actions.push({ tool: call.name, summary: result.message });
    if (!result.ok) errors.push(result.message);
    else weekMutated = true;
  }

  return { actions, weekMutated, errors };
}

export async function runAgentTurn(options: {
  slug: string;
  weekStart: string;
  message: string;
  activeFamilyId: string | null;
}): Promise<AgentResponseBody | { error: string; status: number }> {
  const ai = getGeminiClient();
  if (!ai) {
    return { error: "Agent is not configured (missing GEMINI_API_KEY)", status: 503 };
  }

  const loaded = await loadAgentScheduleContext(options.slug, options.weekStart, options.activeFamilyId);
  if (!loaded) return { error: "Team not found", status: 404 };

  const { context, scheduleText } = loaded;
  const systemPrompt = buildAgentSystemPrompt(scheduleText);
  const history: Content[] = [
    {
      role: "user",
      parts: [{ text: options.message.trim() }],
    },
  ];

  const actionsTaken: AgentActionSummary[] = [];
  let weekMutated = false;
  let activeModel: string | null = null;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const generated = await generateWithModels(ai, {
      contents: history,
      config: {
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: AGENT_TOOL_DECLARATIONS }],
      },
      pinnedModel: activeModel,
    });

    if ("error" in generated) {
      return { error: generated.error, status: 502 };
    }

    activeModel = generated.model;
    const response = generated.response;

    const calls = toolCallsFromResponse(response);
    const text = response.text?.trim();

    if (calls.length === 0) {
      return {
        reply: text || "Done.",
        actions_taken: actionsTaken.length > 0 ? actionsTaken : undefined,
        week_mutated: weekMutated,
      };
    }

    const safeCalls = calls.filter((call) => !DESTRUCTIVE_AGENT_TOOLS.has(call.name));
    const destructiveCalls = calls.filter((call) => DESTRUCTIVE_AGENT_TOOLS.has(call.name));

    if (safeCalls.length > 0) {
      history.push({ role: "model", parts: modelTurnParts(response) });

      const functionResponses: Part[] = [];
      for (const [index, call] of safeCalls.entries()) {
        const result = await executeAgentTool(context, call);
        actionsTaken.push({ tool: call.name, summary: result.message });
        if (result.ok) weekMutated = true;
        functionResponses.push(
          createPartFromFunctionResponse(functionCallId(response, call, index), call.name, {
            ok: result.ok,
            message: result.message,
          })
        );
      }
      history.push({ role: "user", parts: functionResponses });
    }

    if (destructiveCalls.length > 0) {
      const { summary, destructive: isDestructive } = summarizePlan(destructiveCalls);
      const token = signAgentPlan({
        slug: context.slug,
        week_start: context.weekStart,
        active_family_id: context.activeFamilyId,
        tools: destructiveCalls,
      });
      return {
        reply:
          text ||
          (safeCalls.length > 0
            ? "I applied the other changes. Please confirm the week action below."
            : isDestructive
              ? "This will change the week schedule. Please confirm before I run it."
              : "Please confirm these changes."),
        proposed_plan: {
          summary,
          destructive: isDestructive,
          token,
        },
        actions_taken: actionsTaken.length > 0 ? actionsTaken : undefined,
        week_mutated: weekMutated,
      };
    }

    continue;
  }

  return {
    reply: "I need to stop after several steps. Please try a simpler request.",
    actions_taken: actionsTaken,
    week_mutated: weekMutated,
  };
}

export async function runAgentConfirmation(options: {
  slug: string;
  weekStart: string;
  activeFamilyId: string | null;
  token: string;
  approved: boolean;
}): Promise<AgentResponseBody | { error: string; status: number }> {
  if (!options.approved) {
    return { reply: "Cancelled — no changes made.", week_mutated: false };
  }

  const plan = verifyAgentPlan(options.token, options.slug);
  if (!plan) return { error: "Confirmation expired or invalid. Please ask again.", status: 400 };

  const loaded = await loadAgentScheduleContext(options.slug, options.weekStart, options.activeFamilyId);
  if (!loaded) return { error: "Team not found", status: 404 };

  const { actions, weekMutated, errors } = await runConfirmedTools(loaded.context, plan.tools);
  if (errors.length > 0 && actions.every((action) => action.summary.startsWith("Tool failed") || errors.includes(action.summary))) {
    return {
      reply: `Could not complete: ${errors.join("; ")}`,
      actions_taken: actions,
      week_mutated: false,
    };
  }

  const okCount = actions.filter((action) => !errors.includes(action.summary)).length;
  return {
    reply:
      errors.length > 0
        ? `Completed ${okCount} step(s), but some failed: ${errors.join("; ")}`
        : `Done. ${actions.map((action) => action.summary).join(" ")}`,
    actions_taken: actions,
    week_mutated: weekMutated,
  };
}
