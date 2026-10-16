import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getWidget } from "@/lib/widgets-db";
import { fetchWidgetProfileContext } from "@/lib/profiles";
import { getOwnedSlug } from "@/lib/profiles";
import { WidgetEditor } from "@/components/widgets/widget-editor";

export const metadata: Metadata = {
  robots: { index: false },
};

export default async function WidgetEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return null; // layout already redirects

  const { id } = await params;
  const widget = await getWidget(user.id, id);
  if (!widget) notFound();

  const [username, profile, h] = await Promise.all([
    getOwnedSlug(user.id),
    fetchWidgetProfileContext(user.id),
    headers(),
  ]);

  // exact host the user is browsing from — embed snippets copy correctly
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;

  return <WidgetEditor initial={widget} origin={origin} username={username} profile={profile} />;
}
