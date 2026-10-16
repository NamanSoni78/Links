import { NextRequest } from "next/server";
import { get, run } from "@/lib/db";
import { hashSecret } from "@/lib/auth";
import { checkOtp } from "@/lib/otp";
import { cleanEmail, fail, ok, LIMITS } from "@/lib/api";

export const runtime = "nodejs";

/**
 * POST /api/auth/reset — { email, code, password, token? }
 * Single-step reset: verifies the 6-digit code and sets the new
 * password in one go. (The optional token flow is not needed —
 * possession of a valid code *is* the proof.)
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("That request didn't parse. Try again.");
  }

  const { email, code, password } = (body ?? {}) as Record<string, unknown>;
  const email_ = cleanEmail(email);
  const code_ = typeof code === "string" ? code.trim() : "";

  if (!email_) return fail("Missing email address.");
  if (!/^\d{6}$/.test(code_)) return fail("Enter the 6-digit code from your inbox.");
  if (typeof password !== "string" || password.length < LIMITS.passwordMin) {
    return fail(`New passwords need at least ${LIMITS.passwordMin} characters.`);
  }

  const user = await get<{ id: string }>("SELECT id FROM users WHERE email = ?", [email_]);
  if (!user) return fail("No account found for that email.", 404);

  const result = await checkOtp(email_, "reset", code_);
  if (!result.ok) return fail(result.error, 400);

  const passwordHash = await hashSecret(password);
  await run(
    "UPDATE users SET password_hash = ?, email_verified = 1, failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?",
    [passwordHash, Date.now(), user.id]
  );

  return ok({ redirect: "/login?reset=1" });
}
