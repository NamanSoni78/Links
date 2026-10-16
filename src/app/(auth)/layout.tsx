import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Shell for all auth pages — quiet dotted backdrop,
 * brand mark top-left, theme switch top-right, centered card.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="bg-dots absolute inset-0 [mask-image:radial-gradient(65%_55%_at_50%_40%,black,transparent)]"
      />

      <header className="relative z-10 mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Links — home" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        {children}
      </main>
    </div>
  );
}
