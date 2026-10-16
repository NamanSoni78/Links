/**
 * Links — /admin + /api/admin basic-auth gate.
 * Credentials come from ADMIN_USERNAME / ADMIN_PASSWORD env vars,
 * so no admin credentials are ever stored in the database.
 * API routes re-verify the header themselves (defense in depth).
 */
import { NextRequest, NextResponse } from "next/server";
import {
  adminDisabledResponse,
  adminUnauthorizedResponse,
} from "@/lib/admin-auth";

export const config = {
  matcher: ["/admin", "/api/admin/:path*"],
};

export function proxy(req: NextRequest) {
  const user = process.env.ADMIN_USERNAME;
  const pass = process.env.ADMIN_PASSWORD;

  if (!user || !pass) {
    return adminDisabledResponse();
  }

  const header = req.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("basic ")) return adminUnauthorizedResponse();

  try {
    const decoded = atob(header.slice(6).trim());
    const idx = decoded.indexOf(":");
    if (idx === -1) return adminUnauthorizedResponse();
    const user_ = decoded.slice(0, idx);
    const pass_ = decoded.slice(idx + 1);

    const A = new TextEncoder().encode(user_);
    const B = new TextEncoder().encode(user);
    const C = new TextEncoder().encode(pass_);
    const D = new TextEncoder().encode(pass);
    const eq = (X: Uint8Array, Y: Uint8Array): boolean => {
      if (X.length !== Y.length) return false;
      let diff = 0;
      for (let i = 0; i < X.length; i++) diff |= X[i] ^ Y[i];
      return diff === 0;
    };
    if (eq(A, B) && eq(C, D)) return NextResponse.next();
  } catch {
    /* fallthrough */
  }

  return adminUnauthorizedResponse();
}
