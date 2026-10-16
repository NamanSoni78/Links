"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { widgetVersion } from "@/lib/widgets";

/**
 * Embed snippets for a saved widget: Markdown (GitHub READMEs),
 * HTML iframe (clickable, interactive), direct image URL, page link.
 * Uses the last-saved slug + version so copied URLs are always live.
 *
 * The size control appends ?width / ?height to the image URL — the
 * default (auto) is the card's natural resolution, aspect ratio is
 * preserved for custom sizes.
 */
const SIZE_MIN = 120;
const SIZE_MAX = 4096;

export function EmbedPanel({
  slug,
  name,
  updatedAt,
  dirty,
  origin,
  username,
}: {
  slug: string;
  name: string;
  updatedAt: number;
  dirty: boolean;
  origin: string;
  username: string | null;
}) {
  const [tab, setTab] = useState<"md" | "html" | "img" | "link">("md");
  const [copied, setCopied] = useState(false);
  const [sizeMode, setSizeMode] = useState<"auto" | "custom">("auto");
  const [w, setW] = useState("");
  const [h, setH] = useState("");

  const v = widgetVersion(updatedAt);
  const userPath = username ?? "you";

  const wNum = Number(w);
  const hNum = Number(h);
  const wValid = w === "" || (Number.isInteger(wNum) && wNum >= SIZE_MIN && wNum <= SIZE_MAX);
  const hValid = h === "" || (Number.isInteger(hNum) && hNum >= SIZE_MIN && hNum <= SIZE_MAX);
  const sizeValid = sizeMode === "auto" || (wValid && hValid && (w !== "" || h !== ""));

  const snippets = useMemo(() => {
    if (!origin) return null;
    const params = new URLSearchParams({ v });
    if (sizeMode === "custom") {
      if (w !== "" && wValid) params.set("width", w);
      if (h !== "" && hValid) params.set("height", h);
    }
    const img = `${origin}/api/embed/${slug}?${params.toString()}`;
    const page = `${origin}/${userPath}/${slug}`;
    const safeName = name.replace(/[[\]]/g, "");
    const customW = sizeMode === "custom" && w !== "" && wValid ? Number(w) : 456;
    return {
      md: `![${safeName}](${img})`,
      html: `<a href="${page}" target="_blank" rel="noopener">\n  <img src="${img}" alt="${safeName}" width="${customW}" />\n</a>\n<!-- interactive version: <iframe src="${page}/embed" width="470" height="380" style="border:0;border-radius:14px" loading="lazy" title="${safeName}"></iframe> -->`,
      img,
      link: page,
    };
  }, [origin, slug, v, name, userPath, sizeMode, w, h, wValid, hValid]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const TABS = [
    { key: "md", label: "Markdown" },
    { key: "html", label: "HTML" },
    { key: "img", label: "Image URL" },
    { key: "link", label: "Page link" },
  ] as const;

  const note: Record<string, string> = {
    md: "Paste into any GitHub README, issue, or forum post — renders as a live image with animations.",
    html: "Use the <img> line in websites & READMEs. For a clickable, interactive card, swap in the iframe from the comment.",
    img: "The raw SVG URL — works anywhere images do (Notion, dev.to, email signatures).",
    link: "A full page with your card centered — handy for link-in-bio pages and DMs.",
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border/70 px-3.5 pt-3 pb-2.5">
        <h3 className="text-[13px] font-semibold text-foreground">Embed anywhere</h3>
        {dirty && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
            saves update these links
          </span>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Embed formats"
        className="flex gap-1 overflow-x-auto px-2.5 pt-2.5 pb-1"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-[12px] font-medium whitespace-nowrap transition-colors",
              tab === t.key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3 p-3 pt-2">
        {/* custom resolution */}
        <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
              <Maximize2 className="size-3" />
              Size
            </span>
            <div className="flex gap-1">
              {(["auto", "custom"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSizeMode(m)}
                  aria-pressed={sizeMode === m}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11.5px] font-medium capitalize transition-colors",
                    sizeMode === m
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            {sizeMode === "custom" && (
              <div className="flex items-center gap-1.5">
                <input
                  value={w}
                  onChange={(e) => setW(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="width"
                  aria-label="Custom width"
                  inputMode="numeric"
                  className={cn(
                    "h-7 w-[74px] rounded-md border bg-card px-2 font-mono text-[11.5px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
                    wValid ? "border-border" : "border-destructive"
                  )}
                />
                <span className="text-[11px] text-muted-foreground">×</span>
                <input
                  value={h}
                  onChange={(e) => setH(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="height"
                  aria-label="Custom height"
                  inputMode="numeric"
                  className={cn(
                    "h-7 w-[74px] rounded-md border bg-card px-2 font-mono text-[11.5px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
                    hValid ? "border-border" : "border-destructive"
                  )}
                />
                <span className="font-mono text-[10px] text-muted-foreground/70">px</span>
              </div>
            )}
          </div>
          {sizeMode === "custom" && (
            <p className={cn("mt-1.5 text-[10.5px] leading-relaxed", sizeValid ? "text-muted-foreground" : "text-destructive")}>
              {sizeValid
                ? "Aspect ratio is kept — one value scales, both fit the card inside the box (120–4096)."
                : `Enter whole pixels between ${SIZE_MIN} and ${SIZE_MAX} (at least one).`}
            </p>
          )}
        </div>

        {snippets && sizeValid ? (
          <>
            <div className="group relative">
              <pre
                className={cn(
                  "max-w-full rounded-lg border border-border/80 bg-muted/50 p-3 pr-11 font-mono text-[11.5px] leading-relaxed text-foreground",
                  // single-line snippets wrap so nothing looks cut off;
                  // multi-line HTML keeps its indentation via horizontal scroll
                  tab === "html" ? "overflow-x-auto" : "whitespace-pre-wrap break-all"
                )}
              >
                {snippets[tab]}
              </pre>
              <button
                type="button"
                onClick={() => copy(snippets[tab])}
                aria-label={copied ? "Copied" : "Copy to clipboard"}
                className={cn(
                  "absolute top-2 right-2 flex size-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-xs transition-colors",
                  copied
                    ? "border-foreground/20 text-foreground"
                    : "hover:bg-accent hover:text-foreground"
                )}
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </button>
            </div>
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">{note[tab]}</p>
          </>
        ) : snippets ? (
          <div className="flex h-16 items-center justify-center rounded-lg bg-muted/50 text-[12px] text-destructive">
            Fix the size values to see snippets.
          </div>
        ) : (
          <div className="h-16 animate-pulse rounded-lg bg-muted/50" />
        )}
      </div>
    </div>
  );
}
