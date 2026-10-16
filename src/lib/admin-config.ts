/**
 * Links — admin configuration (server only).
 *
 * A tiny key-value table (admin_config) holding the AI widget agent's
 * settings. The API key never leaves the server: reads mask it, and
 * only /admin (HTTP basic auth, credentials in env vars) can change it.
 */
import { get, run } from "./db";
import type { LlmConfig } from "./llm";

export interface AiAgentConfig {
  enabled: boolean;
  endpoint: string;
  apiKey: string;
  models: string[]; // fallback order
  tokenParam: "max_tokens" | "max_completion_tokens";
}

const DEFAULT: AiAgentConfig = {
  enabled: false,
  endpoint: "",
  apiKey: "",
  models: [],
  tokenParam: "max_tokens",
};

const KEY = "ai_agent";

export async function getAiConfig(): Promise<AiAgentConfig> {
  try {
    const row = await get<{ value: string }>("SELECT value FROM admin_config WHERE key = ?", [KEY]);
    if (!row) return { ...DEFAULT };
    const raw = JSON.parse(row.value) as Record<string, unknown>;
    return {
      enabled: raw.enabled === true,
      endpoint: typeof raw.endpoint === "string" ? raw.endpoint : "",
      apiKey: typeof raw.apiKey === "string" ? raw.apiKey : "",
      models: Array.isArray(raw.models)
        ? raw.models.filter((m): m is string => typeof m === "string" && m.trim().length > 0)
        : [],
      tokenParam: raw.tokenParam === "max_completion_tokens" ? "max_completion_tokens" : "max_tokens",
    };
  } catch {
    return { ...DEFAULT };
  }
}

export interface AiConfigPatch {
  enabled?: unknown;
  endpoint?: unknown;
  apiKey?: unknown;
  models?: unknown;
  tokenParam?: unknown;
}

/** Validates + persists a partial update. Returns a user-safe error or null. */
export async function setAiConfig(patch: AiConfigPatch): Promise<string | null> {
  const current = await getAiConfig();

  let endpoint = current.endpoint;
  if (patch.endpoint !== undefined) {
    const raw = typeof patch.endpoint === "string" ? patch.endpoint.trim() : "";
    if (raw && !/^https:\/\/[^\s]+$/i.test(raw) && !/^http:\/\/localhost/i.test(raw)) {
      return "The endpoint must be an https:// URL (your OpenAI-compatible /v1 base).";
    }
    endpoint = raw;
  }

  let apiKey = current.apiKey;
  if (patch.apiKey !== undefined) {
    if (typeof patch.apiKey !== "string") return "Bad API key.";
    const raw = patch.apiKey.trim();
    // empty string keeps the stored key (so the form never needs to re-send it)
    apiKey = raw === "" ? current.apiKey : raw.slice(0, 500);
  }

  let models = current.models;
  if (patch.models !== undefined) {
    const raw = typeof patch.models === "string" ? patch.models : "";
    models = raw
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean)
      .slice(0, 5);
  }

  const tokenParam =
    patch.tokenParam === "max_completion_tokens" || patch.tokenParam === "max_tokens"
      ? patch.tokenParam
      : current.tokenParam;

  const enabled = typeof patch.enabled === "boolean" ? patch.enabled : current.enabled;

  if (enabled && (!endpoint || models.length === 0)) {
    return "Turn it off, or add at least an endpoint and one model.";
  }

  await run(
    "INSERT INTO admin_config (key, value, updated_at) VALUES (?, ?, ?)\n" +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    [KEY, JSON.stringify({ enabled, endpoint, apiKey, models, tokenParam }), Date.now()]
  );
  return null;
}

/** The subset safe to send to the dashboard (visibility toggle). */
export async function aiAgentVisible(): Promise<boolean> {
  const cfg = await getAiConfig();
  return cfg.enabled && !!cfg.endpoint && cfg.models.length > 0;
}

/** Full config for the LLM client (server-side only). */
export async function llmConfig(): Promise<LlmConfig | null> {
  const cfg = await getAiConfig();
  if (!cfg.enabled || !cfg.endpoint || !cfg.models.length) return null;
  return {
    endpoint: cfg.endpoint,
    apiKey: cfg.apiKey,
    models: cfg.models,
    tokenParam: cfg.tokenParam,
  };
}

/** Config shaped for the admin form — key masked, never echoed. */
export async function getAiConfigForAdmin(): Promise<
  Omit<AiAgentConfig, "apiKey"> & { hasKey: boolean; keyHint: string }
> {
  const cfg = await getAiConfig();
  const { apiKey, ...rest } = cfg;
  return {
    ...rest,
    hasKey: apiKey.length > 0,
    keyHint: apiKey ? `••••••••${apiKey.slice(-4)}` : "",
  };
}
