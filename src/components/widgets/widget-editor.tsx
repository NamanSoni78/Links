"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Blocks,
  Check,
  Copy,
  Layers,
  Link2,
  Loader2,
  Mail,
  Palette,
  Plus,
  RefreshCw,
  Share2,
  Trash2,
  Type,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WidgetCard, WidgetAnimationStyles } from "@/components/widgets/widget-card";
import { EmbedPanel } from "@/components/widgets/embed-panel";
import {
  ColorField,
  FieldLabel,
  RangeField,
  Section,
  Segmented,
  Toggle,
  ToggleRow,
} from "@/components/widgets/widget-controls";
import {
  contrastRatio,
  effectiveBg,
  safeWidgetUrl,
  validateWidgetSlug,
  WIDGET_FONTS,
  WIDGET_LIMITS,
  WIDGET_PRESETS,
  WIDGET_TEXT_ANIMATIONS,
  type BlockKind,
  type WidgetData,
  type WidgetProfileContext,
  type WidgetTextBlock,
} from "@/lib/widgets";
import type { WidgetItem } from "@/lib/widgets-db";
import { cn } from "@/lib/utils";

type SaveStatus = "saved" | "dirty" | "saving" | "error";

const BLOCK_META: Record<BlockKind, { label: string; hint: string }> = {
  text: { label: "Text", hint: "lines with their own animations — typing included" },
  sites: { label: "My sites", hint: "your page's links with favicons + mini descriptions" },
  contacts: { label: "Contacts", hint: "emails, phones and links from your page" },
};

function newTextBlock(): WidgetTextBlock {
  return {
    id: Math.random().toString(36).slice(2, 8),
    text: "",
    size: 15,
    bold: false,
    animation: "typing",
    delayMs: 400,
    speedMs: 70,
    loop: true,
  };
}

/**
 * The widget builder — content, blocks, design, typography and motion
 * on the left; a true WYSIWYG preview plus embed snippets on the right.
 * Everything autosaves (debounced), ⌘S flushes immediately.
 */
