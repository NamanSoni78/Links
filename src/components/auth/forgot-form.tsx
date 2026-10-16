"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { AuthHeading, Field, FormError, SubmitButton } from "@/components/auth/bits";

export function ForgotForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(0);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email_ = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email_)) {
      setError("That email address doesn't look right.");
      setShake((s) => s + 1);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email_ }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setShake((s) => s + 1);
        return;
      }
      setSent(true);
    } catch {
      setError("Network hiccup — check your connection and try again.");
      setShake((s) => s + 1);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="w-full max-w-sm">
        <div className="animate-pop-in rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-brand/30 bg-brand/10">
            <MailCheck className="size-5 text-brand" />
          </div>
          <h1 className="mt-5 text-[22px] font-semibold tracking-tight">Check your inbox</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            If an account exists for{" "}
            <span className="font-medium text-foreground">{email.trim().toLowerCase()}</span>, a
            reset code is on its way. It expires in 10 minutes.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`)}
            className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
          >
            I have the code
            <ArrowRight className="size-4" />
          </button>
          <p className="mt-4 text-[12px] text-muted-foreground">
            Nothing arrived? Check spam, or{" "}
            <Link href="/forgot-password" onClick={() => setSent(false)} className="underline underline-offset-2">
              try again
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="animate-pop-in rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <AuthHeading
          eyebrow="Password reset"
          title="Forgot your password?"
          sub="Enter the email you signed up with and we'll send a reset code."
        />
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormError message={error} shakeKey={shake} />
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              className="h-10 rounded-lg"
              aria-invalid={!!error || undefined}
            />
          </Field>
          <SubmitButton busy={busy}>Send reset code</SubmitButton>
        </form>
      </div>
      <p className="mt-5 text-center text-[13px] text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
