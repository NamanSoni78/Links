import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { getAiConfigForAdmin, setAiConfig } from "@/lib/admin-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/ai-config — the widget agent's settings.
 * The API key is never echoed: only whether one exists + its last 4.
 */
export async function GET(req: NextRequest) {
  const denied = verifyAdminRequest(req);
  if (denied) return denied;
  return ok({ config: await getAiConfigForAdmin() });
}

/**
 * PUT /api/admin/ai-config — { enabled?, endpoint?, apiKey?, models?, tokenParam? }
 * An empty apiKey keeps the stored one (the form never needs to re-send it).
 */
export async function PUT(req: NextRequest) {
  const denied = verifyAdminRequest(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("That request didn't parse. Try again.");
  }

  const error = await setAiConfig((body ?? {}) as Record<string, unknown>);
  if (error) return fail(error, 422);

  return ok({ config: await getAiConfigForAdmin() });
}
