import { NextRequest } from "next/server";
import { authGuard, fail, ok } from "@/lib/api";
import { createWidget, listWidgets } from "@/lib/widgets-db";

export const runtime = "nodejs";

/**
 * GET /api/widgets — your widgets, newest-edited first.
 */
export async function GET() {
  const guard = await authGuard();
  if (guard.response) return guard.response;

  const widgets = await listWidgets(guard.user.id);
  return ok({ widgets });
}

/**
 * POST /api/widgets — create a widget.
 * { name?, preset?: "minimal"|"neon"|"terminal"|"bold"|"paper", data? }
 */
export async function POST(req: NextRequest) {
  const guard = await authGuard();
  if (guard.response) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const b = (body ?? {}) as Record<string, unknown>;

  const result = await createWidget(guard.user.id, {
    name: typeof b.name === "string" ? b.name : undefined,
    preset: typeof b.preset === "string" ? b.preset : undefined,
    data: b.data,
  });
  if (!result.ok) return fail(result.error, result.status ?? 400);

  return ok({ widget: result.widget }, 201);
}
