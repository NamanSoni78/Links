/**
 * Links — widget data access (server only).
 *
 * Same philosophy as profiles.ts: public widget pages and embed
 * images are rendered once and served from the CDN; only the
 * dashboard APIs touch the database per-request.
 */
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { all, get, run } from "./db";
import { getOwnedSlug } from "./profiles";
import {
  DEFAULT_WIDGET,
  normalizeWidgetData,
  parseWidgetData,
  slugifyWidgetName,
  validateWidgetSlug,
  WIDGET_LIMITS,
  WIDGET_PRESETS,
  type WidgetData,
} from "./widgets";

export interface WidgetRow {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  data: string;
  created_at: number;
  updated_at: number;
}

export interface WidgetItem {
  id: string;
  slug: string;
  name: string;
  data: WidgetData;
  createdAt: number;
  updatedAt: number;
}

export type WidgetResult<T = WidgetItem> =
  | { ok: true; widget: T }
  | { ok: false; error: string; status?: number };

const to_item = (r: WidgetRow): WidgetItem => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  data: parseWidgetData(r.data),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/* ── reads ───────────────────────────────────────────────────── */

export async function listWidgets(userId: string): Promise<WidgetItem[]> {
  const rows = await all<WidgetRow>(
    "SELECT * FROM widgets WHERE user_id = ? ORDER BY updated_at DESC",
    [userId]
  );
  return rows.map(to_item);
}

export async function getWidget(userId: string, id: string): Promise<WidgetItem | null> {
  const row = await get<WidgetRow>(
    "SELECT * FROM widgets WHERE id = ? AND user_id = ?",
    [id, userId]
  );
  return row ? to_item(row) : null;
}

export async function fetchPublicWidget(slug: string): Promise<WidgetItem | null> {
  const row = await get<WidgetRow>("SELECT * FROM widgets WHERE slug = ?", [slug]);
  return row ? to_item(row) : null;
}

/** Widget + owner id for the embed SVG (no username check needed). */
export async function fetchPublicWidgetWithOwner(
  slug: string
): Promise<{ widget: WidgetItem; ownerUserId: string } | null> {
  const row = await get<WidgetRow>("SELECT * FROM widgets WHERE slug = ?", [slug]);
  return row ? { widget: to_item(row), ownerUserId: row.user_id } : null;
}

/** Widget + owner check for the /<username>/<widget> page. */
export async function fetchPublicWidgetPage(
  username: string,
  widgetSlug: string
): Promise<{ widget: WidgetItem; ownerUserId: string } | null> {
  const row = await get<WidgetRow & { owner_slug: string | null }>(
    `SELECT w.*, p.slug AS owner_slug FROM widgets w
       LEFT JOIN profiles p ON p.user_id = w.user_id
      WHERE w.slug = ?`,
    [widgetSlug]
  );
  if (!row || row.owner_slug !== username) return null;
  return { widget: to_item(row), ownerUserId: row.user_id };
}

export async function countWidgets(userId: string): Promise<number> {
  const row = await get<{ c: number }>("SELECT COUNT(*) AS c FROM widgets WHERE user_id = ?", [
    userId,
  ]);
  return row?.c ?? 0;
}

/* ── slug availability ───────────────────────────────────────── */

export async function widgetSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const row = excludeId
    ? await get<{ id: string }>("SELECT id FROM widgets WHERE slug = ? AND id != ?", [slug, excludeId])
    : await get<{ id: string }>("SELECT id FROM widgets WHERE slug = ?", [slug]);
  return !!row;
}

/** Finds a free slug near the wanted one: name → name-1 → … → name-9 */
async function freeSlug(wanted: string): Promise<string> {
  const v = validateWidgetSlug(wanted);
  let base = v.valid ? v.slug : slugifyWidgetName(wanted);
  if (await widgetSlugTaken(base)) {
    let candidate = `${base.slice(0, 28)}-1`;
    for (let i = 1; i < 40 && (await widgetSlugTaken(candidate)); i++) {
      candidate = `${base.slice(0, 28)}-${i}`;
    }
    if (await widgetSlugTaken(candidate)) {
      candidate = `${base.slice(0, 20)}-${Math.random().toString(36).slice(2, 6)}`;
    }
    base = candidate;
  }
  return base;
}

/** Revalidates every cached surface a widget lives on.
 *  Public pages are /<username>/<slug> — the embed image stays
 *  /api/embed/<slug> so existing snippets never break. */
async function revalidateWidget(username: string | null, slug: string): Promise<void> {
  if (username) {
    revalidatePath(`/${username}/${slug}`);
    revalidatePath(`/${username}/${slug}/embed`);
  }
  revalidatePath(`/api/embed/${slug}`);
}

