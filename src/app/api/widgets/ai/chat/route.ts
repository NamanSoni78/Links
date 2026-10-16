import { NextRequest } from "next/server";
import { authGuard, fail, ok } from "@/lib/api";
import { llmConfig } from "@/lib/admin-config";
import { buildAgentSystemPrompt } from "@/lib/widgets-ai";
import { fetchWidgetProfileContext } from "@/lib/profiles";
import { llmChat, type LlmMessage } from "@/lib/llm";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_HISTORY = 12; // messages kept from the client
const MAX_CHARS = 4000; // per message

/**
 * POST /api/widgets/ai/chat — one turn with the widget agent.
 * Body: { messages: [{ role: "user"|"assistant", content }] }
 *
 * The system prompt (schema, interview rules, the user's real profile
 * data) is built server-side and never sent from the client. Mostly
 * IO-wait on the upstream provider, so CPU cost stays negligible.
 */
export async function POST(req: NextRequest) {
  const guard = await authGuard();
  if (guard.response) return guard.response;

  const cfg = await llmConfig();
  if (!cfg) {
    return fail("The AI helper is taking a break — the site owner can turn it back on.", 503);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("That request didn't parse. Try again.");
  }

  const raw = (body ?? {}) as { messages?: unknown };
  if (!Array.isArray(raw.messages) || raw.messages.length === 0) {
    return fail("Say something first.", 422);
  }

  const history: LlmMessage[] = [];
  for (const m of raw.messages.slice(-MAX_HISTORY)) {
    const msg = (m ?? {}) as Record<string, unknown>;
    const role = msg.role === "assistant" ? "assistant" : "user";
    const content = typeof msg.content === "string" ? msg.content.trim().slice(0, MAX_CHARS) : "";
    if (content) history.push({ role, content });
  }
  if (history.length === 0) return fail("Say something first.", 422);
  // the agent replies to whatever the user last said
  if (history[history.length - 1].role !== "user") {
    history.push({ role: "user", content: "Go ahead." });
  }

  const profile = await fetchWidgetProfileContext(guard.user.id);
  const messages: LlmMessage[] = [
    { role: "system", content: buildAgentSystemPrompt(profile, SITE.url) },
    ...history,
  ];

  const result = await llmChat(cfg, messages, { maxTokens: 1400, temperature: 0.7 });
  if (!result.ok) {
    return fail(`The model didn't answer (${result.error}). Try again in a moment.`, result.status ?? 502);
  }

  return ok({ reply: result.content, model: result.model });
}
