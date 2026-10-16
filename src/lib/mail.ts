/**
 * Links — transactional email via Resend.
 * When RESEND_API_KEY is missing (local dev), codes are logged to the
 * server console instead so the whole flow stays testable.
 */
import { Resend } from "resend";
import type { OtpPurpose } from "./types";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const EMAIL_FROM = process.env.EMAIL_FROM || "Links <no-reply@links.namansoni.in>";

export function mailEnabled(): boolean {
  return !!resend;
}

export async function sendOtpEmail(
  email: string,
  code: string,
  purpose: OtpPurpose
): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.log(`\n Postal service is off in dev — OTP for ${email} (${purpose}): ${code}\n`);
    return { ok: true };
  }

  const subject =
    purpose === "signup" ? "Your Links verification code" : "Reset your Links password";

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject,
      html: otpEmailHtml(code, purpose),
    });
    if (error) {
      console.error("Resend error:", error);
      return { ok: false, error: "The mail provider rejected that send. Try again in a moment." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach the mail provider. Try again shortly." };
  }
}

/* ── HTML template ──────────────────────────────────────────── */

function otpEmailHtml(code: string, purpose: OtpPurpose): string {
  const heading =
    purpose === "signup" ? "Verify your email" : "Reset your password";
  const body =
    purpose === "signup"
      ? "Enter this code to finish creating your Links page. It expires in 10 minutes."
      : "Enter this code together with your new password. It expires in 10 minutes.";

  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
  <body style="margin:0;padding:0;background:#f4f3f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f1;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;background:#ffffff;border:1px solid #e7e5e4;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 0;">
              <div style="display:inline-block;width:28px;height:28px;border-radius:7px;background:#EA580C;"></div>
              <div style="font-size:13px;font-weight:600;color:#1c1917;letter-spacing:-0.01em;margin-top:14px;">Links</div>
              <h1 style="margin:4px 0 0;font-size:20px;line-height:1.3;color:#1c1917;letter-spacing:-0.02em;">${heading}</h1>
              <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#57534e;">${body}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 0;">
              <div style="font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:32px;font-weight:600;letter-spacing:0.32em;color:#1c1917;background:#fafaf9;border:1px solid #e7e5e4;border-radius:10px;padding:18px 20px;text-align:center;">
                ${code}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#a8a29e;">
                Didn't request this? You can safely ignore this email — nothing will happen.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:#a8a29e;">links.namansoni.in</p>
      </td></tr>
    </table>
  </body>
</html>`;
}
