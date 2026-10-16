import { NextRequest } from "next/server";
import { get } from "@/lib/db";
import { issueOtp } from "@/lib/otp";
import { sendOtpEmail, mailEnabled } from "@/lib/mail";
import { cleanEmail, fail, ok } from "@/lib/api";

export const runtime = "nodejs";

/**
 * POST /api/auth/otp/resend — { email, purpose }
 * Re-sends the code (60s cooldown per email). Never reveals
 * whether an account exists.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("That request didn't parse. Try again.");
  }

  const { email, purpose } = (body ?? {}) as Record<string, unknown>;
  const email_ = cleanEmail(email);
  if (!email_) return fail("Missing email address.");

  const user = await get<{ id: string; email_verified: number }>(
    "SELECT id, email_verified FROM users WHERE email = ?",
    [email_]
  );

  const genericMessage =
    "If an account exists for that email, a fresh code is on its way. It expires in 10 minutes.";

  if (!user) return ok({ message: genericMessage });

  if (purpose === "signup" && user.email_verified) {
    return ok({ message: "This email is already verified — log in instead." });
  }

  const issued = await issueOtp(email_, purpose === "reset" ? "reset" : "signup");
  if (!issued.ok) return fail(issued.error, 429);

  const sent = await sendOtpEmail(email_, issued.code, purpose === "reset" ? "reset" : "signup");
  if (!sent.ok) return fail(sent.error ?? "Could not send the email. Try again shortly.", 502);

  return ok({
    message: genericMessage,
    ...(process.env.NODE_ENV !== "production" && !mailEnabled()
      ? { devCode: issued.code }
      : {}),
  });
}
