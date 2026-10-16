/**
 * Links — profile & link data access (server only).
 *
 * Public profile pages rely on Next's Full Route Cache (static render
 * on first hit, re-validated on save) so visitors never touch the
 * database or the function CPU after the first request.
 */
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { all, get, atomic } from "./db";
import type { ContactRow, LinkRow, PageState, ProfileRow, PublicContact, PublicProfile } from "./types";
import { validateSlug } from "./slug";
import { normalizeUrlInput, titleFromUrl } from "./url";
import { LIMITS } from "./api";
import { cleanImageDataUrl, AVATAR_MAX_CHARS, ICON_MAX_CHARS } from "./images";
import { normalizeContact } from "./contacts";
import type { WidgetProfileContext } from "./widgets";

function safeParseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

const to_public_contact = (r: ContactRow): PublicContact => ({
  id: r.id,
  kind: (r.kind === "email" || r.kind === "phone" ? r.kind : "link"),
  label: r.label,
  value: r.value,
  href: r.href,
  icon: r.icon,
});

const to_public_link = (l: LinkRow) => ({
  id: l.id,
  url: l.url,
  title: l.title,
  desc: l.description,
  favicon: l.favicon,
});

/* ── public page (used by /[username] + sitemap) ────────────── */

export async function fetchPublicProfile(slug: string): Promise<PublicProfile | null> {
  const profile = await get<ProfileRow>("SELECT * FROM profiles WHERE slug = ?", [slug]);
  if (!profile || !profile.slug) return null;
  const [links, contacts] = await Promise.all([
    all<LinkRow>(
      "SELECT id, url, title, description, favicon FROM links WHERE user_id = ? ORDER BY position ASC",
      [profile.user_id]
    ),
    all<ContactRow>(
      "SELECT id, kind, label, value, href, icon FROM contacts WHERE user_id = ? ORDER BY position ASC",
      [profile.user_id]
    ),
  ]);
  return {
    slug: profile.slug,
    displayName: profile.display_name,
    description: profile.description,
    tags: safeParseTags(profile.tags),
    avatar: profile.avatar,
    links: links.map(to_public_link),
    contacts: contacts.map(to_public_contact),
  };
}

/** Compact owner context for widget rendering (blocks + AI prompts). */
export async function fetchWidgetProfileContext(userId: string): Promise<WidgetProfileContext> {
  const [profile, links, contacts] = await Promise.all([
    get<ProfileRow>("SELECT display_name, description FROM profiles WHERE user_id = ?", [userId]),
    all<LinkRow>(
      "SELECT url, title, description, favicon FROM links WHERE user_id = ? ORDER BY position ASC",
      [userId]
    ),
    all<ContactRow>(
      "SELECT kind, label, value, href, icon FROM contacts WHERE user_id = ? ORDER BY position ASC",
      [userId]
    ),
  ]);
  return {
    displayName: profile?.display_name ?? "",
    bio: profile?.description ?? "",
    sites: links.map((l) => ({ url: l.url, title: l.title, desc: l.description, favicon: l.favicon })),
    contacts: contacts.map((c) => ({
      kind: c.kind,
      label: c.label,
      value: c.value,
      href: c.href,
      icon: c.icon,
    })),
  };
}

/** Same context for any user by slug (widget pages / embeds). */
export async function fetchWidgetProfileContextBySlug(
  slug: string
): Promise<{ userId: string; context: WidgetProfileContext } | null> {
  const profile = await get<ProfileRow>("SELECT user_id, display_name, description FROM profiles WHERE slug = ?", [slug]);
  if (!profile) return null;
  const context = await fetchWidgetProfileContext(profile.user_id);
  return { userId: profile.user_id, context };
}

/* ── dashboard state ────────────────────────────────────────── */

export async function getOwnedSlug(userId: string): Promise<string | null> {
  const row = await get<{ slug: string | null }>(
    "SELECT slug FROM profiles WHERE user_id = ?",
    [userId]
  );
  return row?.slug ?? null;
}

