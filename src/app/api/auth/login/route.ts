import { NextRequest } from "next/server";
import { get, run } from "@/lib/db";
import { createSession, verifySecret } from "@/lib/auth";
import { issueOtp } from "@/lib/otp";
import { sendOtpEmail, mailEnabled } from "@/lib/mail";
import { cleanEmail, fail, ok } from "@/lib/api";

export const runtime = "nodejs";

const MAX_FAILED = 10;
const LOCK_MS = 15 * 60 * 1000;

/**
 * POST /api/auth/login — { email, password }
 * Signs the user in, or flags unverified accounts so the client can
 * route them to verification.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("That request didn't parse. Try again.");
  }

  const { email, password } = (body ?? {}) as Record<string, unknown>;
  const email_ = cleanEmail(email);
  if (!email_ || typeof password !== "string" || !password) {
    return fail("Enter your email and password.");
  }

  const user = await get<{
    id: string;
    password_hash: string;
    email_verified: number;
    failed_attempts: number;
    locked_until: number | null;
  }>("SELECT * FROM users WHERE email = ?", [email_]);

  const notRight = () => fail("Email or password is incorrect.", 401);

  if (!user) return notRight();

  if (user.locked_until && user.locked_until > Date.now()) {
    const mins = Math.ceil((user.locked_until - Date.now()) / 60000);
    return fail(`Too many attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`, 429);
  }

  const good = await verifySecret(password, user.password_hash);
  if (!good) {
    const attempts = user.failed_attempts + 1;
    if (attempts >= MAX_FAILED) {
      await run(
        "UPDATE users SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?",
        [attempts, Date.now() + LOCK_MS, Date.now(), user.id]
      );
      return fail("Too many attempts. Try again in 15 minutes.", 429);
    }
    await run("UPDATE users SET failed_attempts = ?, updated_at = ? WHERE id = ?", [
      attempts,
      Date.now(),
      user.id,
    ]);
    return notRight();
  }

  // Correct password from here on.
  if (!user.email_verified) {
    const issued = await issueOtp(email_, "signup");
    if (issued.ok) {
      const sent = await sendOtpEmail(email_, issued.code, "signup");
      if (!sent.ok) return fail(sent.error ?? "Could not send the email. Try again shortly.", 502);
      return ok({
        needsVerification: true,
        email: email_,
        ...(process.env.NODE_ENV !== "production" && !mailEnabled()
          ? { devCode: issued.code }
          : {}),
      });
    }
    return ok({ needsVerification: true, email: email_ });
  }

  if (user.failed_attempts > 0 || user.locked_until) {
    await run(
      "UPDATE users SET failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?",
      [Date.now(), user.id]
    );
  }

  await createSession(user.id, email_);
  return ok({ redirect: "/dashboard" });
}
