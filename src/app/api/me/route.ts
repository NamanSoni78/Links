import { getSessionUser } from "@/lib/auth";
import { get } from "@/lib/db";
import { ok } from "@/lib/api";

export const runtime = "nodejs";

/**
 * GET /api/me — light session probe used by the public profile page
 * to show the "Edit page" pill to owners. Stays out of the page's
 * server render so public profiles remain statically cached.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return ok({ user: null });

  const profile = await get<{ slug: string | null }>(
    "SELECT slug FROM profiles WHERE user_id = ?",
    [user.id]
  );

  return ok({
    user: { email: user.email },
    profile: profile?.slug ? { slug: profile.slug } : null,
  });
}
