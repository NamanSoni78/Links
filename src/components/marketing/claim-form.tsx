"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, X } from "lucide-react";
import { validateSlugClient } from "@/lib/slug-client";
import { cn } from "@/lib/utils";

type Status = "idle" | "invalid" | "checking" | "free" | "taken";

/**
 * The hero claim field — type a username, see instantly if it's free,
 * and land on signup with it pre-filled.
 *
 * Status is *derived*: local rules are checked during render, and only
 * the async server result lives in state (keyed by slug, so it self-
 * invalidates when the input changes — no setState in the effect body).
 */
export function ClaimForm({ className }: { className?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [remote, setRemote] = useState<{ slug: string; available: boolean; message?: string } | null>(
    null
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slug = value.trim().toLowerCase();

  let status: Status = "idle";
  let message = "";
  const local = slug ? validateSlugClient(slug) : null;
  if (!slug) {
    status = "idle";
  } else if (local && !local.valid) {
    status = "invalid";
    message = local.message;
  } else if (remote?.slug === slug) {
    status = remote.available ? "free" : "taken";
    message = remote.message ?? (remote.available ? "" : "That username is taken.");
  } else {
    status = "checking";
  }

  useEffect(() => {
    const slug = value.trim().toLowerCase();
    if (!slug) return;
    if (!validateSlugClient(slug).valid) return; // handled locally
    if (remote?.slug === slug) return; // already resolved

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/slug-check?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        setRemote({
          slug,
          available: !!data.available,
          message: data.message,
        });
      } catch {
        setRemote({ slug, available: true }); // optimistic — server re-checks on save
      }
    }, 400);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, remote]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "taken" || status === "invalid" || status === "checking" || !slug) return;
    router.push(`/signup?slug=${encodeURIComponent(slug)}`);
  };

  return (
    <form onSubmit={submit} className={cn("w-full max-w-md", className)} aria-label="Claim your username">
      <div
        className={cn(
          "flex items-stretch overflow-hidden rounded-xl border bg-card shadow-sm transition-colors",
          "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20",
          status === "taken" || status === "invalid"
            ? "border-destructive/60"
            : status === "free"
              ? "border-emerald-600/60"
              : "border-border"
        )}
      >
        <span className="hidden select-none items-center border-r border-border bg-muted/60 px-3.5 font-mono text-[13px] text-muted-foreground sm:flex">
          links.namansoni.in/
        </span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\s+/g, "").toLowerCase())}
          placeholder="yourname"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Choose a username"
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground/60"
        />
        <span className="flex items-center pr-2.5" aria-hidden="true">
          {status === "checking" && slug && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          {status === "free" && <Check className="size-4 text-emerald-600" />}
          {(status === "taken" || status === "invalid") && <X className="size-4 text-destructive" />}
        </span>
        <button
          type="submit"
          disabled={status === "taken" || status === "invalid" || status === "checking"}
          className="flex items-center gap-1.5 bg-primary px-4 text-[14px] font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 sm:px-5"
        >
          Claim
          <ArrowRight className="size-4" />
        </button>
      </div>

      <p
        className={cn(
          "mt-2 min-h-[18px] pl-1 font-mono text-[11px] tracking-wide",
          status === "taken" || status === "invalid"
            ? "text-destructive"
            : status === "free"
              ? "text-emerald-600"
              : "text-muted-foreground"
        )}
        role={status === "taken" || status === "invalid" ? "alert" : undefined}
      >
        {status === "free" && message === ""
          ? `links.namansoni.in/${slug} is available`
          : message || "Lowercase letters, numbers, hyphens — 3 to 30 characters."}
      </p>
    </form>
  );
}
