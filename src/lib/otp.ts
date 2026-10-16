/**
 * Links — one-time codes for signup verification & password reset.
 * Codes are stored hashed, expire in 10 minutes, allow 6 attempts,
 * and are rate-limited to one send per email per minute.
 */
import { randomUUID } from "node:crypto";
import { get, run } from "./db";
import { hashSecret, verifySecret } from "./auth";
import type { OtpPurpose, OtpRow } from "./types";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 6;

function generateCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, "0");
}

export type IssueResult =
  | { ok: true; code: string }
  | { ok: false; error: string; retryAfterMs: number };

/** Creates + persists a fresh OTP for an email. Enforces a 60s cooldown. */
export async function issueOtp(email: string, purpose: OtpPurpose): Promise<IssueResult> {
  const latest = await get<{ created_at: number }>(
    "SELECT created_at FROM otp_codes WHERE email = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1",
    [email, purpose]
  );
  if (latest && Date.now() - latest.created_at < RESEND_COOLDOWN_MS) {
    const retryAfterMs = RESEND_COOLDOWN_MS - (Date.now() - latest.created_at);
    return {
      ok: false,
      error: "Please wait a moment before requesting another code.",
      retryAfterMs,
    };
  }

  const code = generateCode();
  const codeHash = await hashSecret(code);
  const now = Date.now();

  // Fresh start: drop older codes for this email+purpose, then insert.
  await run("DELETE FROM otp_codes WHERE email = ? AND purpose = ?", [email, purpose]);
  await run(
    "INSERT INTO otp_codes (id, email, code_hash, purpose, attempts, expires_at, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)",
    [randomUUID(), email, codeHash, purpose, now + OTP_TTL_MS, now]
  );

  return { ok: true, code };
}

export type CheckResult = { ok: true } | { ok: false; error: string };

/** Verifies a submitted code. Consumes it on success. */
export async function checkOtp(
  email: string,
  purpose: OtpPurpose,
  code: string
): Promise<CheckResult> {
  const row = await get<OtpRow>(
    "SELECT * FROM otp_codes WHERE email = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1",
    [email, purpose]
  );
  if (!row) return { ok: false, error: "No active code — request a new one." };

  if (Date.now() > row.expires_at) {
    await run("DELETE FROM otp_codes WHERE id = ?", [row.id]);
    return { ok: false, error: "That code expired. Request a new one." };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    await run("DELETE FROM otp_codes WHERE id = ?", [row.id]);
    return { ok: false, error: "Too many wrong tries. Request a new code." };
  }

  const good = await verifySecret(code.trim(), row.code_hash);
  if (!good) {
    const attempts = row.attempts + 1;
    await run("UPDATE otp_codes SET attempts = ? WHERE id = ?", [attempts, row.id]);
    const left = MAX_ATTEMPTS - attempts;
    return {
      ok: false,
      error:
        left > 0
          ? `That code isn't right. ${left} attempt${left === 1 ? "" : "s"} left.`
          : "Too many wrong tries. Request a new code.",
    };
  }

  await run("DELETE FROM otp_codes WHERE id = ?", [row.id]);
  return { ok: true };
}
