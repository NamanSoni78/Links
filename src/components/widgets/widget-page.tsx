import Link from "next/link";
import { fetchPublicWidget } from "@/lib/widgets-db";
import { WidgetCard, WidgetAnimationStyles } from "@/components/widgets/widget-card";
import { Mark } from "@/components/logo";

/**
 * Shared renderer for the two public widget routes — the full page
 * (/w/<slug>) and the bare iframe variant (/w/<slug>/embed).
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

export async function WidgetPageView({ slug, embed }: { slug: string; embed: boolean }) {
  const widget = await fetchPublicWidget(slug);

  if (!widget) return <WidgetNotFound />;

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
        <WidgetCard data={widget.data} />

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
    </>
  );
}

/** Metadata shared by both routes — widgets stay out of search indexes. */
export function widgetNotFoundMetadata(title: string) {
  return { title, robots: { index: false, follow: false } };
}

export async function widgetMetadataFor(slug: string) {
  const widget = await fetchPublicWidget(slug);
  return widgetNotFoundMetadata(
    widget ? `${widget.name} — Links widget` : "Widget not found"
  );
}
