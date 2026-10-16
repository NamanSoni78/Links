import { authGuard, fail, ok } from "@/lib/api";
import { deleteAccountCascade } from "@/lib/profiles";
import { destroySession } from "@/lib/auth";
import { get } from "@/lib/db";

export const runtime = "nodejs";

/** DELETE /api/account — permanently removes the account, page and links. */
export async function DELETE() {
  const guard = await authGuard();
  if (guard.response) return guard.response;

  const profile = await get<{ slug: string | null }>(
    "SELECT slug FROM profiles WHERE user_id = ?",
    [guard.user.id]
  );

  await deleteAccountCascade(guard.user.id, profile?.slug ?? null);
  await destroySession();

  return ok({});
}
