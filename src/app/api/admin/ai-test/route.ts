import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { llmConfig } from "@/lib/admin-config";
import { llmChat } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/admin/ai-test — fires a one-line "reply with OK" at the
 * configured endpoint so the admin knows the chain works before
 * flipping the switch. Returns the model that answered.
 */
export async function POST(req: NextRequest) {
  const denied = verifyAdminRequest(req);
  if (denied) return denied;

  const cfg = await llmConfig();
  if (!cfg) return fail("Nothing to test — add an endpoint and a model first (and flip nothing on yet).", 422);

  const result = await llmChat(
    cfg,
    [
      { role: "system", content: "Reply with the single word: OK" },
      { role: "user", content: "ping" },
    ],
    { maxTokens: 10, temperature: 0 }
  );

  if (!result.ok) return fail(result.error, result.status ?? 502);
  return ok({ model: result.model, reply: result.content.slice(0, 40) });
}
