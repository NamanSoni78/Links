import { NextRequest } from "next/server";
import { authGuard, fail, ok } from "@/lib/api";
import { savePage } from "@/lib/profiles";
import type { PageState } from "@/lib/types";

export const runtime = "nodejs";

/**
 * PUT /api/profile — saves the whole page state atomically:
 * { slug, displayName, description, tags: string[], links: [{id, url, title}] }
 */
export async function PUT(req: NextRequest) {
  const guard = await authGuard();
  if (guard.response) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("That request didn't parse. Try again.");
  }

  const b = (body ?? {}) as Record<string, unknown>;

  const slug = typeof b.slug === "string" ? b.slug : null;
  const displayName = typeof b.displayName === "string" ? b.displayName : "";
  const description = typeof b.description === "string" ? b.description : "";
  const tags = Array.isArray(b.tags)
    ? b.tags.filter((t): t is string => typeof t === "string")
    : [];
  const rawLinks = Array.isArray(b.links) ? b.links : [];
  const links = rawLinks
    .map((l) => {
      const link = (l ?? {}) as Record<string, unknown>;
      return {
        id: typeof link.id === "string" ? link.id : "",
        url: typeof link.url === "string" ? link.url : "",
        title: typeof link.title === "string" ? link.title : "",
      };
    })
    .filter((l) => l.url.trim().length > 0);

  const state: PageState = { slug, displayName, description, tags, links };

  const result = await savePage(guard.user.id, state);
  if (!result.ok) return fail(result.error, result.status ?? 400);

  return ok({ slug: result.slug });
}
