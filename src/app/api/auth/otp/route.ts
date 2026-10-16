import { NextRequest } from "next/server";
import { get, run } from "@/lib/db";
import { checkOtp } from "@/lib/otp";
import { createSession } from "@/lib/auth";
import { cleanEmail, fail, ok } from "@/lib/api";

export const runtime = "nodejs";

/**
 * POST /api/auth/otp — { email, code, purpose }
 * purpose = "signup": verifies the code, activates the account, signs in.
 * purpose = "reset":  verifies the code so the reset page can continue.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("That request didn't parse. Try again.");
  }

  const { email, code, purpose } = (body ?? {}) as Record<string, unknown>;
  const email_ = cleanEmail(email);
  const code_ = typeof code === "string" ? code.trim() : "";

  if (!email_ || !/^\d{6}$/.test(code_)) {
    return fail("Enter the 6-digit code from your inbox.");
  }

  const user = await get<{ id: string; email_verified: number }>(
    "SELECT id, email_verified FROM users WHERE email = ?",
    [email_]
  );
  if (!user) return fail("No account found for that email.", 404);

  if (purpose === "signup") {
    if (user.email_verified) {
      return fail("This email is already verified — log in instead.", 409);
    }
    const result = await checkOtp(email_, "signup", code_);
    if (!result.ok) return fail(result.error, 400);

    await run(
      "UPDATE users SET email_verified = 1, failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?",
      [Date.now(), user.id]
    );
    await createSession(user.id, email_);
    return ok({ redirect: "/dashboard" });
  }

  if (purpose === "reset") {
    const result = await checkOtp(email_, "reset", code_);
    if (!result.ok) return fail(result.error, 400);
    return ok({ email: email_ });
  }

  return fail("Unknown code purpose.");
}
