"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

/**
 * Landing header auth island — swaps "Log in / Get started" for
 * "Dashboard" when a session exists, without making the page dynamic.
 */
export function HeaderAuth() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (alive && d?.ok && d?.user) setSignedIn(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (signedIn) {
    return (
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
      >
        <LayoutDashboard className="size-4" />
        Dashboard
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href="/login"
        className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        Log in
      </Link>
      <Link
        href="/signup"
        className="rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
      >
        Get started
      </Link>
    </div>
  );
}
