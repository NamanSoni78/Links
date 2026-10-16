import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { fetchPublicWidgetPage } from "@/lib/widgets-db";
import { fetchWidgetProfileContext } from "@/lib/profiles";
import { WidgetPageView, widgetMetadataFor } from "@/components/widgets/widget-page";

/**
 * Public widget page — /<username>/<widget>.
 *
 * Cached by the Full Route Cache (revalidate is only a safety net —
 * saves call revalidatePath instantly, which updates this page and its
 * /embed sibling). No searchParams on purpose: reading them would make
 * the route render per-request and burn function CPU on every view.
 */
export const revalidate = 3600;

type Props = {
  params: Promise<{ username: string; widget: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, widget } = await params;
  return widgetMetadataFor(
    decodeURIComponent(username).toLowerCase(),
    decodeURIComponent(widget).toLowerCase()
  );
}

export default async function WidgetPage({ params }: Props) {
  const { username: rawUser, widget: rawWidget } = await params;
  const username = decodeURIComponent(rawUser);
  if (username !== username.toLowerCase()) {
    permanentRedirect(`/${username.toLowerCase()}/${rawWidget}`);
  }
  const slug = decodeURIComponent(rawWidget).toLowerCase();

  const found = await fetchPublicWidgetPage(username.toLowerCase(), slug);
  if (!found) notFound();
  const profile = await fetchWidgetProfileContext(found.ownerUserId);

  return <WidgetPageView widget={found.widget} username={username.toLowerCase()} profile={profile} embed={false} />;
}
