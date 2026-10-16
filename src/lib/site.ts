/**
 * Links — site-wide configuration.
 */

export const SITE = {
  name: "Links",
  shortName: "Links",
  tagline: "One link for everything you share.",
  description:
    "Links gives you a fast, clean page for your bio and everything you're into. Pick a username, drop your links, share it anywhere — free forever.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  creator: "Naman Soni",
  creatorUrl: "https://github.com/NamanSoni78",
  donateUrl: "https://payment.namansoni.in/payment",
  emailFrom: "no-reply@links.namansoni.in",
} as const;

export function absoluteUrl(path: string): string {
  const base = SITE.url.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : "/" + path}`;
}

export function profileUrl(slug: string): string {
  return absoluteUrl(`/${slug}`);
}
