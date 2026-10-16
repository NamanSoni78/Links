import type { Metadata } from "next";
import { LegalShell, Section } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Links collects (very little), what it never does, and the honest truth about data security on a free indie service.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="15 October 2026">
      <p className="text-[14px] leading-relaxed text-muted-foreground">
        Links is a small, free, independently-run project, not a company.
        This policy explains, plainly and honestly, what happens to the
        little data the service holds. It applies to links.namansoni.in and
        is written to be read by a human being.
      </p>

      <Section n={1} title="What we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-foreground">Your email address</strong> —
            used to verify your account, send login codes, and reset your
            password. Nothing else.
          </li>
          <li>
            <strong className="font-medium text-foreground">Your password</strong> —
            stored only as a salted PBKDF2 hash. Nobody, including the
            operator, can see or recover the original.
          </li>
          <li>
            <strong className="font-medium text-foreground">Your page content</strong> —
            the display name, bio, tags and links you publish. Remember:
            this content is public by design; anyone can see your page.
          </li>
          <li>
            <strong className="font-medium text-foreground">Verification codes</strong> —
            one-time email codes are stored hashed, expire in ten minutes,
            and are deleted once used.
          </li>
          <li>
            <strong className="font-medium text-foreground">Routine infrastructure logs</strong> —
            our hosting and database providers (Vercel, Turso) keep standard
            server logs, such as IP addresses, as part of running the
            internet. We do not analyze them and do not use them to profile
            anyone.
          </li>
        </ul>
      </Section>

      <Section n={2} title="What we never do">
        <ul className="list-disc space-y-2 pl-5">
          <li>No analytics — we don&apos;t count your visitors.</li>
          <li>No tracking pixels, no fingerprinting, no ad networks.</li>
          <li>No advertising of any kind.</li>
          <li>No selling, renting or sharing your data with anyone.</li>
          <li>No profiling, no audience building, no &ldquo;business partners&rdquo;.</li>
        </ul>
      </Section>

      <Section n={3} title="Cookies">
        <p>
          The service sets exactly one cookie: an httpOnly session cookie that
          keeps you logged in. It contains a signed token, not your data, and
          expires after 30 days or when you sign out. There are no
          third-party cookies and no consent banner, because there is
          nothing to consent to.
        </p>
      </Section>

      <Section n={4} title="Third parties involved in running the service">
        <p>
          The service stands on the shoulders of three providers, plus one
          for icons:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="font-medium text-foreground">Vercel</strong> — hosts the website and serves pages.</li>
          <li><strong className="font-medium text-foreground">Turso</strong> — stores the database.</li>
          <li><strong className="font-medium text-foreground">Resend</strong> — delivers verification and password-reset emails.</li>
          <li><strong className="font-medium text-foreground">Google favicon service</strong> — when a public page is viewed, the small icons next to links are fetched through Google&apos;s public favicon service, which therefore sees the domains of those links.</li>
        </ul>
        <p>
          Each of these providers processes data under their own privacy
          policies and terms. The operator chose reputable providers but is
          not responsible for their conduct.
        </p>
      </Section>

      <Section n={5} title="Data security — the honest part">
        <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-[13.5px]">
          We do not guarantee the security of your data. Period. Passwords
          are hashed and reasonable care is taken, but this is a free indie
          service with no dedicated security team and no audits. You should
          assume that absolute confidentiality cannot be guaranteed, and you
          use the service at your own risk.
        </p>
        <p>
          All responsibility for what you choose to store here — and for
          keeping your own backups — rests with you. If losing it would hurt,
          keep a copy somewhere else.
        </p>
      </Section>

      <Section n={6} title="No backups, and no promises about tomorrow">
        <p>
          The service does not maintain off-site backups of your content.
          Data loss, while not expected, is possible at any time, and the
          service itself may be paused or shut down at any time without
          notice — there is no guarantee it will exist tomorrow. Please treat
          Links as a convenient front door to your links, not as the only
          place they live.
        </p>
      </Section>

      <Section n={7} title="Your choices">
        <p>
          You can export or copy your links at any time, and you can delete
          your account permanently from Settings — deletion removes your
          page, your username and every link immediately. If you need a hand
          with either, reach out via GitHub and it will be sorted, time
          permitting.
        </p>
      </Section>

      <Section n={8} title="Children">
        <p>
          The service is not intended for children under 13, and accounts
          belonging to children under 13 will be deleted when discovered.
        </p>
      </Section>

      <Section n={9} title="Changes to this policy">
        <p>
          This policy may be updated at any time. The &ldquo;last
          updated&rdquo; date at the top always reflects the current version,
          and continued use of the service after changes means you accept it.
        </p>
      </Section>
    </LegalShell>
  );
}
