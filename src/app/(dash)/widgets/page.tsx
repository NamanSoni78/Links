import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { listWidgets } from "@/lib/widgets-db";
import { fetchWidgetProfileContext, getOwnedSlug } from "@/lib/profiles";
import { aiAgentVisible } from "@/lib/admin-config";
import { WidgetsList } from "@/components/widgets/widgets-list";
import { WIDGET_LIMITS } from "@/lib/widgets";

export const metadata: Metadata = {
  title: "Widgets",
  robots: { index: false },
};

export default async function WidgetsPage() {
  const user = await getSessionUser();
  if (!user) return null; // layout already redirects

  const [widgets, username, profile, aiVisible] = await Promise.all([
    listWidgets(user.id),
    getOwnedSlug(user.id),
    fetchWidgetProfileContext(user.id),
    aiAgentVisible(),
  ]);

  const initial = widgets.map(({ id, slug, name, data, updatedAt }) => ({
    id,
    slug,
    name,
    data,
    updatedAt,
  }));
  return (
    <WidgetsList
      initial={initial}
      limit={WIDGET_LIMITS.perUser}
      username={username}
      aiVisible={aiVisible}
      profile={profile}
    />
  );
}
