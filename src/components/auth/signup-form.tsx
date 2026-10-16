"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AtSign } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthHeading, Field, FormError, PasswordInput, SubmitButton } from "@/components/auth/bits";
import { LIMITS } from "@/lib/limits";

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const claimedSlug = params.get("slug");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; agree?: string }>({});
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(0);
  const [busy, setBusy] = useState(false);

  // Hold onto the claimed slug for the dashboard onboarding step.
  useEffect(() => {
    if (claimedSlug && /^[a-z0-9-]{3,30}$/.test(claimedSlug)) {
      try {
        sessionStorage.setItem("links:claimed-slug", claimedSlug);
      } catch {
        /* private mode — fine */
      }
    }
  }, [claimedSlug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof fieldErrors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
      errors.email = "That email address doesn't look right.";
    if (password.length < LIMITS.passwordMin)
      errors.password = `Use at least ${LIMITS.passwordMin} characters.`;
    if (!agree) errors.agree = "Please agree to the terms to continue.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setBusy(true);
    setServerError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, agree }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setServerError(data.error ?? "Something went wrong. Try again.");
        setShake((s) => s + 1);
        return;
      }

      if (data.devCode) {
        try {
          sessionStorage.setItem("links:dev-code", data.devCode);
        } catch {
          /* noop */
        }
      }
      toast.success("Code sent — check your inbox.");
      router.push(`/verify?email=${encodeURIComponent(data.email)}&purpose=signup`);
    } catch {
      setServerError("Network hiccup — check your connection and try again.");
      setShake((s) => s + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="animate-pop-in rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <AuthHeading
          eyebrow="Create your page"
          title="Two minutes and you're live"
          sub={
            claimedSlug
              ? "We're holding that username for you — finish up below."
              : "Free forever. No credit card, no nonsense."
          }
        />

        {claimedSlug && /^[a-z0-9-]{3,30}$/.test(claimedSlug) && (
          <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-border bg-muted/50 px-3.5 py-2.5">
            <AtSign className="size-4 shrink-0 text-brand" />
            <span className="truncate font-mono text-[13px] text-foreground">
              links.namansoni.in/<span className="font-semibold">{claimedSlug}</span>
            </span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormError message={serverError} shakeKey={shake} />

          <Field label="Email" htmlFor="email" error={fieldErrors.email}>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              className="h-10 rounded-lg"
              aria-invalid={!!fieldErrors.email || undefined}
            />
          </Field>

          <Field
            label="Password"
            htmlFor="password"
            error={fieldErrors.password}
            hint={`At least ${LIMITS.passwordMin} characters.`}
          >
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              invalid={!!fieldErrors.password}
            />
          </Field>

          <div>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/60">
              <Checkbox
                checked={agree}
                onCheckedChange={(v) => setAgree(v === true)}
                className="mt-0.5"
                aria-label="Agree to the Terms of Service and Privacy Policy"
              />
              <span className="text-[12.5px] leading-relaxed text-muted-foreground">
                I agree to the{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  Terms of Service
                </Link>{" "}
                and the{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {fieldErrors.agree && (
              <p className="mt-1.5 text-[12.5px] text-destructive" role="alert">
                {fieldErrors.agree}
              </p>
            )}
          </div>

          <SubmitButton busy={busy}>Create account</SubmitButton>
        </form>
      </div>

      <p className="mt-5 text-center text-[13px] text-muted-foreground">
        Already have a page?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
