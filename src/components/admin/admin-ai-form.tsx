"use client";

/**
 * Links — admin: the AI widget agent settings card.
 *
 * One OpenAI-compatible endpoint, a fallback chain of models, the
 * provider's token-parameter dialect, and the master switch that
 * hides "make with AI" from every user-facing screen when off.
 */
import { useState } from "react";
import { Loader2, PlugZap, Save } from "lucide-react";
import { toast } from "sonner";
import { FieldLabel, Toggle } from "@/components/widgets/widget-controls";
import { cn } from "@/lib/utils";

export interface AdminAiConfigView {
  enabled: boolean;
  endpoint: string;
  models: string[];
  tokenParam: "max_tokens" | "max_completion_tokens";
  hasKey: boolean;
  keyHint: string;
}

export function AdminAiForm({ initial }: { initial: AdminAiConfigView }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [endpoint, setEndpoint] = useState(initial.endpoint);
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState(initial.models.join(","));
  const [tokenParam, setTokenParam] = useState(initial.tokenParam);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  const payload = () => ({
    enabled,
    endpoint: endpoint.trim(),
    apiKey: apiKey.trim(), // empty keeps the stored key
    models,
    tokenParam,
  });

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/ai-config", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Couldn't save");
      toast.success("AI agent settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // save first so the test hits exactly what's stored
      const sr = await fetch("/api/admin/ai-config", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const sj = await sr.json();
      if (!sr.ok || !sj.ok) throw new Error(sj.error || "Save failed before testing");
      const r = await fetch("/api/admin/ai-test", { method: "POST" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Test failed");
      setTestResult({ ok: true, text: `${j.model} answered “${j.reply}”` });
    } catch (e) {
      setTestResult({ ok: false, text: e instanceof Error ? e.message : "Test failed" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">
            AI widget agent
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Powers “make a widget with AI” for signed-in users.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-[10.5px]",
              enabled
                ? "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                : "border-border bg-muted text-muted-foreground"
            )}
          >
            {enabled ? "visible to users" : "hidden from users"}
          </span>
          <Toggle checked={enabled} onChange={setEnabled} label="Show the AI widget agent to users" />
        </div>
      </div>

      <div className="grid gap-4 px-5 py-5 sm:px-6">
        <div>
          <FieldLabel htmlFor="ai-endpoint" hint="OpenAI-compatible base, ending in /v1">
            Endpoint URL
          </FieldLabel>
          <input
            id="ai-endpoint"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://api.openai.com/v1"
            spellCheck={false}
            autoCapitalize="none"
            className="h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-[12.5px] outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/20"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel
              htmlFor="ai-key"
              hint={initial.hasKey ? `stored ${initial.keyHint}` : "never stored until you save"}
            >
              API key
            </FieldLabel>
            <input
              id="ai-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={initial.hasKey ? "Leave empty to keep the stored key" : "sk-…"}
              spellCheck={false}
              autoCapitalize="none"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-[12.5px] outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/20"
            />
          </div>
          <div>
            <FieldLabel htmlFor="ai-models" hint="comma-separated, tried in order">
              Models (fallback chain)
            </FieldLabel>
            <input
              id="ai-models"
              value={models}
              onChange={(e) => setModels(e.target.value)}
              placeholder="gpt-4o-mini,gpt-4o"
              spellCheck={false}
              autoCapitalize="none"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-[12.5px] outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/20"
            />
          </div>
        </div>

        <div>
          <FieldLabel hint="some newer providers reject max_tokens">Token parameter</FieldLabel>
          <div className="flex gap-1.5">
            {(["max_tokens", "max_completion_tokens"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTokenParam(p)}
                aria-pressed={tokenParam === p}
                className={cn(
                  "rounded-lg border px-3 py-1.5 font-mono text-[12px] transition-colors",
                  tokenParam === p
                    ? "border-foreground/30 bg-foreground text-background"
                    : "border-border bg-card text-foreground hover:border-foreground/20 hover:bg-accent"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {testResult && (
          <p
            className={cn(
              "rounded-lg border px-3 py-2 text-[12.5px] leading-relaxed",
              testResult.ok
                ? "border-emerald-600/30 bg-emerald-600/8 text-emerald-700 dark:text-emerald-400"
                : "border-destructive/30 bg-destructive/8 text-destructive"
            )}
          >
            {testResult.ok ? "✓ " : "✗ "}
            {testResult.text}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save settings
          </button>
          <button
            type="button"
            onClick={test}
            disabled={testing}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-[13px] font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {testing ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
            Save & test
          </button>
        </div>

        <p className="text-[11.5px] leading-relaxed text-muted-foreground">
          The key is stored in the database and only used server-side — user-facing
          pages just see “AI helper on/off”. Turning the agent off hides every trace
          of it; nothing user-facing breaks.
        </p>
      </div>
    </section>
  );
}
