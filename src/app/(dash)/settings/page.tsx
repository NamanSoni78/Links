import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { SettingsClient } from "@/components/dash/settings-client";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false },
};

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) return null; // layout already redirects

  return <SettingsClient email={user.email} />;
}
