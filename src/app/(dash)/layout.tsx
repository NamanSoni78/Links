import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOwnedSlug } from "@/lib/profiles";
import { DashChrome } from "@/components/dash/dash-chrome";
import { SITE } from "@/lib/site";

/**
 * Authenticated app shell — sidebar / top bar + the footer that only
 * signed-in users ever see (Donate · Made by Naman · Terms & Privacy).
 */
export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const slug = await getOwnedSlug(user.id);

  return (
    <div className="flex min-h-dvh">
      <DashChrome email={user.email} slug={slug} />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-9">
          {children}
        </main>

        {/* visible only to signed-in users, per spec */}
        <footer className="mt-auto border-t border-border">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-[12.5px] text-muted-foreground sm:flex-row sm:px-6">
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
        </footer>
      </div>
    </div>
  );
}
