import { NextRequest } from "next/server";
import { authGuard, fail, ok } from "@/lib/api";
import { savePage } from "@/lib/profiles";
import type { ContactKind, PageState, PublicContact, PublicLink } from "@/lib/types";

export const runtime = "nodejs";

/**
 * PUT /api/profile — saves the whole page state atomically:
 * { slug, displayName, description, avatar, tags: string[],
 *   links: [{id, url, title, desc?, favicon?}],
 *   contacts: [{id, kind, label, value, icon?}] }
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
  const avatar = typeof b.avatar === "string" ? b.avatar : "";
  const tags = Array.isArray(b.tags)
    ? b.tags.filter((t): t is string => typeof t === "string")
    : [];

  const rawLinks = Array.isArray(b.links) ? b.links : [];
  const links: PublicLink[] = rawLinks
    .map((l) => {
      const link = (l ?? {}) as Record<string, unknown>;
      return {
        id: typeof link.id === "string" ? link.id : "",
        url: typeof link.url === "string" ? link.url : "",
        title: typeof link.title === "string" ? link.title : "",
        desc: typeof link.desc === "string" ? link.desc : "",
        favicon: typeof link.favicon === "string" ? link.favicon : "",
      };
    })
    .filter((l) => l.url.trim().length > 0);

  const rawContacts = Array.isArray(b.contacts) ? b.contacts : [];
  const contacts: PublicContact[] = rawContacts
    .map((c) => {
      const contact = (c ?? {}) as Record<string, unknown>;
      const kind: ContactKind =
        contact.kind === "email" || contact.kind === "phone" ? contact.kind : "link";
      return {
        id: typeof contact.id === "string" ? contact.id : "",
        kind,
        label: typeof contact.label === "string" ? contact.label : "",
        value: typeof contact.value === "string" ? contact.value : "",
        href: typeof contact.href === "string" ? contact.href : "", // recomputed server-side
        icon: typeof contact.icon === "string" ? contact.icon : "",
      };
    })
    .filter((c) => c.value.trim().length > 0);

  const state: PageState = { slug, displayName, description, tags, avatar, links, contacts };

  const result = await savePage(guard.user.id, state);
  if (!result.ok) return fail(result.error, result.status ?? 400);

  return ok({ slug: result.slug });
}
