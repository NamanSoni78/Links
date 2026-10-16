import type { Metadata } from "next";
import { LegalShell, Section } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of Links — a free link-in-bio service hosted at links.namansoni.in.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="15 October 2026">
      <p className="text-[14px] leading-relaxed text-muted-foreground">
        Links (&ldquo;the service&rdquo;) is a free, independently-run link-in-bio
        service hosted at links.namansoni.in, operated by Naman Soni
        (&ldquo;the operator&rdquo;). By creating an account or using the
        service in any way, you agree to these terms in full. If you do not
        agree, do not use the service.
      </p>

      <Section n={1} title="The service, as it is">
        <p>
          Links lets you create a simple public page listing links you choose
          to share. It is a personal side project, offered free of charge, with
          no uptime commitments, no service-level agreement, and no guarantee
          of any kind. Features may be added, changed or removed at any time.
        </p>
        <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-[13.5px]">
          There is no guarantee that this service will still be running
          tomorrow. It may be paused, changed or shut down at any moment,
          with or without notice. Use it because it is useful today — never
          as infrastructure anything critical depends on.
        </p>
      </Section>

      <Section n={2} title="Your account">
        <p>
          You must provide a working email address and a password. You are
          solely responsible for keeping your credentials safe and for all
          activity that happens under your account. If you suspect someone
          else has access to your account, change your password immediately.
        </p>
        <p>You must be at least 13 years old to create an account.</p>
      </Section>

      <Section n={3} title="Your content and your responsibility for it">
        <p>
          Everything you publish through the service — your display name,
          bio, tags, links and anything those links point to — is your
          content. You alone are responsible for it, including its legality,
          accuracy, and any consequences of sharing it.
        </p>
        <p>
          You agree not to use the service to distribute anything unlawful,
          harassing, hateful, sexually explicit involving minors, misleading,
          infringing, or to distribute malware, phish, or impersonate another
          person or brand. You also agree not to use the service to violate
          any applicable law in India or your own jurisdiction.
        </p>
        <p>
          The operator may, at any time and without notice, remove content or
          suspend accounts that break these rules or that, in the
          operator&apos;s sole judgment, create legal or technical risk for
          the service.
        </p>
      </Section>

      <Section n={4} title="Usernames">
        <p>
          Usernames are available first-come, first-served. Certain usernames
          are reserved for technical or safety reasons and cannot be claimed.
          If you change or abandon your username, it is released back to the
          public — anyone may claim it afterwards, and the operator is not
          responsible for confusion this may cause.
        </p>
        <p>
          Claiming a username that impersonates another person, brand or
          entity you are not affiliated with is not permitted.
        </p>
      </Section>

      <Section n={5} title="No warranties">
        <p>
          The service is provided on an &ldquo;as is&rdquo; and
          &ldquo;as available&rdquo; basis, without warranties of any kind,
          express or implied — including but not limited to warranties of
          merchantability, fitness for a particular purpose, accuracy, or
          non-infringement.
        </p>
        <p>
          The operator does not warrant that the service will be
          uninterrupted, timely, secure, or error-free. Bugs, data loss and
          downtime may happen, and the operator is under no obligation to fix
          anything, ever.
        </p>
      </Section>

      <Section n={6} title="Data security — no guarantees">
        <p>
          The operator does not promise, guarantee or ensure the security of
          your data. While passwords are stored only as cryptographic hashes
          and reasonable care is taken, no system is perfectly secure, this
          service undergoes no professional security audits, and you should
          assume that absolute confidentiality cannot be guaranteed.
        </p>
        <p>
          <strong className="font-semibold text-foreground">
            Do not put anything through this service that you cannot afford
            to lose or to have exposed.
          </strong>{" "}
          You are solely responsible for backing up anything that matters to
          you. The service takes no backups on your behalf, and the operator
          is not responsible for lost, corrupted, or compromised data.
        </p>
      </Section>

      <Section n={7} title="Third-party services">
        <p>
          The service runs on top of third-party infrastructure: hosting is
          provided by Vercel, the database by Turso, transactional email by
          Resend, and link favicons are resolved through Google&apos;s public
          favicon service. These providers have their own terms, policies,
          and reliability characteristics, and the operator is not
          responsible for their actions, outages, or data handling.
        </p>
      </Section>

      <Section n={8} title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, the operator shall not be
          liable to you or anyone else for any indirect, incidental,
          special, consequential, exemplary or punitive damages — including
          lost profits, lost data, loss of goodwill, or business
          interruption — arising from your use of, or inability to use, the
          service, even if the operator has been advised of the possibility
          of such damages.
        </p>
        <p>
          Because the service is free, the operator&apos;s total aggregate
          liability for any claim relating to the service shall not exceed
          the amount you paid for the service — which is zero.
        </p>
      </Section>

      <Section n={9} title="Indemnification">
        <p>
          You agree to indemnify and hold harmless the operator from any
          claim, demand, or damage (including reasonable legal costs) arising
          out of your content, your use of the service, or your breach of
          these terms.
        </p>
      </Section>

      <Section n={10} title="Termination">
        <p>
          You may delete your account at any time from Settings — deletion is
          immediate and permanent, and removes your page, username, and all
          of your links.
        </p>
        <p>
          The operator may suspend or terminate any account, or discontinue
          the entire service, at any time, for any reason or no reason,
          without notice and without liability.
        </p>
      </Section>

      <Section n={11} title="Changes to these terms">
        <p>
          These terms may be revised at any time. The &ldquo;last
          updated&rdquo; date above reflects the current version. Continued
          use of the service after changes means you accept the revised
          terms, so check back occasionally.
        </p>
      </Section>

      <Section n={12} title="Governing law">
        <p>
          These terms are governed by the laws of India, and any disputes
          arising from them fall under the exclusive jurisdiction of the
          courts of the operator&apos;s place of residence.
        </p>
        <p>
          If any part of these terms is found unenforceable, the rest remains
          in force.
        </p>
      </Section>
    </LegalShell>
  );
}
