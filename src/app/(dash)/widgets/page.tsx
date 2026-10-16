import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { listWidgets } from "@/lib/widgets-db";
import { WidgetsList } from "@/components/widgets/widgets-list";
import { WIDGET_LIMITS } from "@/lib/widgets";

export const metadata: Metadata = {
  title: "Widgets",
  robots: { index: false },
};

export default async function WidgetsPage() {
  const user = await getSessionUser();
  if (!user) return null; // layout already redirects

  const widgets = await listWidgets(user.id);
  const initial = widgets.map(({ id, slug, name, data, updatedAt }) => ({
    id,
    slug,
    name,
    data,
    updatedAt,
  }));
  return <WidgetsList initial={initial} limit={WIDGET_LIMITS.perUser} />;
}
