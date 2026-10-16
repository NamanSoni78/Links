import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ClaimForm } from "@/components/marketing/claim-form";

export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="bg-dots absolute inset-0 [mask-image:radial-gradient(65%_55%_at_50%_40%,black,transparent)]"
      />

      <header className="relative z-10 mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Links — home">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <p className="animate-fade-up font-mono text-[11px] uppercase tracking-[0.22em] text-brand">
            404 · unclaimed
          </p>
          <h1 className="animate-fade-up mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl [--stagger:1]">
            This page doesn&apos;t exist — yet.
          </h1>
          <p className="animate-fade-up mx-auto mt-4 max-w-sm text-pretty text-[14.5px] leading-relaxed text-muted-foreground [--stagger:2]">
            Which means the username might still be free. If it&apos;s the one
            you had your eye on, grab it before somebody else does.
          </p>
          <div className="animate-fade-up mt-8 flex justify-center [--stagger:3]">
            <ClaimForm />
          </div>
          <p className="mt-6 text-[12.5px] text-muted-foreground/70">
            Or head back{" "}
            <Link href="/" className="text-foreground underline-offset-4 hover:underline">
              home
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
