import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { fetchPublicProfile } from "@/lib/profiles";
import { ProfileView } from "@/components/public-view/profile-view";
import { PublicTopBar } from "@/components/public-view/public-top-bar";
import { Mark } from "@/components/logo";
import { SITE, profileUrl, absoluteUrl } from "@/lib/site";

/**
 * Public profile — statically cached by the Full Route Cache and served
 * from the CDN (revalidated instantly whenever the owner saves).
 * `revalidate` is only a safety net.
 */
export const revalidate = 3600;

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  const slug = decodeURIComponent(username).toLowerCase();
  const profile = await fetchPublicProfile(slug);

  if (!profile) {
    return { title: "Page not found", robots: { index: false } };
  }

  const title = `${profile.displayName} (@${profile.slug})`;
  const description =
    profile.description ||
    `All of ${profile.displayName}'s links in one place — on Links.`;

  return {
    title,
    description,
    alternates: { canonical: `/${profile.slug}` },
    openGraph: {
      title,
      description,
      url: profileUrl(profile.slug),
      siteName: SITE.name,
      type: "profile",
      images: [{ url: `/api/og?u=${profile.slug}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ProfilePage({ params }: Params) {
  const { username } = await params;
  const raw = decodeURIComponent(username);

  // Usernames are lowercase — redirect typed-in capitals for one clean URL.
  if (raw !== raw.toLowerCase()) permanentRedirect(`/${raw.toLowerCase()}`);

  const profile = await fetchPublicProfile(raw.toLowerCase());
  if (!profile) notFound();

  const email = profile.contacts.find((c) => c.kind === "email");
  const phone = profile.contacts.find((c) => c.kind === "phone");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: profile.displayName,
      alternateName: `@${profile.slug}`,
      description: profile.description || undefined,
      url: profileUrl(profile.slug),
      image: absoluteUrl(`/api/og?u=${profile.slug}`),
      email: email ? email.value : undefined,
      telephone: phone ? phone.value : undefined,
      sameAs: profile.links.slice(0, 20).map((l) => l.url),
    },
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicTopBar slug={profile.slug} url={profileUrl(profile.slug)} />

      <main className="mx-auto flex w-full max-w-2xl flex-1 justify-center">
        <div className="w-full">
          <ProfileView profile={profile} />
        </div>
      </main>

      <footer className="border-t border-border/60 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-center px-4 py-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground/70 transition-colors hover:text-muted-foreground"
          >
            <Mark className="size-3.5 opacity-70" />
            Created with <span className="font-medium">Links</span>
          </Link>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}
