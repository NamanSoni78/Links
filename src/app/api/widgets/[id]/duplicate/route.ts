import { NextRequest } from "next/server";
import { authGuard, fail, ok } from "@/lib/api";
import { duplicateWidget } from "@/lib/widgets-db";

export const runtime = "nodejs";

/**
 * POST /api/widgets/[id]/duplicate — copy a widget (name + design).
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await authGuard();
  if (guard.response) return guard.response;

  const { id } = await params;
  const result = await duplicateWidget(guard.user.id, id);
  if (!result.ok) return fail(result.error, result.status ?? 400);

  return ok({ widget: result.widget }, 201);
}
