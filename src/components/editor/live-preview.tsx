"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { ProfileView } from "@/components/public-view/profile-view";
import type { PublicProfile } from "@/lib/types";

/**
 * Phone-shaped live preview. Renders the exact same ProfileView the
 * public page uses, so what you see is precisely what visitors get.
 */
export function LivePreview({
  profile,
  siteUrl,
  compact = false,
}: {
  profile: PublicProfile;
  siteUrl: string;
  compact?: boolean;
}) {
  const liveUrl = profile.slug ? `${siteUrl}/${profile.slug}` : null;

  const copy = async () => {
    if (!liveUrl) return;
    try {
      await navigator.clipboard.writeText(liveUrl);
      toast.success("Link copied to clipboard.");
    } catch {
      toast.error("Couldn't copy — long-press the link instead.");
    }
  };

  return (
    <div className="flex flex-col items-center">
      {!compact && (
        <p className="mb-4 self-start font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
          Live preview
        </p>
      )}

      <div className="animate-pop-in relative w-[320px] max-w-full sm:w-[350px]">
        <div className="overflow-hidden rounded-[2.4rem] border-[9px] border-zinc-900 bg-background shadow-xl dark:border-zinc-700">
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-2 z-10 h-[20px] w-[88px] -translate-x-1/2 rounded-full bg-zinc-900 dark:bg-zinc-700"
            />
            <div className={compact ? "h-[480px] overflow-y-auto" : "h-[560px] overflow-y-auto"}>
              <ProfileView profile={profile} preview />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {liveUrl ? (
          <button
            type="button"
            onClick={copy}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Copy className="size-3.5" />
            {liveUrl.replace(/^https?:\/\//, "")}
          </button>
        ) : (
          <span className="inline-flex h-9 items-center rounded-lg border border-dashed border-border px-3.5 font-mono text-[11.5px] text-muted-foreground">
            Claim a username to go live
          </span>
        )}
        {liveUrl && (
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open live page"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>

      <span className="sr-only" aria-live="polite">
        {profile.displayName ? `Previewing ${profile.displayName}` : "Preview"}
      </span>
    </div>
  );
}