export async function fetchPageState(userId: string): Promise<PageState> {
  const [profile, links, contacts] = await Promise.all([
    get<ProfileRow>("SELECT * FROM profiles WHERE user_id = ?", [userId]),
    all<LinkRow>(
      "SELECT id, url, title, description, favicon FROM links WHERE user_id = ? ORDER BY position ASC",
      [userId]
    ),
    all<ContactRow>(
      "SELECT id, kind, label, value, href, icon FROM contacts WHERE user_id = ? ORDER BY position ASC",
      [userId]
    ),
  ]);
  return {
    slug: profile?.slug ?? null,
    displayName: profile?.display_name ?? "",
    description: profile?.description ?? "",
    tags: profile ? safeParseTags(profile.tags) : [],
    avatar: profile?.avatar ?? "",
    links: links.map(to_public_link),
    contacts: contacts.map(to_public_contact),
  };
}

/* ── save (upsert profile + replace links, atomic) ──────────── */

export type SaveResult = { ok: true; slug: string | null } | { ok: false; error: string; status?: number };

export async function savePage(userId: string, incoming: PageState): Promise<SaveResult> {
  const existing = await get<ProfileRow>("SELECT * FROM profiles WHERE user_id = ?", [userId]);
  const now = Date.now();

  // ── slug ──
  let slug: string | null;
  if (incoming.slug) {
    const v = validateSlug(incoming.slug);
    if (!v.valid) return { ok: false, error: v.message, status: 422 };
    const clash = await get<{ user_id: string }>(
      "SELECT user_id FROM profiles WHERE slug = ? AND user_id != ?",
      [v.slug, userId]
    );
    if (clash) return { ok: false, error: "That username is already taken.", status: 409 };
    slug = v.slug;
  } else {
    slug = existing?.slug ?? null; // keep whatever they already own
  }

  // ── identity fields ──
  const displayName = (incoming.displayName || "").trim().slice(0, LIMITS.displayNameMax);
  if (slug && !displayName) {
    return { ok: false, error: "Your page needs a display name.", status: 422 };
  }
  const description = (incoming.description || "").trim().slice(0, LIMITS.descriptionMax);
  const avatar = cleanImageDataUrl(incoming.avatar, AVATAR_MAX_CHARS);
  const tags = incoming.tags
    .map((t) => t.trim().slice(0, LIMITS.tagMax))
    .filter(Boolean)
    .slice(0, LIMITS.tagsMax);

  // ── links (url + title + optional ≤50-char description + optional custom favicon) ──
  // Ids are always generated server-side: client ids are only React keys,
  // and trusting them here let two users collide on links.id ("l1" …).
  const cleanLinks: { id: string; url: string; title: string; desc: string; favicon: string }[] = [];
  for (const l of incoming.links.slice(0, LIMITS.linksMax)) {
    const url = normalizeUrlInput(l.url || "");
    if (!url) continue;
    const title = (l.title || "").trim().slice(0, LIMITS.linkTitleMax) || titleFromUrl(url);
    cleanLinks.push({
      id: randomUUID(),
      url,
      title,
      desc: (l.desc || "").trim().slice(0, LIMITS.linkDescMax),
      favicon: cleanImageDataUrl(l.favicon, ICON_MAX_CHARS),
    });
  }

  // ── contacts (validated; the whole section is optional) ──
  const cleanContacts: { id: string; kind: string; label: string; value: string; href: string; icon: string }[] = [];
  for (const c of incoming.contacts.slice(0, LIMITS.contactsMax)) {
    const verdict = normalizeContact({ id: c.id, kind: c.kind, label: c.label, value: c.value, icon: c.icon });
    if (!verdict) continue;
    if (!verdict.ok) return { ok: false, error: verdict.error, status: 422 };
    // fresh server id — client ids are display keys, never primary keys
    cleanContacts.push({ ...verdict.contact, id: randomUUID() });
  }

  // ── atomic write ──
  const stmts: { sql: string; args: (string | number | null)[] }[] = [];
  if (existing) {
    stmts.push({
      sql: "UPDATE profiles SET slug = ?, display_name = ?, description = ?, tags = ?, avatar = ?, updated_at = ? WHERE user_id = ?",
      args: [slug, displayName, description, JSON.stringify(tags), avatar, now, userId],
    });
  } else {
    stmts.push({
      sql: "INSERT INTO profiles (user_id, slug, display_name, description, tags, avatar, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [userId, slug, displayName, description, JSON.stringify(tags), avatar, now, now],
    });
  }
  stmts.push({ sql: "DELETE FROM links WHERE user_id = ?", args: [userId] });
  cleanLinks.forEach((l, i) => {
    stmts.push({
      sql: "INSERT INTO links (id, user_id, url, title, description, favicon, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [l.id, userId, l.url, l.title, l.desc, l.favicon, i, now, now],
    });
  });
  stmts.push({ sql: "DELETE FROM contacts WHERE user_id = ?", args: [userId] });
  cleanContacts.forEach((c, i) => {
    stmts.push({
      sql: "INSERT INTO contacts (id, user_id, kind, label, value, href, icon, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [c.id, userId, c.kind, c.label, c.value, c.href, c.icon, i, now, now],
    });
  });
  await atomic(stmts);

  // ── precise revalidation ──
  const oldSlug = existing?.slug ?? null;
  if (oldSlug && oldSlug !== slug) {
    revalidatePath(`/${oldSlug}`);
    revalidatePath("/sitemap.xml");
  }
  if (slug) {
    revalidatePath(`/${slug}`);
    if (oldSlug !== slug) revalidatePath("/sitemap.xml");
  }

  return { ok: true, slug };
}

