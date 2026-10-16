"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AuthHeading, Field, FormError, PasswordInput, SubmitButton } from "@/components/auth/bits";
import { LIMITS } from "@/lib/limits";

export function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = (params.get("email") ?? "").toLowerCase();

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(0);
  const [busy, setBusy] = useState(false);

  if (!email) {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-[14px] text-muted-foreground">
          Start from the{" "}
          <Link
            href="/forgot-password"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            password reset
          </Link>{" "}
          page first.
        </p>
      </div>
    );
  }

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your inbox.");
      setShake((s) => s + 1);
      return;
    }
    if (password.length < LIMITS.passwordMin) {
      setError(`New passwords need at least ${LIMITS.passwordMin} characters.`);
      setShake((s) => s + 1);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "That didn't work. Try again.");
        setShake((s) => s + 1);
        setCode("");
        return;
      }
      toast.success("Password updated — log in with your new one.");
      router.push("/login?reset=1");
    } catch {
      setError("Network hiccup — try again.");
      setShake((s) => s + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="animate-pop-in rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <AuthHeading
          eyebrow="Password reset"
          title="Set a new password"
          sub={
            <>
              Enter the code we sent to{" "}
              <span className="font-medium text-foreground">{email}</span> and
              choose a new password.
            </>
          }
        />

        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormError message={error} shakeKey={shake} />

          <div>
            <label
              htmlFor="reset-code"
              className="mb-1.5 block text-[13px] font-medium text-foreground"
            >
              Reset code
            </label>
            <div className={error ? "animate-shake" : undefined}>
              <InputOTP
                id="reset-code"
                maxLength={6}
                value={code}
                onChange={setCode}
                disabled={busy}
                autoFocus
                aria-label="6-digit reset code"
                containerClassName="justify-start"
              >
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="size-11 rounded-lg border text-lg font-mono font-medium"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <Field
            label="New password"
            htmlFor="new-password"
            hint={`At least ${LIMITS.passwordMin} characters.`}
          >
            <PasswordInput
              id="new-password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              invalid={!!error}
            />
          </Field>

          <SubmitButton busy={busy}>Update password</SubmitButton>
        </form>
      </div>

      <p className="mt-5 text-center text-[13px] text-muted-foreground">
        Code not arriving?{" "}
        <Link
          href="/forgot-password"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Send another
        </Link>
      </p>
    </div>
  );
}