export function WidgetEditor({
  initial,
  origin,
  username,
  profile,
}: {
  initial: WidgetItem;
  origin: string;
  username: string | null;
  profile: WidgetProfileContext;
}) {
  const router = useRouter();

  const [name, setName] = useState(initial.name);
  const [data, setData] = useState<WidgetData>(initial.data);
  const [slug, setSlug] = useState(initial.slug);
  const [saved, setSaved] = useState({
    name: initial.name,
    data: initial.data,
    slug: initial.slug,
    updatedAt: initial.updatedAt,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [slugState, setSlugState] = useState<{ status: "idle" | "checking" | "ok" | "error"; message?: string }>({
    status: "idle",
  });
  const [animNonce, setAnimNonce] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const slugSavable = slugState.status === "ok" && slug !== saved.slug;
  const payloadSlug = slugSavable ? slug : saved.slug;

  const dirtyKey = useMemo(() => JSON.stringify([name, data, payloadSlug]), [name, data, payloadSlug]);
  const savedKey = useMemo(() => JSON.stringify([saved.name, saved.data, saved.slug]), [saved]);
  const dirty = dirtyKey !== savedKey;
  const status: SaveStatus = saving ? "saving" : saveError ? "error" : dirty ? "dirty" : "saved";

  /* ── live slug availability ── */
  useEffect(() => {
    if (slug === saved.slug) {
      setSlugState({ status: "idle" });
      return;
    }
    const verdict = validateWidgetSlug(slug);
    if (!verdict.valid) {
      setSlugState({ status: "error", message: verdict.message });
      return;
    }
    setSlugState({ status: "checking" });
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/widgets/slug-check?slug=${encodeURIComponent(slug)}&id=${initial.id}`);
        const j = await r.json();
        setSlugState(
          j.available
            ? { status: "ok" }
            : { status: "error", message: j.message ?? "That link is taken." }
        );
      } catch {
        setSlugState({ status: "error", message: "Couldn't check — check your connection." });
      }
    }, 420);
    return () => clearTimeout(t);
  }, [slug, saved.slug, initial.id]);

  /* ── debounced autosave ── */
  const stateRef = useRef({ name, data, payloadSlug, dirty });
  stateRef.current = { name, data, payloadSlug, dirty };

  const save = useCallback(async () => {
    const s = stateRef.current;
    setSaving(true);
    setSaveError(null);
    try {
      const r = await fetch(`/api/widgets/${initial.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: s.name, slug: s.payloadSlug, data: s.data }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Save failed");
      setSaved({ name: j.widget.name, data: j.widget.data, slug: j.widget.slug, updatedAt: j.widget.updatedAt });
      if (j.widget.slug !== s.payloadSlug) setSlug(j.widget.slug);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
      toast.error("Couldn't save — changes are kept here, retrying on your next edit.");
    } finally {
      setSaving(false);
    }
  }, [initial.id]);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => void save(), 750);
    return () => clearTimeout(t);
  }, [dirtyKey, dirty, save]);

  /* flush pending changes when navigating away */
  useEffect(() => {
    return () => {
      const s = stateRef.current;
      if (!s.dirty) return;
      void fetch(`/api/widgets/${initial.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: s.name, slug: s.payloadSlug, data: s.data }),
        keepalive: true,
      }).catch(() => {});
    };
  }, [initial.id]);

  /* ⌘S saves immediately */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (stateRef.current.dirty) void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  /* ── actions ── */
  const applyPreset = (key: string) => {
    const preset = WIDGET_PRESETS.find((p) => p.key === key);
    if (!preset) return;
    setData((d) => ({ ...preset.data, content: d.content, blocks: d.blocks }));
    setAnimNonce((n) => n + 1);
    toast(`“${preset.label}” applied`, { description: "Your text and blocks stayed — only the look changed." });
  };

  const duplicate = async () => {
    setDuplicating(true);
    try {
      const r = await fetch(`/api/widgets/${initial.id}/duplicate`, { method: "POST" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Couldn't duplicate");
      toast("Copy created");
      router.push(`/widgets/${j.widget.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't duplicate");
      setDuplicating(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const r = await fetch(`/api/widgets/${initial.id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Couldn't delete");
      toast("Widget deleted");
      router.push("/widgets");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete");
      setDeleting(false);
    }
  };

  /* ── tiny helpers for form fields ── */
  const setContent = (patch: Partial<WidgetData["content"]>) =>
    setData((d) => ({ ...d, content: { ...d.content, ...patch } }));
  const setStyle = (patch: Partial<WidgetData["style"]>) =>
    setData((d) => ({ ...d, style: { ...d.style, ...patch } }));
  const setType = (patch: Partial<WidgetData["typography"]>) =>
    setData((d) => ({ ...d, typography: { ...d.typography, ...patch } }));

  const setBlocks = (patch: Partial<WidgetData["blocks"]>) =>
    setData((d) => ({ ...d, blocks: { ...d.blocks, ...patch } }));

  const toggleBlock = (kind: BlockKind) =>
    setBlocks({
      order: data.blocks.order.includes(kind)
        ? data.blocks.order.filter((k) => k !== kind)
        : [...data.blocks.order, kind],
    });

  const moveBlock = (kind: BlockKind, dir: -1 | 1) => {
    const order = [...data.blocks.order];
    const i = order.indexOf(kind);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    setBlocks({ order });
  };

  const updateText = (id: string, patch: Partial<WidgetTextBlock>) =>
    setBlocks({ texts: data.blocks.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)) });

  const addText = () => {
    if (data.blocks.texts.length >= WIDGET_LIMITS.textsMax) {
      toast.error(`Up to ${WIDGET_LIMITS.textsMax} text blocks.`);
      return;
    }
    if (!data.blocks.order.includes("text")) {
      setBlocks({ texts: [...data.blocks.texts, newTextBlock()], order: [...data.blocks.order, "text"] });
    } else {
      setBlocks({ texts: [...data.blocks.texts, newTextBlock()] });
    }
  };

  const removeText = (id: string) =>
    setBlocks({ texts: data.blocks.texts.filter((t) => t.id !== id) });

  const lowContrast = contrastRatio(data.style.textColor, effectiveBg(data.style)) < 3;
  const titleLeft = WIDGET_LIMITS.titleMax - data.content.title.length;
  const messageLeft = WIDGET_LIMITS.messageMax - data.content.message.length;

  const siteCount = data.blocks.sites.limit > 0 ? data.blocks.sites.limit : profile.sites.length;
  const contactCount = data.blocks.contacts.limit > 0 ? data.blocks.contacts.limit : profile.contacts.length;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <WidgetAnimationStyles />

      {/* ── header ── */}
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2.5">
        <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
          <Link href="/widgets">
            <ArrowLeft className="size-4" />
            Widgets
          </Link>
        </Button>

        <span aria-hidden className="hidden h-4 w-px bg-border sm:block" />

        <div className="min-w-[180px] flex-1 basis-52">
          <label htmlFor="widget-name" className="sr-only">
            Widget name
          </label>
          <input
            id="widget-name"
            value={name}
            maxLength={WIDGET_LIMITS.nameMax}
            onChange={(e) => setName(e.target.value)}
            placeholder="Widget name"
            className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-[17px] font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 hover:border-border focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
        </div>

        <span
          aria-live="polite"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium",
            status === "saved" && "text-muted-foreground",
            status === "dirty" && "bg-muted text-muted-foreground",
            status === "saving" && "bg-muted text-muted-foreground",
            status === "error" && "bg-destructive/10 text-destructive"
          )}
        >
          {status === "saving" || (status === "dirty" && saving) ? (
            <Loader2 className="size-3 animate-spin" />
          ) : status === "saved" ? (
            <Check className="size-3" />
          ) : status === "error" ? (
            <button onClick={() => void save()} className="inline-flex items-center gap-1.5">
              <RefreshCw className="size-3" /> Retry
            </button>
          ) : null}
          {status === "saved" ? "Saved" : status === "saving" ? "Saving…" : status === "error" ? "" : "Unsaved"}
        </span>

        <Button variant="outline" size="sm" onClick={duplicate} disabled={duplicating}>
          {duplicating ? <Loader2 className="size-3.5 animate-spin" /> : <Copy className="size-3.5" />}
          Duplicate
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="size-3.5" />
          Delete
        </Button>
      </div>

      {/* ── body: controls | preview ── */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
        {/* controls */}
        <div className="order-2 min-w-0 lg:order-1">
          <Section title="Start from a look" icon={<Palette className="size-3.5" />}>
            <div className="flex flex-wrap gap-2">
              {WIDGET_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p.key)}
                  title={p.hint}
                  className="group rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:border-foreground/25 hover:bg-accent"
                >
                  <span className="block text-[12.5px] font-medium text-foreground">{p.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{p.hint}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Content" icon={<Type className="size-3.5" />}>
            <div>
              <FieldLabel htmlFor="w-image" hint="square, PNG or SVG URL">
                Image
              </FieldLabel>
              <Input
                id="w-image"
                type="url"
                inputMode="url"
                placeholder="https://…/logo.png (optional)"
                value={data.content.imageUrl}
                onChange={(e) => setContent({ imageUrl: e.target.value.trim() })}
                aria-invalid={!!data.content.imageUrl && !safeWidgetUrl(data.content.imageUrl)}
              />
              {!!data.content.imageUrl && !safeWidgetUrl(data.content.imageUrl) && (
                <p className="mt-1.5 text-[11.5px] text-destructive">
                  Only https:// image links work inside embeds.
                </p>
              )}
              {safeWidgetUrl(data.content.imageUrl) && (
                <div className="mt-2.5">
                  <Segmented
                    ariaLabel="Image shape"
                    value={data.content.imageShape}
                    onChange={(v) => setContent({ imageShape: v })}
                    options={[
                      { value: "circle", label: "Circle" },
                      { value: "rounded", label: "Rounded" },
                      { value: "square", label: "Square" },
                    ]}
                  />
                </div>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="w-title" hint={`${titleLeft} left`}>
                Title
              </FieldLabel>
              <textarea
                id="w-title"
                rows={1}
                value={data.content.title}
                maxLength={WIDGET_LIMITS.titleMax}
                onChange={(e) => setContent({ title: e.target.value })}
                placeholder="Your name, product, anything"
                className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[box-shadow] outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              />
            </div>

            <div>
              <FieldLabel htmlFor="w-message" hint={`${messageLeft} left`}>
                Message
              </FieldLabel>
              <textarea
                id="w-message"
                rows={3}
                value={data.content.message}
                maxLength={WIDGET_LIMITS.messageMax}
                onChange={(e) => setContent({ message: e.target.value })}
                placeholder="A line or two of context"
                className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[box-shadow] outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="w-link-label">Button text</FieldLabel>
                <Input
                  id="w-link-label"
                  value={data.content.linkLabel}
                  maxLength={WIDGET_LIMITS.linkLabelMax}
                  onChange={(e) => setContent({ linkLabel: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <FieldLabel htmlFor="w-link-url" hint="https only">
                  Button link
                </FieldLabel>
                <Input
                  id="w-link-url"
                  type="url"
                  inputMode="url"
                  value={data.content.linkUrl}
                  onChange={(e) => setContent({ linkUrl: e.target.value.trim() })}
                  placeholder="https://…"
                  aria-invalid={!!data.content.linkUrl && !safeWidgetUrl(data.content.linkUrl)}
                />
              </div>
            </div>
            {!!data.content.linkUrl && !safeWidgetUrl(data.content.linkUrl) && (
              <p className="-mt-1 text-[11.5px] text-destructive">
                Buttons need an https:// link (or leave it empty — the pill still shows).
              </p>
            )}
          </Section>

          {/* ── BLOCKS ── */}
          <Section title="Blocks" icon={<Blocks className="size-3.5" />}>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Optional sections under your title — text lines, all your sites, or your
              contacts. Turn them on, then order them however you like.
            </p>

            {/* order strip */}
            <div className="flex flex-col gap-2">
              {(["text", "sites", "contacts"] as const).map((kind) => {
                const meta = BLOCK_META[kind];
                const on = data.blocks.order.includes(kind);
                const pos = data.blocks.order.indexOf(kind);
                return (
                  <div
                    key={kind}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                      on ? "border-foreground/20 bg-card" : "border-border bg-muted/30"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                        {kind === "text" ? <Type className="size-3.5 text-muted-foreground" /> : kind === "sites" ? <Layers className="size-3.5 text-muted-foreground" /> : <Mail className="size-3.5 text-muted-foreground" />}
                        {meta.label}
                        {on && data.blocks.order.length > 1 && (
                          <span className="rounded-full bg-muted px-1.5 py-px font-mono text-[10px] text-muted-foreground">
                            #{pos + 1}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                        {kind === "sites" && on
                          ? `${siteCount} site${siteCount === 1 ? "" : "s"} from your page`
                          : kind === "contacts" && on
                            ? `${contactCount} contact${contactCount === 1 ? "" : "s"} from your page`
                            : meta.hint}
                      </p>
                    </div>
                    {on && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          aria-label={`Move ${meta.label} earlier`}
                          disabled={pos <= 0}
                          onClick={() => moveBlock(kind, -1)}
                          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowUp className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${meta.label} later`}
                          disabled={pos === data.blocks.order.length - 1}
                          onClick={() => moveBlock(kind, 1)}
                          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowDown className="size-3.5" />
                        </button>
                      </div>
                    )}
                    <Toggle checked={on} onChange={() => toggleBlock(kind)} label={`Show ${meta.label} block`} />
                  </div>
                );
              })}
            </div>

            {/* text block editor */}
            {data.blocks.order.includes("text") && (
              <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
                  Text blocks · {data.blocks.texts.length}/{WIDGET_LIMITS.textsMax}
                </p>
                {data.blocks.texts.map((t, i) => (
                  <div key={t.id} className="space-y-3 rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">#{i + 1}</span>
                      <button
                        type="button"
                        aria-label={`Remove text ${i + 1}`}
                        onClick={() => removeText(t.id)}
                        className="flex size-7 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>

                    <textarea
                      value={t.text}
                      rows={2}
                      maxLength={WIDGET_LIMITS.textMax}
                      onChange={(e) => updateText(t.id, { text: e.target.value })}
                      placeholder="Type something… e.g. currently building: links.namansoni.in"
                      aria-label={`Text block ${i + 1}`}
                      className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <RangeField
                        label="Size"
                        value={t.size}
                        min={WIDGET_LIMITS.textSizeMin}
                        max={WIDGET_LIMITS.textSizeMax}
                        onChange={(v) => updateText(t.id, { size: v })}
                      />
                      <RangeField
                        label="Delay"
                        unit="ms"
                        value={t.delayMs}
                        min={0}
                        max={WIDGET_LIMITS.delayMax}
                        step={100}
                        onChange={(v) => updateText(t.id, { delayMs: v })}
                      />
                    </div>

                    <div>
                      <FieldLabel hint={t.animation === "typing" ? "types itself, cursor and all" : undefined}>
                        Animation
                      </FieldLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {WIDGET_TEXT_ANIMATIONS.map((a) => (
                          <button
                            key={a.key}
                            type="button"
                            onClick={() => updateText(t.id, { animation: a.key })}
                            aria-pressed={t.animation === a.key}
                            className={cn(
                              "rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                              t.animation === a.key
                                ? "border-foreground/30 bg-foreground text-background"
                                : "border-border bg-card text-foreground hover:border-foreground/20 hover:bg-accent"
                            )}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {t.animation === "typing" && (
                      <div className="space-y-3 rounded-lg border border-border/70 bg-muted/30 p-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <FieldLabel>Speed</FieldLabel>
                            <Segmented
                              ariaLabel="Typing speed"
                              value={String(t.speedMs)}
                              onChange={(v) => updateText(t.id, { speedMs: Number(v) })}
                              options={[
                                { value: "110", label: "Slow" },
                                { value: "70", label: "Normal" },
                                { value: "45", label: "Fast" },
                              ]}
                              className="w-full sm:w-48"
                            />
                          </div>
                          <ToggleRow label="Loop" hint="retype forever">
                            <Toggle checked={t.loop} onChange={(v) => updateText(t.id, { loop: v })} label="Loop typing" />
                          </ToggleRow>
                        </div>
                      </div>
                    )}

                    <ToggleRow label="Bold">
                      <Toggle checked={t.bold} onChange={(v) => updateText(t.id, { bold: v })} label="Bold text" />
                    </ToggleRow>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addText}
                  disabled={data.blocks.texts.length >= WIDGET_LIMITS.textsMax}
                  className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card/50 text-[12.5px] font-medium text-muted-foreground transition-all hover:border-ring/50 hover:text-foreground disabled:opacity-50"
                >
                  <Plus className="size-3.5" />
                  Add text
                </button>
              </div>
            )}

            {/* sites settings */}
            {data.blocks.order.includes("sites") && (
              <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
                  Sites block
                </p>
                <ToggleRow label="Show favicons">
                  <Toggle checked={data.blocks.sites.showFavicon} onChange={(v) => setBlocks({ sites: { ...data.blocks.sites, showFavicon: v } })} label="Show favicons" />
                </ToggleRow>
                <ToggleRow label="Show mini descriptions" hint="the ≤50-char lines from your page">
                  <Toggle checked={data.blocks.sites.showDesc} onChange={(v) => setBlocks({ sites: { ...data.blocks.sites, showDesc: v } })} label="Show descriptions" />
                </ToggleRow>
                <div>
                  <FieldLabel hint="keeps the card tidy">How many</FieldLabel>
                  <Segmented
                    ariaLabel="Sites limit"
                    value={String(data.blocks.sites.limit)}
                    onChange={(v) => setBlocks({ sites: { ...data.blocks.sites, limit: Number(v) } })}
                    options={[
                      { value: "0", label: "All" },
                      { value: "3", label: "3" },
                      { value: "5", label: "5" },
                      { value: "8", label: "8" },
                    ]}
                    className="w-full sm:w-64"
                  />
                </div>
                {profile.sites.length === 0 && (
                  <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                    You have no links yet — add some on the Page editor and they&apos;ll flow in here.
                  </p>
                )}
              </div>
            )}

            {/* contacts settings */}
            {data.blocks.order.includes("contacts") && (
              <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
                  Contacts block
                </p>
                <ToggleRow label="Show icons">
                  <Toggle checked={data.blocks.contacts.showIcon} onChange={(v) => setBlocks({ contacts: { ...data.blocks.contacts, showIcon: v } })} label="Show icons" />
                </ToggleRow>
                <div>
                  <FieldLabel>How many</FieldLabel>
                  <Segmented
                    ariaLabel="Contacts limit"
                    value={String(data.blocks.contacts.limit)}
                    onChange={(v) => setBlocks({ contacts: { ...data.blocks.contacts, limit: Number(v) } })}
                    options={[
                      { value: "0", label: "All" },
                      { value: "2", label: "2" },
                      { value: "4", label: "4" },
                    ]}
                    className="w-full sm:w-56"
                  />
                </div>
                {profile.contacts.length === 0 && (
                  <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                    No contacts on your page yet — add them in the Page editor&apos;s Contact box.
                  </p>
                )}
              </div>
            )}
          </Section>

          <Section title="Design" icon={<Palette className="size-3.5" />}>
            <div>
              <FieldLabel>Background</FieldLabel>
              <Segmented
                ariaLabel="Background style"
                value={data.style.bgMode}
                onChange={(v) => setStyle({ bgMode: v })}
                options={[
                  { value: "solid", label: "Solid" },
                  { value: "gradient", label: "Gradient" },
                ]}
                className="w-full sm:w-56"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ColorField label={data.style.bgMode === "gradient" ? "From" : "Background"} value={data.style.bgColor} onChange={(v) => setStyle({ bgColor: v })} />
              {data.style.bgMode === "gradient" && (
                <ColorField label="To" value={data.style.bgColor2} onChange={(v) => setStyle({ bgColor2: v })} />
              )}
              <ColorField label="Text" value={data.style.textColor} onChange={(v) => setStyle({ textColor: v })} />
              <ColorField label="Button" value={data.style.accentColor} onChange={(v) => setStyle({ accentColor: v })} />
              <ColorField label="Border" value={data.style.borderColor} onChange={(v) => setStyle({ borderColor: v })} />
            </div>

            {data.style.bgMode === "gradient" && (
              <RangeField
                label="Gradient angle"
                unit="°"
                value={data.style.gradientAngle}
                min={0}
                max={360}
                step={5}
                onChange={(v) => setStyle({ gradientAngle: v })}
              />
            )}

            <RangeField label="Corner radius" value={data.style.radius} min={WIDGET_LIMITS.radiusMin} max={WIDGET_LIMITS.radiusMax} onChange={(v) => setStyle({ radius: v })} />

            <div>
              <FieldLabel>Border width</FieldLabel>
              <Segmented
                ariaLabel="Border width"
                value={String(data.style.borderWidth)}
                onChange={(v) => setStyle({ borderWidth: Number(v) })}
                options={[
                  { value: "0", label: "None" },
                  { value: "1", label: "Thin" },
                  { value: "2", label: "Medium" },
                  { value: "3", label: "Thick" },
                ]}
                className="w-full sm:w-72"
              />
            </div>

            <ToggleRow label="Drop shadow" hint="Soft depth under the card">
              <Toggle checked={data.style.shadow} onChange={(v) => setStyle({ shadow: v })} label="Drop shadow" />
            </ToggleRow>

            {lowContrast && (
              <p className="rounded-lg border border-amber-600/25 bg-amber-500/10 px-3 py-2 text-[12px] leading-relaxed text-amber-700 dark:text-amber-400">
                Heads up — your text and background are close in tone. Readers on bright
                screens may struggle; nudge one of them for clarity.
              </p>
            )}
          </Section>

          <Section title="Typography" icon={<Type className="size-3.5" />}>
            <div>
              <FieldLabel hint="system fonts — they render everywhere, even inside SVG images">Font</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {WIDGET_FONTS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setType({ font: f.key })}
                    aria-pressed={data.typography.font === f.key}
                    style={{ fontFamily: f.stack }}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-[13px] transition-colors",
                      data.typography.font === f.key
                        ? "border-foreground/30 bg-foreground text-background"
                        : "border-border bg-card text-foreground hover:border-foreground/20 hover:bg-accent"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <RangeField label="Title size" value={data.typography.titleSize} min={WIDGET_LIMITS.titleSizeMin} max={WIDGET_LIMITS.titleSizeMax} onChange={(v) => setType({ titleSize: v })} />
              <RangeField label="Message size" value={data.typography.messageSize} min={WIDGET_LIMITS.messageSizeMin} max={WIDGET_LIMITS.messageSizeMax} onChange={(v) => setType({ messageSize: v })} />
            </div>

            <ToggleRow label="Bold title">
              <Toggle checked={data.typography.bold} onChange={(v) => setType({ bold: v })} label="Bold title" />
            </ToggleRow>
            <ToggleRow label="Uppercase title">
              <Toggle checked={data.typography.uppercase} onChange={(v) => setType({ uppercase: v })} label="Uppercase title" />
            </ToggleRow>

            <div>
              <FieldLabel>Alignment</FieldLabel>
              <Segmented
                ariaLabel="Alignment"
                value={data.typography.align}
                onChange={(v) => setType({ align: v })}
                options={[
                  { value: "left", label: "Left" },
                  { value: "center", label: "Center" },
                ]}
                className="w-full sm:w-44"
              />
            </div>
          </Section>

          <Section title="Motion" icon={<Wand2 className="size-3.5" />}>
            <div>
              <FieldLabel hint="gentle — respects reduced-motion settings">Card animation</FieldLabel>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                {(["none", "fade", "rise", "pop", "float", "pulse"] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => {
                      setData((d) => ({ ...d, animation: a }));
                      setAnimNonce((n) => n + 1);
                    }}
                    aria-pressed={data.animation === a}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-[12px] font-medium capitalize transition-colors",
                      data.animation === a
                        ? "border-foreground/30 bg-foreground text-background"
                        : "border-border bg-card text-foreground hover:border-foreground/20 hover:bg-accent"
                    )}
                  >
                    {a === "none" ? "None" : a === "rise" ? "Rise" : a}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
                For per-line animations — typing included — use the Text blocks above.
              </p>
            </div>
          </Section>

          <Section title="Widget link" icon={<Share2 className="size-3.5" />}>
            <div>
              <FieldLabel htmlFor="w-slug" hint={`/${username ?? "you"}/…`}>
                Public link
              </FieldLabel>
              <div
                className={cn(
                  "flex h-9 items-center overflow-hidden rounded-md border bg-transparent shadow-xs transition-[box-shadow] focus-within:ring-[3px]",
                  slugState.status === "error"
                    ? "border-destructive focus-within:ring-destructive/25"
                    : slugState.status === "ok"
                      ? "border-emerald-600/40 focus-within:ring-emerald-600/20"
                      : "border-input focus-within:ring-ring/50"
                )}
              >
                <span className="border-r border-border bg-muted/50 px-2.5 py-2 font-mono text-[12px] text-muted-foreground">
                  /{username ?? "you"}/
                </span>
                <input
                  id="w-slug"
                  value={slug}
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(e) => setSlug(e.target.value.toLowerCase().trim())}
                  className="h-full min-w-0 flex-1 bg-transparent px-2.5 font-mono text-[13px] text-foreground outline-none"
                />
                {slugState.status === "checking" && <Loader2 className="mr-2.5 size-3.5 shrink-0 animate-spin text-muted-foreground" />}
                {slugState.status === "ok" && <Check className="mr-2.5 size-3.5 shrink-0 text-emerald-600" />}
              </div>
              <p
                className={cn(
                  "mt-1.5 text-[11.5px]",
                  slugState.status === "error" ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {slugState.status === "error"
                  ? slugState.message
                  : slugState.status === "ok"
                    ? "Free — updates with your next save. Old embed links keep working for a day."
                    : slug !== saved.slug
                      ? "Checking…"
                      : "Anyone can view the widget at this link. If a name is taken we suggest name-1."}
              </p>
            </div>
          </Section>
        </div>

        {/* preview + embed */}
        <div className="order-1 min-w-0 lg:order-2">
          <div className="lg:sticky lg:top-8 space-y-5">
            <div
              className="flex min-h-[240px] items-center justify-center rounded-2xl border border-border p-5"
              style={{
                backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
            >
              <WidgetCard key={`${data.animation}-${animNonce}`} data={data} profile={profile} className="shadow-lg" />
            </div>

            <EmbedPanel
              slug={saved.slug}
              name={saved.name}
              updatedAt={saved.updatedAt}
              dirty={dirty || slugSavable}
              origin={origin}
              username={username}
            />

            <a
              href={username ? `/${username}/${saved.slug}` : "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-accent"
            >
              Open the live page
              <span aria-hidden>↗</span>
            </a>
          </div>
        </div>
      </div>

      {/* ── delete confirm ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete “{saved.name}”?</DialogTitle>
            <DialogDescription>
              The widget and its embed links stop working everywhere it&apos;s posted.
              GitHub READMEs will show a quiet “unavailable” card. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={remove} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete widget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
