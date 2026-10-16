import type { Metadata } from "next";
import Link from "next/link";
import { fetchAdminOverview } from "@/lib/profiles";
import { getAiConfigForAdmin } from "@/lib/admin-config";
import { AdminAiForm } from "@/components/admin/admin-ai-form";
import { Mark } from "@/components/logo";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, nocache: true },
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card p-5 sm:p-6">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2.5 text-[30px] font-semibold tabular-nums tracking-tight text-foreground">
        {value.toLocaleString("en-IN")}
      </p>
    </div>
  );
}

export default async function AdminPage() {
  const [overview, aiConfig] = await Promise.all([
    fetchAdminOverview(),
    getAiConfigForAdmin(),
  ]);

  // Fill the 14-day chart with zeroes for gap days.
  const days: { day: string; count: number }[] = [];
  const byDay = new Map(overview.daily.map((d) => [d.day, d.count]));
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    days.push({ day: key, count: byDay.get(key) ?? 0 });
  }
  const maxCount = Math.max(1, ...days.map((d) => d.count));

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* header */}
        <header className="flex items-center justify-between pb-8">
          <div className="flex items-center gap-3">
            <Mark className="size-8" />
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
                Operator view
              </p>
              <h1 className="text-[22px] font-semibold tracking-tight">Admin</h1>
            </div>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-border bg-card px-3.5 py-2 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View site
          </Link>
        </header>

        {/* stats */}
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-sm sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total users" value={overview.totals.users} />
          <StatCard label="Verified" value={overview.totals.verified} />
          <StatCard label="Live pages" value={overview.totals.pages} />
          <StatCard label="Links" value={overview.totals.links} />
          <StatCard label="Widgets" value={overview.totals.widgets} />
        </div>

        {/* signup chart */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">
            New signups · last 14 days
          </p>
          <div className="mt-5 flex h-24 items-end gap-1.5 sm:gap-2" role="img" aria-label="Signups per day for the last 14 days">
            {days.map((d) => (
              <div
                key={d.day}
                title={`${d.day}: ${d.count} signup${d.count === 1 ? "" : "s"}`}
                className="group relative flex-1"
              >
                <div
                  className={cn(
                    "w-full rounded-t-[4px] transition-colors",
                    d.count > 0
                      ? "bg-brand/80 group-hover:bg-brand"
                      : "bg-muted group-hover:bg-border"
                  )}
                  style={{
                    height: `${Math.max(d.count > 0 ? 10 : 3, (d.count / maxCount) * 88)}px`,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground/60">
            <span>{days[0]?.day.slice(5)}</span>
            <span>{days[days.length - 1]?.day.slice(5)}</span>
          </div>
        </section>

        {/* AI widget agent */}
        <AdminAiForm initial={aiConfig} />

        {/* users table */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 sm:px-6">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">
              Recent users
            </p>
            <span className="font-mono text-[10.5px] text-muted-foreground/60">
              latest {overview.recent.length}
            </span>
          </div>
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium sm:px-6">Email</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Page</th>
                  <th className="px-4 py-2.5 text-right font-medium">Links</th>
                  <th className="px-5 py-2.5 text-right font-medium sm:px-6">Joined</th>
                </tr>
              </thead>
              <tbody>
                {overview.recent.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground sm:px-6">
                      No users yet — the wilderness is quiet.
                    </td>
                  </tr>
                )}
                {overview.recent.map((u) => (
                  <tr
                    key={u.email}
                    className="border-b border-border/60 last:border-0 hover:bg-accent/40"
                  >
                    <td className="max-w-[220px] truncate px-5 py-3 font-medium sm:px-6">
                      {u.email}
                    </td>
                    <td className="px-4 py-3">
                      {u.verified ? (
                        <span className="rounded-full border border-emerald-600/30 bg-emerald-600/10 px-2 py-[2px] font-mono text-[10.5px] text-emerald-700 dark:text-emerald-400">
                          verified
                        </span>
                      ) : (
                        <span className="rounded-full border border-border bg-muted px-2 py-[2px] font-mono text-[10.5px] text-muted-foreground">
                          pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.slug ? (
                        <a
                          href={`/${u.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[12px] text-brand underline-offset-2 hover:underline"
                        >
                          /{u.slug}
                        </a>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {u.linkCount}
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground sm:px-6">
                      {dateFormatter.format(u.joinedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-6 text-center font-mono text-[10.5px] text-muted-foreground/50">
          Protected by HTTP Basic authentication · credentials live in environment variables
        </p>
      </div>
    </div>
  );
}
