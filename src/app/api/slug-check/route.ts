import { NextRequest } from "next/server";
import { get } from "@/lib/db";
import { validateSlug } from "@/lib/slug";
import { ok } from "@/lib/api";

export const runtime = "nodejs";

/**
 * GET /api/slug-check?slug=xyz — live username availability.
 * Public and cheap (one indexed lookup), used with client-side debounce.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("slug") ?? "";
  const slug = raw.toLowerCase().trim();

  if (!slug) return ok({ available: false, checking: false });

  const verdict = validateSlug(slug);
  if (!verdict.valid) {
    return ok({ available: false, reason: verdict.reason, message: verdict.message });
  }

  const clash = await get<{ user_id: string }>("SELECT user_id FROM profiles WHERE slug = ?", [
    slug,
  ]);

  return ok({
    available: !clash,
    message: clash ? "That username is taken." : undefined,
  });
}
