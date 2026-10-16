import { NextRequest } from "next/server";
import { authGuard, fail, ok } from "@/lib/api";
import { deleteWidget, getWidget, updateWidget } from "@/lib/widgets-db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/widgets/[id] — one owned widget.
 */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const guard = await authGuard();
  if (guard.response) return guard.response;

  const { id } = await params;
  const widget = await getWidget(guard.user.id, id);
  if (!widget) return fail("Widget not found.", 404);
  return ok({ widget });
}

/**
 * PATCH /api/widgets/[id] — rename / change link / save design.
 * { name?, slug?, data? } — all optional.
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const guard = await authGuard();
  if (guard.response) return guard.response;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("That request didn't parse. Try again.");
  }
  const b = (body ?? {}) as Record<string, unknown>;

  const result = await updateWidget(guard.user.id, id, {
    name: typeof b.name === "string" ? b.name : undefined,
    slug: typeof b.slug === "string" ? b.slug : undefined,
    data: b.data,
  });
  if (!result.ok) return fail(result.error, result.status ?? 400);

  return ok({ widget: result.widget });
}

/**
 * DELETE /api/widgets/[id] — remove a widget (its embeds stop
 * rendering everywhere; the cached images expire on their own).
 */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const guard = await authGuard();
  if (guard.response) return guard.response;

  const { id } = await params;
  const result = await deleteWidget(guard.user.id, id);
  if (!result.ok) return fail("Widget not found.", 404);
  return ok({ deleted: true });
}
