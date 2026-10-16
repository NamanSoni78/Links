"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Label + control + inline error, used across all auth forms. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[13px] font-medium text-foreground"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[12.5px] leading-snug text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Password input with a show/hide toggle. */
export function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  invalid?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        className="h-10 rounded-lg pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

/** Submit button with a busy state. */
export function SubmitButton({
  busy,
  children,
  className,
}: {
  busy: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="submit"
      disabled={busy}
      className={cn("h-10 w-full rounded-lg text-[14px]", className)}
    >
      {busy && <Loader2 className="size-4 animate-spin" />}
      {children}
    </Button>
  );
}

/** The mono eyebrow + heading at the top of each auth card. */
export function AuthHeading({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand">{eyebrow}</p>
      <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-foreground">{title}</h1>
      {sub && <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** Top-level form error with a shake. */
export function FormError({ message, shakeKey }: { message: string; shakeKey: number }) {
  if (!message) return null;
  return (
    <div
      key={shakeKey}
      role="alert"
      className="animate-shake rounded-lg border border-destructive/30 bg-destructive/8 px-3.5 py-2.5 text-[13px] leading-snug text-destructive"
    >
      {message}
    </div>
  );
}
