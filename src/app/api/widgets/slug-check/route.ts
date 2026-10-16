import { NextRequest } from "next/server";
import { authGuard, ok } from "@/lib/api";
import { widgetSlugTaken } from "@/lib/widgets-db";
import { validateWidgetSlug } from "@/lib/widgets";

export const runtime = "nodejs";

/**
 * GET /api/widgets/slug-check?slug=x&id=y — live availability for
 * widget links (own namespace under /w/), used with client debounce.
 */
export async function GET(req: NextRequest) {
  const guard = await authGuard();
  if (guard.response) return guard.response;

  const raw = req.nextUrl.searchParams.get("slug") ?? "";
  const excludeId = req.nextUrl.searchParams.get("id") ?? undefined;
  const slug = raw.toLowerCase().trim();

  if (!slug) return ok({ available: false, checking: false });

  const verdict = validateWidgetSlug(slug);
  if (!verdict.valid) return ok({ available: false, message: verdict.message });

  const taken = await widgetSlugTaken(slug, excludeId || undefined);
  return ok({
    available: !taken,
    message: taken ? "That link is already used by another widget." : undefined,
  });
}
