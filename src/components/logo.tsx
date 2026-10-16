import { cn } from "@/lib/utils";

/** The Links mark — two interlocking chain strokes on an ember tile. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn("size-7", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="15" fill="var(--brand)" />
      <g
        transform="translate(12.8 12.8) scale(1.6)"
        fill="none"
        stroke="var(--brand-foreground)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </g>
    </svg>
  );
}

/** Full wordmark lockup. */
export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Mark className={markClassName} />
      <span className="text-[19px] font-semibold tracking-tight text-foreground">
        Links
      </span>
    </span>
  );
}
