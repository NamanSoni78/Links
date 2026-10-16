import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { fetchPageState } from "@/lib/profiles";
import { PageEditor } from "@/components/editor/page-editor";

export const metadata: Metadata = {
  title: "Your page",
  robots: { index: false },
};

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null; // layout already redirects

  const state = await fetchPageState(user.id);
  return <PageEditor initial={state} />;
}
