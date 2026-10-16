"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AuthHeading, FormError } from "@/components/auth/bits";

export function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = (params.get("email") ?? "").toLowerCase();

  const [code, setCode] = useState("");
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(0);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(45);
  const submitted = useRef(false);

  // Local-dev convenience: auto-fill the code that was printed to console.
  useEffect(() => {
    try {
      const devCode = sessionStorage.getItem("links:dev-code");
      if (devCode) {
        sessionStorage.removeItem("links:dev-code");
        setCode(devCode);
      }
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const verify = useCallback(
    async (value: string) => {
      if (submitted.current) return;
      submitted.current = true;
      setBusy(true);
      setServerError("");
      try {
        const res = await fetch("/api/auth/otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code: value, purpose: "signup" }),
        });
        const data = await res.json();

        if (!res.ok || !data.ok) {
          setServerError(data.error ?? "That didn't work. Try again.");
          setShake((s) => s + 1);
          setCode("");
          submitted.current = false;
          return;
        }

        toast.success("Email verified — welcome aboard.");
        router.push("/dashboard");
        router.refresh();
      } catch {
        setServerError("Network hiccup — try again.");
        setShake((s) => s + 1);
        setCode("");
        submitted.current = false;
      } finally {
        setBusy(false);
      }
    },
    [email, router]
  );

  // Auto-submit the moment all six digits are in.
  useEffect(() => {
    if (code.length === 6 && !busy) verify(code);
  }, [code]);

  const resend = async () => {
    setServerError("");
    try {
      const res = await fetch("/api/auth/otp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "signup" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setServerError(data.error ?? "Couldn't resend right now.");
        setShake((s) => s + 1);
        return;
      }
      if (data.devCode) {
        setCode(data.devCode);
        toast.info("Dev mode — code auto-filled.");
      } else {
        toast.success("New code sent.");
      }
      setCooldown(60);
    } catch {
      setServerError("Network hiccup — try again.");
    }
  };

  if (!email) {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-[14px] text-muted-foreground">
          This link is missing an email address. Start again from{" "}
          <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            sign up
          </Link>{" "}
          or{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            log in
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="animate-pop-in rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <AuthHeading
          eyebrow="One last step"
          title="Check your inbox"
          sub={
            <>
              We sent a 6-digit code to{" "}
              <span className="font-medium text-foreground">{email}</span>. It
              expires in 10 minutes.
            </>
          }
        />

        <div className={shake ? "" : ""} key={`shake-${shake}`}>
          <div className={serverError ? "animate-shake" : undefined}>
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              disabled={busy}
              autoFocus
              aria-label="6-digit verification code"
              containerClassName="justify-center"
            >
              <InputOTPGroup className="gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="size-12 rounded-lg border text-lg font-mono font-medium"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="mt-3 min-h-[36px]">
            <FormError message={serverError} shakeKey={shake} />
          </div>
        </div>

        <div className="text-center text-[13px] text-muted-foreground">
          {cooldown > 0 ? (
            <p>
              Didn&apos;t get it? Resend available in{" "}
              <span className="font-mono tabular-nums">{cooldown}s</span>
              <span className="text-muted-foreground/50"> · check spam too</span>
            </p>
          ) : (
            <p>
              Didn&apos;t get it?{" "}
              <button
                type="button"
                onClick={resend}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Send a new code
              </button>
              <span className="text-muted-foreground/50"> · check spam too</span>
            </p>
          )}
        </div>

        <div className="mt-6 border-t border-border pt-4 text-center">
          <Link
            href="/signup"
            className="text-[12.5px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Wrong email? Go back
          </Link>
        </div>
      </div>
    </div>
  );
}
