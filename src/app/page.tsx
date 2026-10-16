import Link from "next/link";
import { AtSign, EyeOff, ImageIcon, Zap } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ClaimForm } from "@/components/marketing/claim-form";
import { HeaderAuth } from "@/components/marketing/header-auth";
import { SiteFooter } from "@/components/site-footer";
import { SITE } from "@/lib/site";

const FEATURES = [
  {
    icon: ImageIcon,
    title: "Favicons, fetched for you",
    body: "Paste a link and its little icon appears on its own. No uploads, no fiddling.",
  },
  {
    icon: AtSign,
    title: "A handle that's yours",
    body: "Pick any available username and it's yours for keeping — change it anytime.",
  },
  {
    icon: Zap,
    title: "Fast everywhere",
    body: "Pages are cached at the edge and load in a blink, day mode or night mode.",
  },
  {
    icon: EyeOff,
    title: "No ads, no trackers",
    body: "Your page shows your links and nothing else. We don't even run analytics.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* ── header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Links — home">
            <Logo />
          </Link>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <HeaderAuth />
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── hero ──────────────────────────────────────────── */}
        <section className="relative isolate overflow-hidden">
          <div
            aria-hidden="true"
            className="bg-dots absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_38%,black,transparent)]"
          />
          <div className="relative mx-auto w-full max-w-5xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-24 sm:pt-24">
            <p className="animate-fade-up font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Free forever · No ads · No tracking
            </p>

            <h1 className="animate-fade-up mx-auto mt-5 max-w-2xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-[56px] [--stagger:1]">
              One link for{" "}
              <span className="relative inline-block">
                everything
                <svg
                  aria-hidden="true"
                  viewBox="0 0 200 10"
                  preserveAspectRatio="none"
                  className="absolute -bottom-1 left-0 h-[9px] w-full text-brand"
                >
                  <path
                    d="M2.5 6.5c38-4.2 76-4.4 116-2.4 30 1.5 56 1.6 79-1.3"
                    stroke="currentColor"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </span>{" "}
              you share.
            </h1>

            <p className="animate-fade-up mx-auto mt-5 max-w-md text-pretty text-[15px] leading-relaxed text-muted-foreground [--stagger:2]">
              Links gives you a clean, quick page for your bio and everything
              you&apos;re into. Claim a username, drop your links in, share it
              anywhere. Takes about two minutes — really.
            </p>

            <div className="animate-fade-up mt-9 flex justify-center [--stagger:3]">
              <ClaimForm />
            </div>
          </div>
        </section>

        {/* ── features strip ────────────────────────────────── */}
        <section className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-sm sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-card p-6">
                <f.icon className="size-[18px] text-brand" strokeWidth={1.8} />
                <h3 className="mt-4 text-[14px] font-semibold tracking-tight text-foreground">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── closing CTA ───────────────────────────────────── */}
        <section className="mx-auto w-full max-w-5xl px-4 pb-20 text-center sm:px-6 sm:pb-28">
          <h2 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Grab your handle before someone else does.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-[14px] text-muted-foreground">
            It costs nothing and always will. The only thing you&apos;ll spend
            is two minutes.
          </p>
          <Link
            href="/signup"
            className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-[14px] font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Create your page
          </Link>
        </section>
      </main>

      {/* ── footer (Donate · Made by Naman · GitHub — visible logged out) ── */}
      <SiteFooter landing containerClassName="max-w-5xl" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE.name,
            url: SITE.url,
            description: SITE.description,
            creator: {
              "@type": "Person",
              name: SITE.creator,
              url: SITE.creatorUrl,
            },
          }).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}
