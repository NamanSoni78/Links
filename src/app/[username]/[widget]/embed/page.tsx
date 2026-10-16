import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { fetchPublicWidgetPage } from "@/lib/widgets-db";
import { fetchWidgetProfileContext } from "@/lib/profiles";
import { WidgetPageView, widgetMetadataFor } from "@/components/widgets/widget-page";

/**
 * Iframe variant — /<username>/<widget>/embed. A separate path (not
 * ?embed=1) so the CDN can cache it per-path exactly like the full
 * page: iframe traffic never wakes a serverless function after the
 * first view. Transparent background, no attribution — designed to
 * melt into the host site.
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

export default async function WidgetEmbedPage({ params }: Props) {
  const { username: rawUser, widget: rawWidget } = await params;
  const username = decodeURIComponent(rawUser);
  if (username !== username.toLowerCase()) {
    permanentRedirect(`/${username.toLowerCase()}/${rawWidget}/embed`);
  }
  const slug = decodeURIComponent(rawWidget).toLowerCase();

  const found = await fetchPublicWidgetPage(username.toLowerCase(), slug);
  if (!found) notFound();
  const profile = await fetchWidgetProfileContext(found.ownerUserId);

  return (
    <WidgetPageView
      widget={found.widget}
      username={username.toLowerCase()}
      profile={profile}
      embed={true}
    />
  );
}
