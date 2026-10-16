"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FaviconImg } from "@/components/favicon-img";
import { IconUploadButton } from "@/components/editor/icon-upload-button";
import { normalizeUrlInput, titleFromUrl } from "@/lib/url";
import { LIMITS } from "@/lib/limits";
import { cn } from "@/lib/utils";

export interface EditorLink {
  key: string;
  id: string; // existing id ("" for new)
  url: string;
  title: string;
  desc: string;
  favicon: string;
}

/**
 * The links list — add, edit (with live favicon), reorder by drag or
 * arrow buttons, remove with undo.
 */
export function LinksEditor({
  links,
  onChange,
}: {
  links: EditorLink[];
  onChange: (links: EditorLink[]) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const addLink = () => {
    if (links.length >= LIMITS.linksMax) {
      toast.error(`That's the limit — ${LIMITS.linksMax} links per page.`);
      return;
    }
    onChange([
      ...links,
      {
        key: `n${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        id: "",
        url: "",
        title: "",
        desc: "",
        favicon: "",
      },
    ]);
  };

  const update = (key: string, patch: Partial<EditorLink>) => {
    onChange(
      links.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        // Auto-title from the host when the URL becomes valid and no title typed yet
        if (patch.url !== undefined) {
          const normalized = normalizeUrlInput(patch.url);
          if (normalized && !(next.title || "").trim()) {
            next.title = titleFromUrl(normalized);
          }
        }
        return next;
      })
    );
  };

  const remove = (index: number) => {
    const removed = links[index];
    const next = links.filter((_, i) => i !== index);
    onChange(next);
    toast("Link removed", {
      action: {
        label: "Undo",
        onClick: () => onChange(next.slice(0, index).concat(removed, next.slice(index))),
      },
      duration: 6000,
    });
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= links.length) return;
    const next = [...links];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div>
      <div className="space-y-2.5">
        {links.map((link, i) => {
          const urlError =
            link.url.trim() && !normalizeUrlInput(link.url) ? "That URL doesn't look right." : "";

          return (
            <div
              key={link.key}
              draggable
              onDragStart={(e) => {
                setDragIndex(i);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverIndex(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null && dragIndex !== i) move(dragIndex, i);
                setDragIndex(null);
                setDragOverIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setDragOverIndex(null);
              }}
              className={cn(
                "group flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 transition-all sm:flex-nowrap sm:gap-2.5",
                dragOverIndex === i && dragIndex !== null
                  ? "border-brand/70 ring-[3px] ring-ring/15"
                  : "border-border",
                link.url.trim() && urlError ? "border-destructive/50" : ""
              )}
            >
              {/* drag handle */}
              <GripVertical
                className="size-4 shrink-0 cursor-grab text-muted-foreground/50 transition-colors group-hover:text-muted-foreground active:cursor-grabbing"
                aria-hidden="true"
              />

              {/* move arrows — desktop */}
              <div className="hidden shrink-0 flex-col sm:flex">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                  className="text-muted-foreground/60 transition-colors hover:text-foreground disabled:opacity-25"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={i === links.length - 1}
                  onClick={() => move(i, i + 1)}
                  className="text-muted-foreground/60 transition-colors hover:text-foreground disabled:opacity-25"
                >
                  <ChevronDown className="size-3.5" />
                </button>
              </div>

              {/* move arrows — mobile */}
              <div className="flex shrink-0 flex-col sm:hidden">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                  className="text-muted-foreground disabled:opacity-30"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={i === links.length - 1}
                  onClick={() => move(i, i + 1)}
                  className="text-muted-foreground disabled:opacity-30"
                >
                  <ChevronDown className="size-3.5" />
                </button>
              </div>

              {/* favicon — click to upload a custom one */}
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
                <IconUploadButton
                  icon={link.favicon}
                  onChange={(v) => update(link.key, { favicon: v })}
                  ariaLabel={`Custom icon for link ${i + 1}`}
                  fallback={<FaviconImg url={normalizeUrlInput(link.url) ?? link.url} size={16} />}
                />
              </div>

              {/* title */}
              <input
                value={link.title}
                onChange={(e) => update(link.key, { title: e.target.value.slice(0, LIMITS.linkTitleMax) })}
                placeholder="Title"
                aria-label={`Link ${i + 1} title`}
                className="h-9 min-w-0 flex-1 basis-[120px] rounded-lg border border-border bg-background px-3 text-[13.5px] outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-[3px] focus:ring-ring/20"
              />

              {/* url — its own full-width line on mobile */}
              <div className="order-last basis-full sm:order-none sm:basis-auto sm:flex-[1.25]">
                <input
                  value={link.url}
                  onChange={(e) => update(link.key, { url: e.target.value })}
                  placeholder="https://…"
                  inputMode="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-label={`Link ${i + 1} URL`}
                  aria-invalid={!!urlError || undefined}
                  className={cn(
                    "h-9 w-full rounded-lg border bg-background px-3 font-mono text-[12.5px] outline-none transition-colors placeholder:font-sans placeholder:text-muted-foreground/50 focus:ring-[3px] focus:ring-ring/20",
                    urlError ? "border-destructive/60 focus:border-destructive" : "border-border focus:border-ring"
                  )}
                />
                {urlError ? (
                  <p className="mt-1 text-[11.5px] text-destructive" role="alert">
                    {urlError}
                  </p>
                ) : (
                  <input
                    value={link.desc}
                    onChange={(e) => update(link.key, { desc: e.target.value.slice(0, LIMITS.linkDescMax) })}
                    placeholder="Mini description (optional) — shows under the link"
                    aria-label={`Link ${i + 1} mini description`}
                    className="mt-1.5 h-8 w-full rounded-lg border border-transparent bg-transparent px-1 text-[12px] text-muted-foreground outline-none transition-colors placeholder:text-muted-foreground/45 focus:border-border focus:bg-background focus:px-3 focus:text-foreground"
                  />
                )}
              </div>

              {/* delete */}
              <button
                type="button"
                aria-label={`Remove link ${i + 1}`}
                onClick={() => remove(i)}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addLink}
        disabled={links.length >= LIMITS.linksMax}
        className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 text-[13.5px] font-medium text-muted-foreground transition-all hover:border-ring/50 hover:bg-muted/60 hover:text-foreground active:scale-[0.99] disabled:opacity-50"
      >
        <Plus className="size-4" />
        Add a link
        <span className="font-mono text-[11px] text-muted-foreground/60">
          {links.length}/{LIMITS.linksMax}
        </span>
      </button>
    </div>
  );
}
