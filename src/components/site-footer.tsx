import Link from "next/link";
import { Logo } from "@/components/logo";
import { SITE } from "@/lib/site";

/**
 * Site footer — "Donate me · Made with ❤️ By Naman Soni • GitHub" plus
 * Terms / Privacy. Rendered by the signed-in app shell and by the
 * logged-out homepage only — never on public profiles or other pages.
 *
 * `landing` adds the logo mark and the copyright line for the homepage.
 */
export function SiteFooter({
  landing = false,
  containerClassName = "max-w-6xl",
}: {
  landing?: boolean;
  containerClassName?: string;
}) {
  return (
    <footer className="mt-auto border-t border-border">
      <div
        className={`mx-auto flex w-full flex-col items-center justify-between gap-3 px-4 py-5 text-[12.5px] text-muted-foreground sm:flex-row sm:px-6 ${containerClassName}`}
      >
        {landing && (
          <Logo
            markClassName="size-5"
            className="opacity-80 [&>span:last-child]:text-[13px]"
          />
        )}

        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <a
            href={SITE.donateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Donate me
          </a>
          <span aria-hidden="true" className="text-muted-foreground/50">
            ·
          </span>
          <span>
            Made with <span aria-hidden="true">❤️</span>
            <span className="sr-only">love</span> By {SITE.creator} •{" "}
            <a
              href={SITE.creatorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              GitHub
            </a>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/terms"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Terms of Service
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/50">
            ·
          </span>
          <Link
            href="/privacy"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Privacy Policy
          </Link>
        </div>
      </div>

      {landing && (
        <p className="mx-auto w-full max-w-5xl px-4 pb-5 text-center font-mono text-[11px] tracking-wide text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} links.namansoni.in — run with care.
        </p>
      )}
    </footer>
  );
}
