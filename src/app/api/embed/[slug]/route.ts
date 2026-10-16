import { fetchPublicWidget } from "@/lib/widgets-db";
import { renderWidgetSvg } from "@/lib/widget-svg";
import { normalizeWidgetData } from "@/lib/widgets";

/**
 * GET /api/embed/[slug] — the widget as a standalone SVG image.
 *
 * This is what Markdown embeds point at (GitHub READMEs, forums,
 * anywhere `![]()` works). Served with long CDN caching so a render
 * costs function-CPU at most once a day per widget — the `?v=` tag
 * in generated snippets mints a fresh URL on every save instead.
 *
 * The handler never reads the request, which keeps it eligible for
 * the route cache. Images referenced by the widget are fetched once
 * and inlined as data URIs (SVG-as-<img> can't load remote assets).
 */
export const runtime = "nodejs";
export const revalidate = 86400;

const CACHE_CONTROL = "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800";
const MAX_IMAGE_BYTES = 768 * 1024;

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

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const widget = await fetchPublicWidget(decodeURIComponent(slug).toLowerCase());
  if (!widget) return svgResponse(placeholderSvg());

  const data = normalizeWidgetData(widget.data);
  const imageSrc = data.content.imageUrl ? await inlineImage(data.content.imageUrl) : undefined;
  return svgResponse(renderWidgetSvg(data, { imageSrc }));
}
