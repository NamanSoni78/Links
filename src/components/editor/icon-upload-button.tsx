"use client";

/**
 * Links — tiny icon uploader (link favicons, contact icons).
 *
 * A click opens the file picker; anything over 800 KB is resized and
 * recompressed to 64px right here in the browser, small files stay as
 * they are (animated GIFs included). A ✕ overlay clears the override.
 */
import { useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { processIconFile } from "@/lib/image-client";
import { cn } from "@/lib/utils";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/x-icon,image/bmp,image/avif";

export function IconUploadButton({
  icon,
  onChange,
  size = 18,
  boxClassName,
  ariaLabel,
  fallback,
}: {
  icon: string;
  onChange: (dataUrl: string) => void;
  size?: number;
  boxClassName?: string;
  ariaLabel: string;
  fallback?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const verdict = await processIconFile(file);
      if (!verdict.ok) {
        toast.error(verdict.error);
        return;
      }
      onChange(verdict.dataUrl);
      toast.success("Custom icon set — save to publish it.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <span className={cn("group relative inline-flex", boxClassName)}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={ariaLabel}
        title="Custom icon — click to upload"
        className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none"
      >
        {busy ? (
          <Loader2 className="animate-spin text-muted-foreground" style={{ width: size, height: size }} />
        ) : icon ? (
           
          <img src={icon} alt="" style={{ width: size + 4, height: size + 4 }} className="rounded-[5px] object-contain" />
        ) : (
          fallback
        )}
      </button>
      {icon && !busy && (
        <button
          type="button"
          aria-label="Remove custom icon"
          title="Use the automatic icon"
          onClick={() => onChange("")}
          className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full border border-border bg-card text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-destructive"
        >
          <X className="size-2.5" />
        </button>
      )}
    </span>
  );
}
