"use client";

/**
 * Links — widget builder control primitives.
 * Small, dependency-free, tuned to the app's warm-paper design system.
 */
import { useId } from "react";
import { cn } from "@/lib/utils";

export function FieldLabel({
  children,
  hint,
  htmlFor,
}: {
  children: React.ReactNode;
  hint?: string;
  htmlFor?: string;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="text-[12.5px] font-medium text-foreground">
        {children}
      </label>
      {hint && <span className="text-[11.5px] text-muted-foreground/80">{hint}</span>}
    </div>
  );
}

export function Section({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b border-border/70 py-5 first:pt-0 last:border-0", className)}>
      <h3 className="mb-4 flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {icon}
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; aria?: string }[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex max-w-full rounded-lg border border-border bg-muted/40 p-0.5", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.aria ?? (typeof o.label === "string" ? o.label : undefined)}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-7 flex-1 rounded-[6px] px-2.5 text-[12.5px] font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[22px] w-[38px] shrink-0 rounded-full border p-0 transition-colors",
        checked ? "border-foreground/20 bg-foreground" : "border-border bg-muted"
      )}
    >
      <span
        aria-hidden
        className={cn(
          // left-0 anchors the knob to the track (buttons center inline
          // content, so an unanchored absolute span floats mid-track)
          "absolute top-[2px] left-[2px] block size-[16px] rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-[17px]" : "translate-x-0"
        )}
      />
    </button>
  );
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "px",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[12.5px] font-medium text-foreground">
          {label}
        </label>
        <span className="font-mono text-[11.5px] text-muted-foreground">
          {value}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-brand [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-foreground"
      />
    </div>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div className="flex items-center gap-2.5">
      <input
        type="color"
        aria-label={`${label} color picker`}
        value={valid ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-11 shrink-0 self-end cursor-pointer rounded-lg border border-border bg-card p-1"
      />
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="mb-1 block text-[12px] text-muted-foreground">
          {label}
        </label>
        <input
          id={id}
          type="text"
          value={value}
          spellCheck={false}
          aria-invalid={!valid}
          onChange={(e) => onChange(e.target.value.startsWith("#") ? e.target.value : "#" + e.target.value)}
          className={cn(
            "h-8 w-full rounded-md border bg-transparent px-2 font-mono text-[12px] uppercase transition-[box-shadow] outline-none",
            valid
              ? "border-input focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              : "border-destructive focus-visible:ring-destructive/30 focus-visible:ring-[3px]"
          )}
        />
      </div>
    </div>
  );
}

export function ToggleRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-foreground">{label}</p>
        {hint && <p className="text-[11.5px] text-muted-foreground/80">{hint}</p>}
      </div>
      {children}
    </div>
  );
}
