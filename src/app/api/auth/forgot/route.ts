import { NextRequest } from "next/server";
import { get } from "@/lib/db";
import { issueOtp } from "@/lib/otp";
import { sendOtpEmail, mailEnabled } from "@/lib/mail";
import { cleanEmail, fail, ok } from "@/lib/api";

export const runtime = "nodejs";

/**
 * POST /api/auth/forgot — { email }
 * Emails a reset code if the account exists. The response is always
 * the same either way, so it never reveals which emails are registered.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("That request didn't parse. Try again.");
  }

  const { email } = (body ?? {}) as Record<string, unknown>;
  const email_ = cleanEmail(email);
  if (!email_) return fail("Enter the email you signed up with.");

  const user = await get<{ id: string }>("SELECT id FROM users WHERE email = ?", [email_]);
  const genericMessage =
    "If an account exists for that email, a reset code is on its way. It expires in 10 minutes.";

  if (user) {
    const issued = await issueOtp(email_, "reset");
    if (issued.ok) {
      const sent = await sendOtpEmail(email_, issued.code, "reset");
      if (!sent.ok) {
        return fail(sent.error ?? "Could not send the email. Try again shortly.", 502);
      }
      // Local-dev convenience only (never in production builds).
      return ok({
        message: genericMessage,
        ...(process.env.NODE_ENV !== "production" && !mailEnabled()
          ? { devCode: issued.code }
          : {}),
      });
    }
    // If cooldown hit, still return the generic message — no leakage.
  }

  return ok({
    message: genericMessage,
    ...(process.env.NODE_ENV !== "production" && !mailEnabled() && user
      ? { devHint: "dev mode: check the server console for the code" }
      : {}),
  });
}
