/**
 * Links — minimal OpenAI-compatible chat client (server only).
 *
 * Works with any /v1 endpoint that speaks the OpenAI chat-completions
 * dialect (OpenAI, Groq, OpenRouter, Together, llamacpp, Ollama with
 * /v1, …). Models are tried in order — if the first one 404s / 429s /
 * 500s / times out, the next takes over, so "model1,model2" in the
 * admin panel is a real fallback chain, not a wish.
 */

export interface LlmConfig {
  /** base like https://api.openai.com/v1 — or a full …/chat/completions URL */
  endpoint: string;
  apiKey: string;
  /** tried in order */
  models: string[];
  /** how the provider wants the token cap: max_tokens | max_completion_tokens */
  tokenParam: "max_tokens" | "max_completion_tokens";
}

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type LlmCallResult =
  | { ok: true; content: string; model: string }
  | { ok: false; error: string; status?: number };

function chatUrl(endpoint: string): string {
  const base = endpoint.trim().replace(/\/+$/, "");
  if (/\/chat\/completions$/.test(base)) return base;
  return `${base}/chat/completions`;
}

const RETRYABLE = new Set([404, 408, 409, 425, 429, 500, 502, 503, 504]);

/** One conversation turn. Tries each model until one answers. */
export async function llmChat(
  cfg: LlmConfig,
  messages: LlmMessage[],
  opts: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {}
): Promise<LlmCallResult> {
  if (!cfg.endpoint || !cfg.models.length) {
    return { ok: false, error: "The AI agent isn't configured yet." };
  }

  const maxTokens = opts.maxTokens ?? 1400;
  const temperature = opts.temperature ?? 0.7;
  const errors: string[] = [];

  for (const model of cfg.models) {
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature,
      [cfg.tokenParam]: maxTokens,
    };

    try {
      const res = await fetch(chatUrl(cfg.endpoint), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(opts.timeoutMs ?? 45_000),
      });

      if (res.ok) {
        const json = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const content = json.choices?.[0]?.message?.content;
        if (typeof content === "string" && content.trim()) {
          return { ok: true, content: content.trim(), model };
        }
        errors.push(`${model}: empty reply`);
        continue;
      }

      const text = await res.text().catch(() => "");
      const detail = text.slice(0, 300).replace(/\s+/g, " ").trim();
      // bad key / no auth — no point burning the fallback chain
      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: `The API key was rejected (${res.status}).`, status: 502 };
      }
      if (!RETRYABLE.has(res.status)) {
        return {
          ok: false,
          error: `Model “${model}” replied ${res.status}${detail ? `: ${detail}` : "."}`,
          status: 502,
        };
      }
      errors.push(`${model}: HTTP ${res.status}${detail ? ` — ${detail}` : ""}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${model}: ${msg.includes("aborted") || msg.includes("timeout") ? "timed out" : msg}`);
    }
  }

  return {
    ok: false,
    error: errors.length ? errors.join(" · ") : "No models configured.",
    status: 502,
  };
}
