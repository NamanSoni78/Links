/**
 * Links — HTTP basic auth for /admin and /api/admin (server only).
 * Credentials live in ADMIN_USERNAME / ADMIN_PASSWORD env vars, so
 * nothing admin-related is ever stored in the database.
 */
import { NextResponse } from "next/server";

function safeEqual(a: string, b: string): boolean {
  const A = new TextEncoder().encode(a);
  const B = new TextEncoder().encode(b);
  if (A.length !== B.length) return false;
  let diff = 0;
  for (let i = 0; i < A.length; i++) diff |= A[i] ^ B[i];
  return diff === 0;
}

export function adminDisabledResponse(): NextResponse {
  return new NextResponse(
    "Admin panel is disabled. Set ADMIN_USERNAME and ADMIN_PASSWORD environment variables.",
    { status: 503 }
  );
}

export function adminUnauthorizedResponse(): NextResponse {
  const res = new NextResponse("Unauthorized", { status: 401 });
  res.headers.set("WWW-Authenticate", 'Basic realm="Links Admin", charset="UTF-8"');
  return res;
}

/** Verifies a request's basic-auth header. Returns null when OK, or a
 *  401/503 response to return immediately. */
export function verifyAdminRequest(req: Request): NextResponse | null {
  const user = process.env.ADMIN_USERNAME;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) return adminDisabledResponse();

  const header = req.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("basic ")) return adminUnauthorizedResponse();
  try {
    const decoded = atob(header.slice(6).trim());
    const idx = decoded.indexOf(":");
    if (idx === -1) return adminUnauthorizedResponse();
    if (safeEqual(decoded.slice(0, idx), user) && safeEqual(decoded.slice(idx + 1), pass)) {
      return null;
    }
  } catch {
    /* fallthrough */
  }
  return adminUnauthorizedResponse();
}
