import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getWidget } from "@/lib/widgets-db";
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

  // exact host the user is browsing from — embed snippets copy correctly
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;

  return <WidgetEditor initial={widget} origin={origin} />;
}
