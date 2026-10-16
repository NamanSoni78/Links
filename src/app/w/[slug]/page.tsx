import type { Metadata } from "next";
import { WidgetPageView, widgetMetadataFor } from "@/components/widgets/widget-page";

/**
 * Public widget page — /w/<slug>.
 *
 * Cached by the Full Route Cache (revalidate is only a safety net —
 * saves call revalidatePath instantly, which updates this page and its
 * /embed sibling). No searchParams on purpose: reading them would make
 * the route render per-request and burn function CPU on every view.
 */
export const revalidate = 3600;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return widgetMetadataFor(decodeURIComponent(slug).toLowerCase());
}

export default async function WidgetPage({ params }: Props) {
  const { slug } = await params;
  return <WidgetPageView slug={decodeURIComponent(slug).toLowerCase()} embed={false} />;
}
