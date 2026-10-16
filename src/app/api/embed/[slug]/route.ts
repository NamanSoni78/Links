import { fetchPublicWidgetWithOwner } from "@/lib/widgets-db";
import { fetchWidgetProfileContext } from "@/lib/profiles";
import { renderWidgetSvg } from "@/lib/widget-svg";
import { normalizeWidgetData, WIDGET_LIMITS, type WidgetProfileContext } from "@/lib/widgets";
import { faviconFor } from "@/lib/url";

/**
 * GET /api/embed/[slug] — the widget as a standalone SVG image.
 *
 * This is what Markdown embeds point at (GitHub READMEs, forums,
 * anywhere `![]()` works). Served with long CDN caching so a render
 * costs function-CPU at most once a day per widget — the `?v=` tag
 * in generated snippets mints a fresh URL on every save instead.
 *
 * Optional sizing (aspect ratio is never distorted):
 *   ?width=   120–4096 — scales the card to this width
 *   ?height=  120–4096 — scales the card to this height
 *   both      — fits the card inside the box, centered on a
 *              transparent letterbox
 * Every unique query string is a separate CDN cache entry, so custom
 * resolutions cost nothing extra after their first hit.
 *
 * Images referenced by the widget (header photo, site favicons) are
 * fetched once and inlined as data URIs (SVG-as-<img> can't load
 * remote assets).
 */
export const runtime = "nodejs";
export const revalidate = 86400;

const CACHE_CONTROL = "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800";
const MAX_IMAGE_BYTES = 768 * 1024;
const SIZE_MIN = 120;
const SIZE_MAX = 4096;

/** Small, muted placeholder so deleted widgets don't leave broken-image icons in READMEs. */
function placeholderSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="64" viewBox="0 0 240 64" role="img"><title>Widget unavailable</title><rect x="0.5" y="0.5" width="239" height="63" rx="14" fill="#f4f2ee" stroke="#ddd8cf"/><text x="120" y="37" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" fill="#a8a29e">widget unavailable</text></svg>`;
}

function svgResponse(svg: string, status = 200): Response {
  return new Response(svg, {
    status,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": CACHE_CONTROL,
      "x-content-type-options": "nosniff",
    },
  });
}

async function inlineImage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(3500),
      headers: { "user-agent": "Links-Widgets/1.0 (+https://links.namansoni.in)" },
      redirect: "follow",
    });
    if (!res.ok) return url;
    const type = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (!type.startsWith("image/")) return url;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_IMAGE_BYTES) return url;
    return `data:${type};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return url; // external ref still renders when the SVG is opened directly
  }
}

function parseSizeParam(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || n < SIZE_MIN || n > SIZE_MAX) return undefined;
  return n;
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await fetchPublicWidgetWithOwner(decodeURIComponent(slug).toLowerCase());
  if (!found) return svgResponse(placeholderSvg());
  const { widget, ownerUserId } = found;

  const data = normalizeWidgetData(widget.data);
  const url = new URL(req.url);
  const width = parseSizeParam(url.searchParams.get("width"));
  const height = parseSizeParam(url.searchParams.get("height"));

  // owner profile powers the sites / contacts blocks
  let profile: WidgetProfileContext | undefined;
  if (data.blocks.order.includes("sites") || data.blocks.order.includes("contacts")) {
    profile = await fetchWidgetProfileContext(ownerUserId);
  }

  // inline remote assets once — cached by the CDN afterwards
  const jobs: Promise<unknown>[] = [];
  let imageSrc: string | undefined;
  if (data.content.imageUrl) {
    jobs.push(inlineImage(data.content.imageUrl).then((v) => (imageSrc = v)));
  }
  const resolvedIcons: Record<string, string> = {};
  if (profile && data.blocks.order.includes("sites") && data.blocks.sites.showFavicon) {
    const sites = profile.sites.slice(
      0,
      data.blocks.sites.limit > 0 ? data.blocks.sites.limit : profile.sites.length
    );
    for (const s of sites.slice(0, WIDGET_LIMITS.sitesCap)) {
      if (s.favicon) continue; // custom favicons are already data URLs
      jobs.push(
        inlineImage(faviconFor(s.url)).then((v) => {
          if (v.startsWith("data:")) resolvedIcons[s.url] = v;
        })
      );
    }
  }
  if (jobs.length) await Promise.all(jobs);

  return svgResponse(renderWidgetSvg(data, { imageSrc, profile, resolvedIcons, width, height }));
}
