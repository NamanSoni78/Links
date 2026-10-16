/**
 * Links — small API helpers + shared limits.
 */
import { NextResponse } from "next/server";
import type { SessionUser } from "./types";
import { getSessionUser } from "./auth";

export function ok<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/** Returns the session user or a 401 response — for API route guards. */
export async function authGuard(): Promise<
  { user: SessionUser; response?: undefined } | { user?: undefined; response: NextResponse }
> {
  const user = await getSessionUser();
  if (!user) return { response: fail("You need to sign in first.", 401) };
  return { user };
}

export const LIMITS = {
  displayNameMax: 50,
  descriptionMax: 160,
  tagsMax: 5,
  tagMax: 24,
  linkTitleMax: 80,
  linkDescMax: 50,
  linksMax: 50,
  contactsMax: 10,
  passwordMin: 8,
} as const;

export function isEmail(s: unknown): s is string {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
}

export function cleanEmail(s: unknown): string {
  return typeof s === "string" ? s.trim().toLowerCase() : "";
}
