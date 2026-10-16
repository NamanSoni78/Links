import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOwnedSlug } from "@/lib/profiles";
import { DashChrome } from "@/components/dash/dash-chrome";
import { SiteFooter } from "@/components/site-footer";

/**
 * Authenticated app shell — sidebar / top bar + the site footer
 * (Donate · Made by Naman · Terms & Privacy).
 */
export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const slug = await getOwnedSlug(user.id);

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <DashChrome email={user.email} slug={slug} />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-9">
          {children}
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