/* ── account deletion (explicit, no reliance on FK cascades) ── */

export async function deleteAccountCascade(userId: string, slug: string | null): Promise<void> {
  await atomic([
    { sql: "DELETE FROM widgets WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM links WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM contacts WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM profiles WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM users WHERE id = ?", args: [userId] },
  ]);
  if (slug) {
    revalidatePath(`/${slug}`);
    revalidatePath("/sitemap.xml");
  }
}

/* ── admin overview ─────────────────────────────────────────── */

export interface AdminOverview {
  totals: { users: number; verified: number; pages: number; links: number; widgets: number };
  recent: { email: string; verified: boolean; slug: string | null; linkCount: number; joinedAt: number }[];
  daily: { day: string; count: number }[];
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const [users, verified, pages, links, widgets] = await Promise.all([
    get<{ c: number }>("SELECT COUNT(*) AS c FROM users"),
    get<{ c: number }>("SELECT COUNT(*) AS c FROM users WHERE email_verified = 1"),
    get<{ c: number }>("SELECT COUNT(*) AS c FROM profiles WHERE slug IS NOT NULL"),
    get<{ c: number }>("SELECT COUNT(*) AS c FROM links"),
    get<{ c: number }>("SELECT COUNT(*) AS c FROM widgets"),
  ]);

  const recent = await all<{
    email: string;
    email_verified: number;
    slug: string | null;
    link_count: number;
    created_at: number;
  }>(
    `SELECT u.email, u.email_verified, p.slug, COUNT(l.id) AS link_count, u.created_at
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN links l ON l.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT 25`
  );

  const dailyRows = await all<{ day: string; c: number }>(
    `SELECT date(created_at / 1000, 'unixepoch', 'localtime') AS day, COUNT(*) AS c
       FROM users
      WHERE created_at > ?
      GROUP BY day
      ORDER BY day ASC`,
    [Date.now() - 13 * 24 * 60 * 60 * 1000]
  );

  return {
    totals: {
      users: users?.c ?? 0,
      verified: verified?.c ?? 0,
      pages: pages?.c ?? 0,
      links: links?.c ?? 0,
      widgets: widgets?.c ?? 0,
    },
    recent: recent.map((r) => ({
      email: r.email,
      verified: !!r.email_verified,
      slug: r.slug,
      linkCount: r.link_count,
      joinedAt: r.created_at,
    })),
    daily: dailyRows.map((r) => ({ day: r.day, count: r.c })),
  };
}
