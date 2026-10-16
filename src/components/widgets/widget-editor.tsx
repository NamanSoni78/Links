"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  Palette,
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
  type WidgetData,
} from "@/lib/widgets";
import type { WidgetItem } from "@/lib/widgets-db";
import { cn } from "@/lib/utils";

type SaveStatus = "saved" | "dirty" | "saving" | "error";

/**
 * The widget builder — content, design, typography and motion on the
 * left; a true WYSIWYG preview plus embed snippets on the right.
 * Everything autosaves (debounced), ⌘S flushes immediately.
 */
export function WidgetEditor({ initial, origin }: { initial: WidgetItem; origin: string }) {
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
    setData((d) => ({ ...preset.data, content: d.content }));
    setAnimNonce((n) => n + 1);
    toast(`“${preset.label}” applied`, { description: "Your text stayed — only the look changed." });
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

  const lowContrast = contrastRatio(data.style.textColor, effectiveBg(data.style)) < 3;
  const titleLeft = WIDGET_LIMITS.titleMax - data.content.title.length;
  const messageLeft = WIDGET_LIMITS.messageMax - data.content.message.length;

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
        <div className="order-2 lg:order-1">
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
              <FieldLabel hint="gentle — respects reduced-motion settings">Animation</FieldLabel>
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
            </div>
          </Section>

          <Section title="Widget link" icon={<Share2 className="size-3.5" />}>
            <div>
              <FieldLabel htmlFor="w-slug" hint="/w/…">
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
                  /w/
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
                      : "Anyone can view the widget at this link."}
              </p>
            </div>
          </Section>
        </div>

        {/* preview + embed */}
        <div className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-8 space-y-5">
            <div
              className="flex min-h-[240px] items-center justify-center rounded-2xl border border-border p-5"
              style={{
                backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
            >
              <WidgetCard key={`${data.animation}-${animNonce}`} data={data} className="shadow-lg" />
            </div>

            <EmbedPanel slug={saved.slug} name={saved.name} updatedAt={saved.updatedAt} dirty={dirty || slugSavable} origin={origin} />

            <a
              href={`/w/${saved.slug}`}
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
