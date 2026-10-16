import { NextRequest } from "next/server";
import { get, run } from "@/lib/db";
import { hashSecret, verifySecret } from "@/lib/auth";
import { authGuard, fail, ok, LIMITS } from "@/lib/api";

export const runtime = "nodejs";

/** POST /api/account/password — { currentPassword, newPassword } */
export async function POST(req: NextRequest) {
  const guard = await authGuard();
  if (guard.response) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("That request didn't parse. Try again.");
  }

  const { currentPassword, newPassword } = (body ?? {}) as Record<string, unknown>;
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return fail("Fill in both password fields.");
  }
  if (newPassword.length < LIMITS.passwordMin) {
    return fail(`New passwords need at least ${LIMITS.passwordMin} characters.`);
  }

  const user = await get<{ password_hash: string }>(
    "SELECT password_hash FROM users WHERE id = ?",
    [guard.user.id]
  );
  if (!user) return fail("Account not found.", 404);

  const good = await verifySecret(currentPassword, user.password_hash);
  if (!good) return fail("Your current password is incorrect.", 403);

  const passwordHash = await hashSecret(newPassword);
  await run("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", [
    passwordHash,
    Date.now(),
    guard.user.id,
  ]);

  return ok({});
}