/* ── writes ──────────────────────────────────────────────────── */

export async function createWidget(
  userId: string,
  input: { name?: string; preset?: string; data?: unknown } = {}
): Promise<WidgetResult> {
  const count = await countWidgets(userId);
  if (count >= WIDGET_LIMITS.perUser) {
    return {
      ok: false,
      error: `You've hit the ${WIDGET_LIMITS.perUser}-widget limit for this account.`,
      status: 409,
    };
  }

  const name = (input.name || "Untitled widget").trim().slice(0, WIDGET_LIMITS.nameMax) || "Untitled widget";
  const preset = WIDGET_PRESETS.find((p) => p.key === input.preset);
  const data = input.data
    ? normalizeWidgetData(input.data)
    : preset
      ? preset.data
      : DEFAULT_WIDGET;

  const slug = await freeSlug(input.name ? slugifyWidgetName(name) : `widget-${Math.random().toString(36).slice(2, 6)}`);
  const now = Date.now();
  const id = randomUUID();

  await run(
    "INSERT INTO widgets (id, user_id, slug, name, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, userId, slug, name, JSON.stringify(data), now, now]
  );
  const username = await getOwnedSlug(userId);
  await revalidateWidget(username, slug);

  const widget = await getWidget(userId, id);
  return widget
    ? { ok: true, widget }
    : { ok: false, error: "Widget vanished mid-create. Try again.", status: 500 };
}

export async function updateWidget(
  userId: string,
  id: string,
  input: { name?: string; slug?: string; data?: unknown }
): Promise<WidgetResult> {
  const existing = await getWidget(userId, id);
  if (!existing) return { ok: false, error: "Widget not found.", status: 404 };

  const now = Date.now();
  let slug = existing.slug;

  if (typeof input.slug === "string" && input.slug.toLowerCase() !== existing.slug) {
    const v = validateWidgetSlug(input.slug);
    if (!v.valid) return { ok: false, error: v.message, status: 422 };
    if (await widgetSlugTaken(v.slug, id)) {
      return { ok: false, error: "That link is already used by another widget.", status: 409 };
    }
    slug = v.slug;
  }

  const name =
    typeof input.name === "string"
      ? input.name.trim().slice(0, WIDGET_LIMITS.nameMax) || existing.name
      : existing.name;
  const data = input.data !== undefined ? normalizeWidgetData(input.data) : existing.data;

  await run(
    "UPDATE widgets SET name = ?, slug = ?, data = ?, updated_at = ? WHERE id = ? AND user_id = ?",
    [name, slug, JSON.stringify(data), now, id, userId]
  );

  const username = await getOwnedSlug(userId);
  if (slug !== existing.slug) {
    await revalidateWidget(username, existing.slug);
  }
  await revalidateWidget(username, slug);

  const widget = await getWidget(userId, id);
  return widget
    ? { ok: true, widget }
    : { ok: false, error: "Couldn't re-read the widget. Refresh and retry.", status: 500 };
}

export async function duplicateWidget(userId: string, id: string): Promise<WidgetResult> {
  const existing = await getWidget(userId, id);
  if (!existing) return { ok: false, error: "Widget not found.", status: 404 };

  const count = await countWidgets(userId);
  if (count >= WIDGET_LIMITS.perUser) {
    return {
      ok: false,
      error: `You've hit the ${WIDGET_LIMITS.perUser}-widget limit for this account.`,
      status: 409,
    };
  }

  const name = `${existing.name} copy`.slice(0, WIDGET_LIMITS.nameMax);
  const slug = await freeSlug(`${existing.slug}-copy`.slice(0, 30));
  const now = Date.now();
  const newId = randomUUID();

  await run(
    "INSERT INTO widgets (id, user_id, slug, name, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [newId, userId, slug, name, JSON.stringify(existing.data), now, now]
  );
  const username = await getOwnedSlug(userId);
  await revalidateWidget(username, slug);

  const widget = await getWidget(userId, newId);
  return widget
    ? { ok: true, widget }
    : { ok: false, error: "Copy failed. Try again.", status: 500 };
}

export async function deleteWidget(userId: string, id: string): Promise<{ ok: boolean; slug: string | null }> {
  const existing = await getWidget(userId, id);
  if (!existing) return { ok: false, slug: null };
  await run("DELETE FROM widgets WHERE id = ? AND user_id = ?", [id, userId]);
  const username = await getOwnedSlug(userId);
  await revalidateWidget(username, existing.slug);
  return { ok: true, slug: existing.slug };
}
