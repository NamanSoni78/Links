import type { Metadata } from "next";
import { WidgetPageView, widgetMetadataFor } from "@/components/widgets/widget-page";

/**
 * Iframe variant — /w/<slug>/embed. A separate path (not ?embed=1) so
 * the CDN can cache it per-path exactly like the full page: iframe
 * traffic never wakes a serverless function after the first view.
 * Transparent background, no attribution — designed to melt into the
 * host site.
 */
export const revalidate = 3600;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return widgetMetadataFor(decodeURIComponent(slug).toLowerCase());
}

export default async function WidgetEmbedPage({ params }: Props) {
  const { slug } = await params;
  return <WidgetPageView slug={decodeURIComponent(slug).toLowerCase()} embed={true} />;
}
