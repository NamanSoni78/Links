import Link from "next/link";
import type { WidgetItem } from "@/lib/widgets-db";
import { fetchPublicWidgetPage } from "@/lib/widgets-db";
import type { WidgetProfileContext } from "@/lib/widgets";
import { WidgetCard, WidgetAnimationStyles } from "@/components/widgets/widget-card";
import { Mark } from "@/components/logo";
import { SITE, absoluteUrl } from "@/lib/site";

/**
 * Shared renderer for the two public widget routes — the full page
 * (/<username>/<widget>) and the bare iframe variant (…/embed).
 *
 * Server component: both routes keep `export const revalidate = 3600`
 * and NO searchParams, so the CDN full-route cache absorbs all views —
 * the serverless function only runs on cache misses and revalidates,
 * which keeps Vercel Hobby CPU usage near zero for embed traffic.
 */

function WidgetNotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-[420px] rounded-2xl border border-border bg-muted/40 px-7 py-6 text-center">
        <p className="text-[15px] font-medium text-foreground">This widget isn&apos;t here</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          It may have been deleted, or its link changed.
        </p>
      </div>
    </main>
  );
}

export async function WidgetPageView({
  widget,
  username,
  profile,
  embed,
}: {
  widget: WidgetItem;
  username: string;
  profile: WidgetProfileContext;
  embed: boolean;
}) {
  const pageUrl = absoluteUrl(`/${username}/${widget.slug}`);

  return (
    <>
      {embed && <style dangerouslySetInnerHTML={{ __html: "body{background:transparent}" }} />}
      <WidgetAnimationStyles />

      <main
        className={
          embed
            ? "flex min-h-dvh items-center justify-center p-0"
            : "flex min-h-dvh flex-col items-center justify-center gap-6 p-6"
        }
      >
        <WidgetCard data={widget.data} profile={profile} />

        {!embed && (
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground/70 transition-colors hover:text-muted-foreground"
          >
            <Mark className="size-3.5 opacity-70" />
            Made with <span className="font-medium">Links</span>
          </Link>
        )}
      </main>

      {!embed && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "CreativeWork",
              name: widget.name,
              url: pageUrl,
              description: widget.data.content.message || `${widget.name} — a Links widget`,
              author: { "@type": "Person", name: profile.displayName || username },
              publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
              image: absoluteUrl(`/api/embed/${widget.slug}?v=${(widget.updatedAt % 0xffffff).toString(36)}`),
            }).replace(/</g, "\\u003c"),
          }}
        />
      )}
    </>
  );
}

/** Metadata shared by both routes — widgets stay out of search indexes. */
export function widgetNotFoundMetadata(title: string) {
  return { title, robots: { index: false, follow: false } };
}

export async function widgetMetadataFor(username: string, slug: string) {
  const found = await fetchPublicWidgetPage(username, slug);
  return widgetNotFoundMetadata(found ? `${found.widget.name} — Links widget` : "Widget not found");
}
