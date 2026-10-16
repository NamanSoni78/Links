import { authGuard, ok } from "@/lib/api";
import { aiAgentVisible } from "@/lib/admin-config";

export const runtime = "nodejs";

/**
 * GET /api/widgets/ai/status — is the "make with AI" option available?
 * Just a boolean; endpoints/keys never leave the server.
 */
export async function GET() {
  const guard = await authGuard();
  if (guard.response) return guard.response;
  return ok({ visible: await aiAgentVisible() });
}
