"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateSlugClient } from "@/lib/slug-client";

export type SlugStatus = "idle" | "invalid" | "checking" | "free" | "taken" | "same";

/**
 * Username field with live availability checking.
 * `ownedSlug` is the slug the user already owns — typing it back
 * is fine (status "same"). Async server state is keyed by slug so
 * nothing needs to be reset inside effect bodies.
 */
export function SlugField({
  value,
  onChange,
  ownedSlug,
  size = "md",
  onStatus,
  id = "slug",
}: {
  value: string;
  onChange: (v: string) => void;
  ownedSlug: string | null;
  size?: "md" | "lg";
  onStatus?: (s: SlugStatus) => void;
  id?: string;
}) {
  const [remote, setRemote] = useState<{ slug: string; available: boolean; message?: string } | null>(
    null
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slug = value.trim().toLowerCase();

  let status: SlugStatus = "idle";
  let message = "";
  const local = slug ? validateSlugClient(slug) : null;

  if (!slug) {
    status = "idle";
  } else if (ownedSlug && slug === ownedSlug) {
    status = "same";
    message = "This is your current username.";
  } else if (local && !local.valid) {
    status = "invalid";
    message = local.message;
  } else if (remote?.slug === slug) {
    status = remote.available ? "free" : "taken";
    message = remote.message ?? (remote.available ? "Good news — it's available." : "That username is taken.");
  } else {
    status = "checking";
  }

  useEffect(() => {
    const slug = value.trim().toLowerCase();
    if (!slug) return;
    if (ownedSlug && slug === ownedSlug) return;
    if (!validateSlugClient(slug).valid) return; // handled locally
    if (remote?.slug === slug) return; // already resolved

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/slug-check?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        setRemote({ slug, available: !!data.available, message: data.message });
      } catch {
        setRemote({ slug, available: true }); // optimistic — server re-checks on save
      }
    }, 400);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, ownedSlug, remote]);

  useEffect(() => {
    onStatus?.(status);
  }, [status]);

  const icon =
    status === "checking" ? (
      <Loader2 className="size-4 animate-spin text-muted-foreground" />
    ) : status === "free" ? (
      <Check className="size-4 text-emerald-600" />
    ) : status === "invalid" || status === "taken" ? (
      <X className="size-4 text-destructive" />
    ) : null;

  return (
    <div>
      <div
        className={cn(
          "flex items-stretch overflow-hidden rounded-xl border bg-card shadow-xs transition-colors",
          "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20",
          size === "lg" ? "h-12" : "h-11",
          status === "taken" || status === "invalid"
            ? "border-destructive/60"
            : status === "free"
              ? "border-emerald-600/60"
              : "border-border"
        )}
      >
        <span className="flex select-none items-center border-r border-border bg-muted/50 px-3.5 font-mono text-[12.5px] text-muted-foreground">
          /
        </span>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\s+/g, "").toLowerCase())}
          placeholder="yourname"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Username"
          className="min-w-0 flex-1 bg-transparent px-3.5 font-mono text-[14px] text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground/60"
        />
        <span className="flex items-center pr-3" aria-hidden="true">
          {icon}
        </span>
      </div>
      <p
        className={cn(
          "mt-1.5 min-h-[17px] pl-1 font-mono text-[11px] tracking-wide",
          status === "taken" || status === "invalid"
            ? "text-destructive"
            : status === "free"
              ? "text-emerald-600"
              : "text-muted-foreground"
        )}
      >
        {message || "Your page will live at links.namansoni.in/you"}
      </p>
    </div>
  );
}
