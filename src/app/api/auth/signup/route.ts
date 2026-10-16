import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { get, run } from "@/lib/db";
import { hashSecret } from "@/lib/auth";
import { issueOtp } from "@/lib/otp";
import { sendOtpEmail, mailEnabled } from "@/lib/mail";
import { cleanEmail, fail, isEmail, ok, LIMITS } from "@/lib/api";

export const runtime = "nodejs";

/**
 * POST /api/auth/signup — { email, password, agree }
 * Creates (or re-arms) an unverified account and emails a 6-digit code.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("That request didn't parse. Try again.");
  }

  const { email, password, agree } = (body ?? {}) as Record<string, unknown>;
  const email_ = cleanEmail(email);

  if (!isEmail(email_)) return fail("That email address doesn't look right.");
  if (typeof password !== "string" || password.length < LIMITS.passwordMin) {
    return fail(`Passwords need at least ${LIMITS.passwordMin} characters.`);
  }
  if (agree !== true) {
    return fail("Please agree to the Terms of Service and Privacy Policy.");
  }

  const existing = await get<{ id: string; email_verified: number; password_hash: string }>(
    "SELECT id, email_verified, password_hash FROM users WHERE email = ?",
    [email_]
  );
  if (existing?.email_verified) {
    return fail("An account with this email already exists — try logging in instead.", 409);
  }

  // Issue the code first (respects the 60s cooldown).
  const issued = await issueOtp(email_, "signup");
  if (!issued.ok) {
    return fail(issued.error, 429);
  }

  const sent = await sendOtpEmail(email_, issued.code, "signup");
  if (!sent.ok) {
    return fail(sent.error ?? "Could not send the email. Try again shortly.", 502);
  }

  const now = Date.now();
  const passwordHash = await hashSecret(password);

  if (existing) {
    // Unverified account from an earlier attempt — refresh its password.
    await run("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", [
      passwordHash,
      now,
      existing.id,
    ]);
  } else {
    await run(
      "INSERT INTO users (id, email, password_hash, email_verified, failed_attempts, locked_until, created_at, updated_at) VALUES (?, ?, ?, 0, 0, NULL, ?, ?)",
      [randomUUID(), email_, passwordHash, now, now]
    );
  }

  return ok({
    email: email_,
    // Local-dev convenience only (never in production builds).
    ...(process.env.NODE_ENV !== "production" && !mailEnabled()
      ? { devCode: issued.code }
      : {}),
  });
}
