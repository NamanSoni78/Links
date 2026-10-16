"use client";

/**
 * Links — "make a widget with AI", two ways:
 *
 *  Chat  — talk to the site's own agent (admin-configured, any
 *          OpenAI-compatible provider). It interviews you, then emits
 *          a widget JSON that becomes a live preview + one-tap create.
 *  Paste — copy our interview prompt into ANY AI (ChatGPT, Claude,
 *          Gemini…), then paste its answer here. Same JSON contract,
 *          same preview, same one tap.
 *
 * Either way the imported data flows through normalizeWidgetData()
 * server-side, so nothing invalid can be stored.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ClipboardPaste, Copy, Loader2, MessageSquare, Plus, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WidgetCard, WidgetAnimationStyles } from "@/components/widgets/widget-card";
import { normalizeWidgetData, type WidgetData, type WidgetProfileContext } from "@/lib/widgets";
import { buildExternalPrompt, parseWidgetImport } from "@/lib/widgets-ai";
import { cn } from "@/lib/utils";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

interface Draft {
  name: string;
  data: WidgetData;
}

function DraftPreview({ draft, profile }: { draft: Draft; profile: WidgetProfileContext }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-center rounded-xl border border-border bg-muted/40 p-4">
        <WidgetCard data={draft.data} profile={profile} className="shadow-sm" />
      </div>
      <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
        This is exactly what visitors will see. Create it and tweak anything —
        colors, fonts, blocks — in the editor.
      </p>
    </div>
  );
}

export function AiCreateDialog({
  open,
  onOpenChange,
  profile,
  full,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profile: WidgetProfileContext;
  /** the per-user cap, to warn before hitting it */
  full: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"chat" | "paste">("chat");

  /* ── chat state ── */
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* ── paste state ── */
  const [pasted, setPasted] = useState("");
  const [pasteDraft, setPasteDraft] = useState<Draft | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);

  const origin = useMemo(() => (typeof window === "undefined" ? "" : window.location.origin), []);
  const externalPrompt = useMemo(
    () => (origin ? buildExternalPrompt(profile, origin) : ""),
    [profile, origin]
  );

  // auto-scroll the chat
  useEffect(() => {
    if (tab === "chat" && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, tab, draft, sending]);

  // reset when reopened
  useEffect(() => {
    if (open) return;
    setDraft(null);
    setPasteDraft(null);
    setPasted("");
    setPasteError(null);
  }, [open]);

  const create = async (d: Draft) => {
    if (full) {
      toast.error("You're at the widget limit — delete one first.");
      return;
    }
    setCreating(true);
    try {
      const r = await fetch("/api/widgets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: d.name, data: d.data }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Couldn't create the widget");
      toast("Widget created", { description: "Tweak anything in the editor." });
      onOpenChange(false);
      router.push(`/widgets/${j.widget.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create the widget");
      setCreating(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");

    const history = [...messages, { role: "user" as const, content: text }];
    setMessages(history);
    setSending(true);
    setDraft(null);
    try {
      const r = await fetch("/api/widgets/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "The agent didn't answer");
      const reply: string = j.reply;
      setMessages((m) => [...m, { role: "assistant", content: reply }]);

      const parsed = parseWidgetImport(reply);
      if (parsed) {
        setDraft({
          name: parsed.name?.slice(0, 60) || "AI widget",
          data: normalizeWidgetData(parsed.data),
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The agent didn't answer");
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "_(network hiccup — try sending that again)_" },
      ]);
    } finally {
      setSending(false);
    }
  };

  const tryPaste = () => {
    setPasteError(null);
    setPasteDraft(null);
    const parsed = parseWidgetImport(pasted);
    if (!parsed) {
      setPasteError("Couldn't find widget JSON in that text — paste the AI's full answer, code block included.");
      return;
    }
    setPasteDraft({
      name: parsed.name?.slice(0, 60) || "AI widget",
      data: normalizeWidgetData(parsed.data),
    });
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(externalPrompt);
      toast.success("Prompt copied — paste it into any AI, then bring the JSON back here.");
    } catch {
      toast.error("Couldn't copy — select the text and copy manually.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand" />
            New widget with AI
          </DialogTitle>
          <DialogDescription>
            Describe what you want — the AI interviews you, designs it, and you
            create it in one tap. Or use any AI you like and paste the result.
          </DialogDescription>
        </DialogHeader>

        {/* tabs */}
        <div role="tablist" aria-label="AI creation modes" className="mt-3 flex gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
          {(
            [
              { key: "chat", label: "Chat with our AI", icon: MessageSquare },
              { key: "paste", label: "Use any AI", icon: ClipboardPaste },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[6px] text-[12.5px] font-medium transition-colors",
                tab === t.key ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "chat" ? (
          <div className="mt-3 space-y-3">
            <div
              ref={listRef}
              className="max-h-72 space-y-2.5 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3"
            >
              {messages.length === 0 && !sending && (
                <div className="py-6 text-center">
                  <p className="text-[13px] text-muted-foreground">
                    Try: <span className="font-medium text-foreground">“a terminal-style card listing all my sites, with my email”</span>
                  </p>
                  <p className="mt-1.5 text-[12px] text-muted-foreground/70">
                    The agent knows your page — links, descriptions, contacts — and will
                    ask a couple of questions before designing.
                  </p>
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap break-words",
                    m.role === "user"
                      ? "ml-auto bg-foreground text-background"
                      : "mr-auto border border-border bg-card text-foreground"
                  )}
                >
                  {m.content.length > 2200 ? m.content.slice(0, 2200) + "…" : m.content}
                </div>
              ))}
              {sending && (
                <div className="mr-auto flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[13px] text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  thinking…
                </div>
              )}
            </div>

            {draft && (
              <div className="space-y-3 rounded-xl border border-brand/30 bg-brand/5 p-3">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
                  Live preview
                </p>
                <DraftPreview draft={draft} profile={profile} />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDraft(null)}>
                    Keep chatting
                  </Button>
                  <Button size="sm" onClick={() => create(draft)} disabled={creating || full}>
                    {creating ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                    Create widget
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <textarea
                value={input}
                rows={2}
                onChange={(e) => setInput(e.target.value.slice(0, 2000))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Describe your widget… (Enter to send, Shift+Enter for a new line)"
                aria-label="Message the widget agent"
                className="min-h-[52px] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-[3px] focus:ring-ring/20"
              />
              <Button onClick={send} disabled={sending || !input.trim()} className="size-[52px] shrink-0 rounded-xl p-0" aria-label="Send">
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[12.5px] font-medium text-foreground">1 · Copy this prompt</p>
                <button
                  type="button"
                  onClick={copyPrompt}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Copy className="size-3.5" />
                  Copy prompt
                </button>
              </div>
              <pre className="max-h-44 overflow-y-auto rounded-xl border border-border bg-muted/50 p-3 font-mono text-[10.5px] leading-relaxed text-foreground whitespace-pre-wrap break-words">
                {externalPrompt || "…"}
              </pre>
            </div>

            <div>
              <p className="mb-1.5 text-[12.5px] font-medium text-foreground">
                2 · Paste the AI&apos;s answer here
              </p>
              <textarea
                value={pasted}
                rows={5}
                onChange={(e) => setPasted(e.target.value)}
                placeholder='Its full reply, including the ```json code block…'
                aria-label="Paste the AI answer"
                className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-[12px] leading-relaxed outline-none transition-colors placeholder:font-sans placeholder:text-muted-foreground/50 focus:border-ring focus:ring-[3px] focus:ring-ring/20"
              />
              {pasteError && (
                <p className="mt-1.5 text-[12px] text-destructive" role="alert">
                  {pasteError}
                </p>
              )}
              <Button variant="outline" size="sm" className="mt-2" onClick={tryPaste} disabled={!pasted.trim()}>
                <Check className="size-3.5" />
                Preview it
              </Button>
            </div>

            {pasteDraft && (
              <div className="space-y-3 rounded-xl border border-brand/30 bg-brand/5 p-3">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
                  Live preview
                </p>
                <DraftPreview draft={pasteDraft} profile={profile} />
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => create(pasteDraft)} disabled={creating || full}>
                    {creating ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                    Create widget
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
