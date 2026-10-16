"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Mark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Minimal top bar for public profile pages:
 * brand mark (left) · share + edit pill (right).
 * The edit pill only appears for the page owner — checked client-side
 * so the page itself stays statically cacheable.
 */
export function PublicTopBar({ slug, url }: { slug: string; url: string }) {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (alive && d?.ok && d?.profile?.slug === slug) setIsOwner(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [slug]);

  const share = async () => {
    const shareData = {
      title: `@${slug} on Links`,
      text: `Check out @${slug} on Links`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard.");
      }
    } catch {
      /* user dismissed the share sheet */
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
        <Link
          href="/"
          aria-label="Made with Links — create your own page"
          className="flex items-center gap-2 transition-opacity hover:opacity-75"
        >
          <Mark className="size-6" />
          <span className="text-[14px] font-semibold tracking-tight">Links</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {isOwner && (
            <Link
              href="/dashboard"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand/40 bg-brand/10 px-3 text-[12.5px] font-medium text-brand transition-colors hover:bg-brand/15"
            >
              <Pencil className="size-3" />
              Edit page
            </Link>
          )}
          <button
            type="button"
            onClick={share}
            aria-label="Share this page"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12.5px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Share2 className="size-3.5" />
            Share
          </button>
        </div>
      </div>
    </header>
  );
}
