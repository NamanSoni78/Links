import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Shared shell for the legal pages — quiet, readable, public.
 */
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Links — home">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand">
          Legal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 font-mono text-[11.5px] text-muted-foreground">
          Last updated: {updated}
        </p>

        <div className="mt-10">{children}</div>
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 text-center sm:px-6">
          <p className="text-[12px] text-muted-foreground">
            Questions about this document?{" "}
            <a
              href="https://github.com/NamanSoni78"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Reach the operator on GitHub
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Section heading + clause body. */
export function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border py-7 first:border-0 first:pt-0">
      <h2 className="text-[16px] font-semibold tracking-tight text-foreground">
        <span className="mr-2.5 font-mono text-[13px] text-brand">{String(n).padStart(2, "0")}</span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
