"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink, LayoutDashboard, LayoutTemplate, LogOut, Settings } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Your page", icon: LayoutDashboard },
  { href: "/widgets", label: "Widgets", icon: LayoutTemplate },
  { href: "/settings", label: "Settings", icon: Settings },
];

/**
 * App chrome — desktop sidebar + mobile top bar.
 * One component so both stay perfectly in sync.
 */
export function DashChrome({ email, slug }: { email: string; slug: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  const signOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast("Signed out — see you around.");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Couldn't sign out. Try again.");
    }
  };

  return (
    <>
      {/* ── desktop sidebar ── */}
      <aside className="sticky top-0 hidden h-dvh w-[230px] shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
        <Link href="/" aria-label="Links — home" className="px-5 pb-6 pt-6">
          <Logo />
        </Link>

        <nav className="flex flex-col gap-1 px-3" aria-label="Main">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors",
                  active
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                <item.icon className="size-4" strokeWidth={1.9} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-3 pb-5">
          {slug && (
            <a
              href={`/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-accent"
            >
              <span className="truncate font-mono">/{slug}</span>
              <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
            </a>
          )}
          <div className="flex items-center gap-1 rounded-lg px-1 py-1">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold uppercase text-muted-foreground">
              {email.slice(0, 2)}
            </span>
            <span className="min-w-0 flex-1 truncate px-2 text-[12px] text-muted-foreground">
              {email}
            </span>
            <button
              type="button"
              onClick={signOut}
              aria-label="Sign out"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── mobile top bar ── */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-md lg:hidden">
        <Link href="/" aria-label="Links — home">
          <Logo markClassName="size-6" className="[&>span:last-child]:text-[16px]" />
        </Link>

        <nav className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1" aria-label="Main">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md transition-colors",
                  active
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="size-4" strokeWidth={1.9} />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="size-[17px]" />
          </button>
        </div>
      </header>

      {/* desktop theme toggle floating in header space */}
      <div className="fixed right-4 top-4 z-40 hidden lg:flex">
        <ThemeToggle />
      </div>
    </>
  );
}
