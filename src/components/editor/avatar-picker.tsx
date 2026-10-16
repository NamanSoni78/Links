"use client";

/**
 * Links — circular avatar cropper.
 *
 * Pick a photo → drag to position + zoom → we crop a 256px circle and
 * compress it right here in the browser (WebP/JPEG ladder), so what's
 * saved is a ~20–120 KB data URL. Files over 5 MB are rejected before
 * anything loads.
 */
import { useCallback, useRef, useState } from "react";
import { Camera, Check, Loader2, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  clampCrop,
  cropToDataUrl,
  drawRect,
  loadImageEl,
  readAsFile,
  type CropState,
} from "@/lib/image-client";
import { cn } from "@/lib/utils";

const VIEWPORT = 264; // px, square stage
const AVATAR_OUT_PX = 256;
const AVATAR_TARGET_CHARS = 170_000; // ≈125 KB binary

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return "L";
}

export function AvatarPicker({
  avatar,
  displayName,
  onChange,
}: {
  avatar: string;
  displayName: string;
  onChange: (dataUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<CropState>({ zoom: 1, offsetX: 0, offsetY: 0 });
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  const pick = () => inputRef.current?.click();

  const onFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setBusy(true);
      try {
        if (file.size > 5 * 1024 * 1024) {
          toast.error("That image is over 5 MB — pick a smaller one.");
          return;
        }
        const dataUrl = await readAsFile(file);
        const el = await loadImageEl(dataUrl);
        if (Math.max(el.naturalWidth, el.naturalHeight) < 80) {
          toast.error("That image is too tiny — try something at least 80px wide.");
          return;
        }
        setImg(el);
        setCrop({ zoom: 1, offsetX: 0, offsetY: 0 });
        setOpen(true);
      } catch {
        toast.error("That file wouldn't open as an image.");
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    []
  );

  const apply = () => {
    if (!img) return;
    const out = cropToDataUrl(img, VIEWPORT, crop, AVATAR_OUT_PX, AVATAR_TARGET_CHARS);
    if (!out) {
      toast.error("The crop failed — try again.");
      return;
    }
    onChange(out);
    setOpen(false);
    setImg(null);
    toast.success("Profile photo updated — save to publish it.");
  };

  const rect = img ? drawRect(img, VIEWPORT, crop) : null;

  return (
    <div className="flex items-center gap-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif"
        className="sr-only"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />

      <button
        type="button"
        onClick={pick}
        aria-label="Choose a profile photo"
        className="group relative size-20 shrink-0 overflow-hidden rounded-full border border-border shadow-sm transition-all hover:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none"
        style={{ backgroundColor: "var(--muted)" }}
      >
        {avatar ? (
           
          <img src={avatar} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-[24px] font-semibold tracking-tight text-white" style={{ backgroundColor: "#C2410C" }}>
            {initialsOf(displayName)}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-foreground/45 opacity-0 transition-opacity group-hover:opacity-100">
          {busy ? (
            <Loader2 className="size-5 animate-spin text-white" />
          ) : (
            <Camera className="size-5 text-white" />
          )}
        </span>
      </button>

      <div className="min-w-0">
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          className="text-[13px] font-medium text-foreground underline-offset-4 transition-colors hover:text-brand hover:underline disabled:opacity-50"
        >
          {avatar ? "Change photo" : "Add a photo"}
        </button>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
          Circle-cropped in your browser · over 1 MB is compressed
          automatically · 5 MB max.
        </p>
        {avatar && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="mt-1.5 text-[12px] font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-destructive hover:underline"
          >
            Remove photo
          </button>
        )}
      </div>

      {/* ── crop dialog ── */}
      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Position your photo</DialogTitle>
            <DialogDescription>
              Drag to move, pinch the slider to zoom — the circle is what
              visitors see.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4">
            <div
              className="relative touch-none overflow-hidden rounded-xl border border-border bg-muted select-none"
              style={{ width: VIEWPORT, height: VIEWPORT, maxWidth: "100%" }}
              onPointerDown={(e) => {
                if (!img) return;
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                dragRef.current = { x: crop.offsetX, y: crop.offsetY, startX: e.clientX, startY: e.clientY };
              }}
              onPointerMove={(e) => {
                const d = dragRef.current;
                if (!d || !img) return;
                setCrop((c) =>
                  clampCrop(img, VIEWPORT, {
                    ...c,
                    offsetX: d.x + (e.clientX - d.startX),
                    offsetY: d.y + (e.clientY - d.startY),
                  })
                );
              }}
              onPointerUp={() => (dragRef.current = null)}
              onPointerCancel={() => (dragRef.current = null)}
            >
              {img && rect && (
                 
                <img
                  src={img.src}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute origin-top-left"
                  style={{
                    left: rect.left,
                    top: rect.top,
                    width: img.naturalWidth * rect.scale,
                    height: img.naturalHeight * rect.scale,
                  }}
                />
              )}
              {/* circular mask */}
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-0",
                  "[mask-image:radial-gradient(circle_at_center,transparent_62.5%,black_63%)]"
                )}
                style={{ backgroundColor: "rgb(0 0 0 / 0.55)" }}
              />
            </div>

            <div className="flex w-full max-w-[280px] items-center gap-3">
              <span className="font-mono text-[11px] text-muted-foreground">zoom</span>
              <input
                type="range"
                min={1}
                max={4}
                step={0.01}
                value={crop.zoom}
                aria-label="Zoom"
                onChange={(e) => setCrop((c) => clampCrop(img!, VIEWPORT, { ...c, zoom: Number(e.target.value) }))}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-brand [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-sm"
              />
              <button
                type="button"
                aria-label="Reset position"
                onClick={() => setCrop({ zoom: 1, offsetX: 0, offsetY: 0 })}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              <X className="size-4" />
              Cancel
            </Button>
            <Button onClick={apply} disabled={!img}>
              <Check className="size-4" />
              Use this photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
