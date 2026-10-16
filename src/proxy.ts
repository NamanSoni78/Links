/**
 * Links — /admin basic-auth gate.
 * Credentials come from ADMIN_USERNAME / ADMIN_PASSWORD env vars,
 * so no admin credentials are ever stored in the database.
 */
import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/admin"],
};

function safeEqual(a: string, b: string): boolean {
  const A = new TextEncoder().encode(a);
  const B = new TextEncoder().encode(b);
  if (A.length !== B.length) return false;
  let diff = 0;
  for (let i = 0; i < A.length; i++) diff |= A[i] ^ B[i];
  return diff === 0;
}

function unauthorized(): NextResponse {
  const res = new NextResponse("Unauthorized", { status: 401 });
  res.headers.set("WWW-Authenticate", 'Basic realm="Links Admin", charset="UTF-8"');
  return res;
}

export function proxy(req: NextRequest) {
  const user = process.env.ADMIN_USERNAME;
  const pass = process.env.ADMIN_PASSWORD;

  if (!user || !pass) {
    return new NextResponse(
      "Admin panel is disabled. Set ADMIN_USERNAME and ADMIN_PASSWORD environment variables.",
      { status: 503 }
    );
  }

  const header = req.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("basic ")) return unauthorized();

  try {
    const decoded = atob(header.slice(6).trim());
    const idx = decoded.indexOf(":");
    if (idx === -1) return unauthorized();
    const user_ = decoded.slice(0, idx);
    const pass_ = decoded.slice(idx + 1);
    if (safeEqual(user_, user) && safeEqual(pass_, pass)) return NextResponse.next();
  } catch {
    return unauthorized();
  }

  return unauthorized();
}
