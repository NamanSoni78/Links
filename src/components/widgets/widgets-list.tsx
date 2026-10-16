"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Loader2, Pencil, Plus, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WidgetCard, WidgetAnimationStyles } from "@/components/widgets/widget-card";
import { WIDGET_LIMITS, type WidgetData } from "@/lib/widgets";
import { cn } from "@/lib/utils";

export interface ClientWidget {
  id: string;
  slug: string;
  name: string;
  data: WidgetData;
  updatedAt: number;
}

function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** The dashboard "Widgets" screen — grid of live thumbnails with
 *  create / duplicate / delete, plus a friendly empty state. */
export function WidgetsList({ initial, limit }: { initial: ClientWidget[]; limit: number }) {
  const router = useRouter();
  const [widgets, setWidgets] = useState<ClientWidget[]>(initial);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteFor, setDeleteFor] = useState<ClientWidget | null>(null);

  const count = widgets.length;
  const full = count >= limit;

  const create = async () => {
    if (full) {
      toast.error(`The free plan includes ${limit} widgets — delete one to make room.`);
      return;
    }
    setCreating(true);
    try {
      const r = await fetch("/api/widgets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "My widget" }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Couldn't create the widget");
      router.push(`/widgets/${j.widget.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create the widget");
      setCreating(false);
    }
  };

  const duplicate = async (w: ClientWidget) => {
    setBusyId(w.id);
    try {
      const r = await fetch(`/api/widgets/${w.id}/duplicate`, { method: "POST" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Couldn't duplicate");
      setWidgets((ws) => [{ ...j.widget }, ...ws]);
      toast("Copy created");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't duplicate");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!deleteFor) return;
    const target = deleteFor;
    setBusyId(target.id);
    try {
      const r = await fetch(`/api/widgets/${target.id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Couldn't delete");
      setWidgets((ws) => ws.filter((w) => w.id !== target.id));
      setDeleteFor(null);
      toast("Widget deleted");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <WidgetAnimationStyles />

      {/* header */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Widgets</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {count === 0
              ? "Design once, embed anywhere — GitHub READMEs, portfolios, docs."
              : `${count} of ${limit} used · embeds update automatically when you save`}
          </p>
        </div>
        <Button onClick={create} disabled={creating || full} size="sm">
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          New widget
        </Button>
      </div>

      {count === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/25 px-6 py-14 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-xl border border-border bg-card">
            <Share2 className="size-5 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-[16px] font-semibold text-foreground">Your first widget</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            A little card you design here — text, colors, fonts, an image, even motion —
            then paste into any README or website with one link.
          </p>
          <Button onClick={create} disabled={creating} className="mt-5">
            {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create a widget
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {widgets.map((w) => (
            <li
              key={w.id}
              className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/20"
            >
              <Link
                href={`/widgets/${w.id}`}
                className="block focus-visible:ring-ring/50 rounded-t-xl outline-none focus-visible:ring-[3px]"
                aria-label={`Edit ${w.name}`}
              >
                <div
                  className="relative flex h-[172px] items-start justify-center overflow-hidden border-b border-border/70"
                  style={{
                    backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
                    backgroundSize: "16px 16px",
                  }}
                >
                  <div className="pointer-events-none mt-4 w-[420px] origin-top scale-[0.6]">
                    {/* flatLinks: card sits inside this <Link> — nested <a> would
                        be invalid HTML and break hydration */}
                    <WidgetCard data={w.data} flatLinks />
                  </div>
                </div>
                <div className="px-3.5 py-3">
                  <p className="truncate text-[13.5px] font-medium text-foreground">{w.name}</p>
                  <p className="mt-0.5 truncate font-mono text-[11.5px] text-muted-foreground">
                    /w/{w.slug} ·{" "}
                    {/* relative time differs server/client across second boundaries —
                        suppressHydrationWarning keeps React happy and shows server text */}
                    <time dateTime={new Date(w.updatedAt).toISOString()} suppressHydrationWarning>
                      {timeAgo(w.updatedAt)}
                    </time>
                  </p>
                </div>
              </Link>

              <div className="flex items-center justify-between border-t border-border/70 px-2.5 py-2">
                <a
                  href={`/w/${w.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md px-2 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  View ↗
                </a>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => duplicate(w)}
                    disabled={busyId === w.id}
                    aria-label={`Duplicate ${w.name}`}
                    className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40 sm:size-7"
                  >
                    {busyId === w.id ? <Loader2 className="size-3.5 animate-spin" /> : <Copy className="size-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteFor(w)}
                    aria-label={`Delete ${w.name}`}
                    className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive sm:size-7"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                  <Link
                    href={`/widgets/${w.id}`}
                    aria-label={`Open editor for ${w.name}`}
                    className="ml-1 flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:size-7"
                  >
                    <Pencil className="size-3.5" />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!deleteFor} onOpenChange={(o) => !o && setDeleteFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete “{deleteFor?.name}”?</DialogTitle>
            <DialogDescription>
              Its embeds everywhere switch to a quiet “unavailable” card. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteFor(null)} disabled={busyId === deleteFor?.id}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={remove} disabled={busyId === deleteFor?.id}>
              {busyId === deleteFor?.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete widget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
