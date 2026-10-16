"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { AuthHeading, Field, FormError, PasswordInput, SubmitButton } from "@/components/auth/bits";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const justReset = params.get("reset") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(0);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof fieldErrors = {};
    if (!email.trim()) errors.email = "Enter your email address.";
    if (!password) errors.password = "Enter your password.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setBusy(true);
    setServerError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setServerError(data.error ?? "Something went wrong. Try again.");
        setShake((s) => s + 1);
        return;
      }

      if (data.needsVerification) {
        router.push(`/verify?email=${encodeURIComponent(data.email)}&purpose=signup`);
        return;
      }

      toast.success("Welcome back.");
      router.push("/dashboard");
      router.refresh();
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
          eyebrow="Welcome back"
          title="Log in to your page"
          sub="Pick up right where you left off."
        />

        {justReset && (
          <div className="mb-4 rounded-lg border border-emerald-600/30 bg-emerald-600/8 px-3.5 py-2.5 text-[13px] text-emerald-700 dark:text-emerald-400">
            Password updated — log in with your new one.
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

          <Field label="Password" htmlFor="password" error={fieldErrors.password}>
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              invalid={!!fieldErrors.password}
            />
          </Field>

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-[12.5px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <SubmitButton busy={busy}>Log in</SubmitButton>
        </form>
      </div>

      <p className="mt-5 text-center text-[13px] text-muted-foreground">
        New here?{" "}
        <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
          Create your page
        </Link>
      </p>
    </div>
  );
}
