import { destroySession } from "@/lib/auth";
import { ok } from "@/lib/api";

export const runtime = "nodejs";

/** POST /api/auth/logout — clears the session cookie. */
export async function POST() {
  await destroySession();
  return ok({});
}
