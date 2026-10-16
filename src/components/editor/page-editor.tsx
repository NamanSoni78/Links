"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, ExternalLink, Loader2, Save, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LinksEditor, type EditorLink } from "@/components/editor/links-editor";
import { SlugField, type SlugStatus } from "@/components/editor/slug-field";
import { LivePreview } from "@/components/editor/live-preview";
import { LIMITS } from "@/lib/limits";
import { normalizeUrlInput } from "@/lib/url";
import { SITE } from "@/lib/site";
import type { PageState } from "@/lib/types";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </p>
  );
}

export function PageEditor({ initial }: { initial: PageState }) {
  const router = useRouter();

  const [ownedSlug, setOwnedSlug] = useState<string | null>(initial.slug);
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [description, setDescription] = useState(initial.description);
  const [tagsInput, setTagsInput] = useState(initial.tags.join(", "));
  const [links, setLinks] = useState<EditorLink[]>(
    initial.links.map((l) => ({ key: l.id, id: l.id, url: l.url, title: l.title }))
  );
  const [saving, setSaving] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Prefill from the landing page claim box on first visit.
  useEffect(() => {
    if (initial.slug) return;
    try {
      const claimed = sessionStorage.getItem("links:claimed-slug");
      if (claimed && /^[a-z0-9-]{3,30}$/.test(claimed)) setSlug(claimed);
    } catch {
      /* noop */
    }
  }, [initial.slug]);

  const tags = useMemo(
    () =>
      tagsInput
        .split(",")
        .map((t) => t.trim().replace(/^#/, "").slice(0, LIMITS.tagMax))
        .filter(Boolean)
        .slice(0, LIMITS.tagsMax),
    [tagsInput]
  );

  const previewProfile = useMemo(
    () => ({
      slug: slug.trim(),
      displayName: displayName.trim(),
      description: description.trim(),
      tags,
      links: links
        .map((l) => ({ id: l.key, url: normalizeUrlInput(l.url) ?? l.url, title: l.title.trim() || l.url }))
        .filter((l) => l.url),
    }),
    [slug, displayName, description, tags, links]
  );

  const buildPayload = () => {
    const cleanLinks = links
      .map((l) => {
        const url = normalizeUrlInput(l.url);
        return url ? { id: l.id, url, title: l.title.trim().slice(0, LIMITS.linkTitleMax) } : null;
      })
      .filter((l): l is { id: string; url: string; title: string } => l !== null);

    return {
      slug: slug.trim() || null,
      displayName: displayName.trim().slice(0, LIMITS.displayNameMax),
      description: description.trim().slice(0, LIMITS.descriptionMax),
      tags,
      links: cleanLinks,
    };
  };

  const savedRef = useRef(JSON.stringify(buildPayload()));
  const dirty = JSON.stringify(buildPayload()) !== savedRef.current;

  const invalidUrls = links.some((l) => l.url.trim() && !normalizeUrlInput(l.url));
  const nameMissing = !!slug.trim() && !displayName.trim();
  const slugBad =
    !!slug.trim() && slugStatus !== "free" && slugStatus !== "same" && slugStatus !== "idle";

  const canSave = !saving && !invalidUrls && !nameMissing && !slugBad && dirty;

  const save = async () => {
    if (saving) return;
    if (invalidUrls) {
      toast.error("One of your links has an invalid URL.");
      return;
    }
    if (nameMissing) {
      toast.error("Your page needs a display name.");
      return;
    }
    const payload = buildPayload();
    if (payload.slug && slugStatus === "taken") {
      toast.error("That username is already taken.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Couldn't save. Try again.");
        return;
      }

      const wasClaimed = !!ownedSlug;
      savedRef.current = JSON.stringify(payload);
      if (data.slug !== ownedSlug) {
        setOwnedSlug(data.slug);
        router.refresh();
      }
      if (!wasClaimed && data.slug) {
        setJustClaimed(true);
        toast.success("Your page is live — share it anywhere.");
      } else {
        toast.success("Saved.");
      }
    } catch {
      toast.error("Network hiccup — try again.");
    } finally {
      setSaving(false);
    }
  };

  // ⌘S / Ctrl+S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (canSave) save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canSave, save]);

  const liveUrl = ownedSlug ? `${SITE.url}/${ownedSlug}` : null;

  /* ── onboarding: claim a username first ─────────────────── */
  if (!ownedSlug) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="animate-fade-up rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <Eyebrow>Step one</Eyebrow>
          <h1 className="mt-2 text-[22px] font-semibold tracking-tight">
            Claim your username
          </h1>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
            This becomes your public page — you can change it later, and
            nothing goes live until you say so.
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="claim-slug"
                className="mb-1.5 block text-[13px] font-medium text-foreground"
              >
                Username
              </label>
              <SlugField
                id="claim-slug"
                value={slug}
                onChange={setSlug}
                ownedSlug={null}
                size="lg"
                onStatus={setSlugStatus}
              />
            </div>

            <div>
              <label
                htmlFor="claim-name"
                className="mb-1.5 block text-[13px] font-medium text-foreground"
              >
                Display name
              </label>
              <input
                id="claim-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, LIMITS.displayNameMax))}
                placeholder="Naman Soni"
                autoFocus
                className="h-12 w-full rounded-xl border border-border bg-card px-4 text-[15px] shadow-xs outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-[3px] focus:ring-ring/20"
              />
              <p className="mt-1.5 pl-1 text-[12.5px] text-muted-foreground">
                The name people see at the top of your page.
              </p>
            </div>

            <Button
              onClick={() => {
                if (slugStatus !== "free") {
                  toast.error(slugStatus === "taken" ? "That username is taken." : "Pick a valid username first.");
                  return;
                }
                if (!displayName.trim()) {
                  toast.error("Add a display name.");
                  return;
                }
                // Seed the links editor with an empty first row for a warm start.
                if (links.length === 0) {
                  setLinks([{ key: "first", id: "", url: "", title: "" }]);
                }
                save();
              }}
              disabled={saving}
              className="h-11 w-full rounded-xl text-[14px]"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Create my page
            </Button>
          </div>
        </div>
        <p className="mt-5 text-center text-[12.5px] text-muted-foreground">
          You can add links, a bio and tags right after this step.
        </p>
      </div>
    );
  }

  /* ── full editor ─────────────────────────────────────────── */
  return (
    <div className="w-full">
      {/* headline row */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-6">
        <div>
          <Eyebrow>Your page</Eyebrow>
          <h1 className="mt-1.5 text-[24px] font-semibold tracking-tight">
            {displayName || "Page editor"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
            >
              <ExternalLink className="size-3.5" />
              View page
            </a>
          )}
          <Button
            onClick={save}
            disabled={!canSave}
            className="h-9 rounded-lg px-4 text-[13px]"
            aria-keyshortcuts="Meta+S Control+S"
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            {dirty ? "Save changes" : "Saved"}
            {dirty && <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {justClaimed && liveUrl && (
        <div className="animate-pop-in mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-600/30 bg-emerald-600/8 px-4 py-3">
          <p className="min-w-0 flex-1 text-[13.5px] text-emerald-700 dark:text-emerald-400">
            Your page is live at{" "}
            <span className="font-mono font-medium">{liveUrl.replace(/^https?:\/\//, "")}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(liveUrl).then(() => toast.success("Copied."));
            }}
            className="rounded-lg border border-emerald-600/40 px-3 py-1.5 text-[12.5px] font-medium text-emerald-700 transition-colors hover:bg-emerald-600/10 dark:text-emerald-400"
          >
            Copy link
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setJustClaimed(false)}
            className="text-emerald-700/60 transition-colors hover:text-emerald-700 dark:text-emerald-400/60"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* ── editor column ── */}
        <div className="space-y-6 min-w-0">
          {/* identity */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <Eyebrow>Identity</Eyebrow>
              <span className="font-mono text-[10.5px] text-muted-foreground/60">
                what visitors see
              </span>
            </div>

            <div className="grid gap-5">
              <div>
                <label htmlFor="display-name" className="mb-1.5 block text-[13px] font-medium">
                  Display name
                </label>
                <input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value.slice(0, LIMITS.displayNameMax))}
                  placeholder="Naman Soni"
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-[14.5px] outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-[3px] focus:ring-ring/20"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="bio" className="block text-[13px] font-medium">
                    Short bio
                  </label>
                  <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground/70">
                    {description.length}/{LIMITS.descriptionMax}
                  </span>
                </div>
                <textarea
                  id="bio"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, LIMITS.descriptionMax))}
                  placeholder="Maker of small things on the internet."
                  rows={2}
                  className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-[14px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-[3px] focus:ring-ring/20"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="tags" className="block text-[13px] font-medium">
                    Tags
                  </label>
                  <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground/70">
                    {tags.length}/{LIMITS.tagsMax}
                  </span>
                </div>
                <input
                  id="tags"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="builder, indie, coffee"
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-[3px] focus:ring-ring/20"
                />
                <div className="mt-2 flex min-h-[26px] flex-wrap items-center gap-1.5">
                  {tags.length > 0 ? (
                    tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-border bg-muted/50 px-2.5 py-[5px] font-mono text-[11px] text-muted-foreground"
                      >
                        #{t}
                      </span>
                    ))
                  ) : (
                    <span className="text-[12px] text-muted-foreground/60">
                      Separate tags with commas.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* links */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <Eyebrow>Links</Eyebrow>
              <span className="font-mono text-[10.5px] text-muted-foreground/60">
                drag to reorder
              </span>
            </div>
            <LinksEditor links={links} onChange={setLinks} />
          </section>

          {/* username */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <Eyebrow>Username</Eyebrow>
              <span className="font-mono text-[10.5px] text-muted-foreground/60">
                your public address
              </span>
            </div>
            <SlugField value={slug} onChange={setSlug} ownedSlug={ownedSlug} onStatus={setSlugStatus} />
            <p className="mt-2 pl-1 text-[12.5px] leading-relaxed text-muted-foreground">
              Changing this changes your public link — the old one stops working
              and anyone can claim it after you let it go.
            </p>
          </section>
        </div>

        {/* ── preview column ── */}
        <aside className="sticky top-8 hidden xl:block">
          <LivePreview profile={previewProfile} siteUrl={SITE.url} />
        </aside>
      </div>

      {/* mobile preview trigger */}
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex size-12 items-center justify-center rounded-full border border-border bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 xl:hidden"
        aria-label="Open live preview"
      >
        <Eye className="size-5" />
      </button>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-max overflow-y-auto p-6 sm:max-w-max">
          <DialogHeader className="sr-only">
            <DialogTitle>Live preview</DialogTitle>
            <DialogDescription>A live preview of your public page.</DialogDescription>
          </DialogHeader>
          <LivePreview profile={previewProfile} siteUrl={SITE.url} compact />
        </DialogContent>
      </Dialog>
    </div>
  );
}
