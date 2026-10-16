import type { MetadataRoute } from "next";
import { all } from "@/lib/db";
import { SITE } from "@/lib/site";

/**
 * Sitemap — static routes + every claimed public page.
 * Regenerated at most once an hour; if the database is unreachable at
 * build time (fresh deploys), it degrades to the static routes only.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url.replace(/\/$/, "");
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const rows = await all<{ slug: string; updated_at: number }>(
      "SELECT slug, updated_at FROM profiles WHERE slug IS NOT NULL"
    );
    const profileRoutes: MetadataRoute.Sitemap = rows.map((r) => ({
      url: `${base}/${r.slug}`,
      lastModified: new Date(r.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
    return [...staticRoutes, ...profileRoutes];
  } catch {
    return staticRoutes;
  }
}
