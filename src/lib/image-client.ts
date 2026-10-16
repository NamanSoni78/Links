/**
 * Links — client-side image pipeline (browser only).
 *
 * Everything heavy happens on the user's device before anything is
 * saved: avatars are circle-cropped to 256px, icons squeezed to 64px,
 * both re-encoded as compact WebP/JPEG data URLs. That keeps the
 * database tiny (no object storage) and uploads instant.
 */
import { AVATAR_MAX_CHARS, ICON_MAX_CHARS, ICON_OUTPUT_PX } from "./images";

export type ImagePipelineResult =
  | { ok: true; dataUrl: string }
  | { ok: false; error: string };

const ACCEPTED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/bmp",
  "image/avif",
]);

export function loadImageEl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode"));
    img.src = src;
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("read"));
    fr.readAsDataURL(file);
  });
}
export { readAsDataUrl as readAsFile };

/** WebP first (smaller), JPEG fallback — same quality ladder. */
function encodeCanvas(canvas: HTMLCanvasElement, targetBytes: number): string {
  const ladder: { type: string; quality: number }[] = [
    { type: "image/webp", quality: 0.85 },
    { type: "image/webp", quality: 0.72 },
    { type: "image/webp", quality: 0.6 },
    { type: "image/jpeg", quality: 0.8 },
    { type: "image/jpeg", quality: 0.62 },
  ];
  let best = "";
  for (const step of ladder) {
    best = canvas.toDataURL(step.type, step.quality);
    if (best.length <= targetBytes) return best;
  }
  return best;
}

/** Rejects files we can't handle before anything loads. */
export async function validateImageFile(file: File): Promise<ImagePipelineResult> {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return { ok: false, error: "Use a PNG, JPG, WebP, GIF or ICO image." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "That image is over 5 MB — pick a smaller one." };
  }
  return { ok: true, dataUrl: "" };
}

export interface CropState {
  zoom: number; // 1 = cover fit
  offsetX: number; // px, in viewport coordinates
  offsetY: number;
}

/** Shared math: where the image lands inside a square viewport. */
export function drawRect(img: HTMLImageElement, viewport: number, state: CropState) {
  const base = viewport / Math.min(img.naturalWidth, img.naturalHeight);
  const scale = base * state.zoom;
  const left = (viewport - img.naturalWidth * scale) / 2 + state.offsetX;
  const top = (viewport - img.naturalHeight * scale) / 2 + state.offsetY;
  return { scale, left, top };
}

/** Clamps pan so the circle is always covered by the image. */
export function clampCrop(img: HTMLImageElement, viewport: number, state: CropState): CropState {
  const { scale } = drawRect(img, viewport, state);
  const maxX = Math.max(0, (img.naturalWidth * scale - viewport) / 2);
  const maxY = Math.max(0, (img.naturalHeight * scale - viewport) / 2);
  const zoom = Math.min(4, Math.max(1, state.zoom));
  return {
    zoom,
    offsetX: Math.min(maxX, Math.max(-maxX, state.offsetX)),
    offsetY: Math.min(maxY, Math.max(-maxY, state.offsetY)),
  };
}

/** Circle-crops the viewport's current view to a square data URL. */
export function cropToDataUrl(
  img: HTMLImageElement,
  viewport: number,
  state: CropState,
  outputPx: number,
  targetBytes: number
): string {
  const { scale, left, top } = drawRect(img, viewport, state);
  const k = outputPx / viewport;
  const canvas = document.createElement("canvas");
  canvas.width = outputPx;
  canvas.height = outputPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, left * k, top * k, img.naturalWidth * scale * k, img.naturalHeight * scale * k);
  return encodeCanvas(canvas, targetBytes);
}

/**
 * Icons (link favicons, contact icons): anything already tiny stays
 * untouched (animated GIFs keep animating); anything over 800 KB is
 * resized to 64px and recompressed client-side.
 */
export async function processIconFile(file: File): Promise<ImagePipelineResult> {
  const verdict = await validateImageFile(file);
  if (!verdict.ok) return verdict;

  const dataUrl = await readAsDataUrl(file);
  const smallEnough = dataUrl.length <= ICON_MAX_CHARS;

  if (file.size <= 800 * 1024) {
    // keep the original if it's already small (and check it decodes)
    try {
      const img = await loadImageEl(dataUrl);
      if (smallEnough && Math.max(img.naturalWidth, img.naturalHeight) <= 128) {
        return { ok: true, dataUrl };
      }
    } catch {
      return { ok: false, error: "That file wouldn't open as an image." };
    }
  }

  // resize + recompress to 64×64
  try {
    const img = await loadImageEl(dataUrl);
    const canvas = document.createElement("canvas");
    canvas.width = ICON_OUTPUT_PX;
    canvas.height = ICON_OUTPUT_PX;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, error: "Your browser blocked the resize." };
    ctx.imageSmoothingQuality = "high";
    const s = Math.max(ICON_OUTPUT_PX / img.naturalWidth, ICON_OUTPUT_PX / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    ctx.drawImage(img, (ICON_OUTPUT_PX - w) / 2, (ICON_OUTPUT_PX - h) / 2, w, h);
    let out = encodeCanvas(canvas, ICON_MAX_CHARS);
    if (out.length > ICON_MAX_CHARS) {
      // one more pass at a smaller size
      canvas.width = canvas.height = 32;
      ctx.imageSmoothingQuality = "high";
      const s2 = Math.max(32 / img.naturalWidth, 32 / img.naturalHeight);
      ctx.drawImage(img, (32 - img.naturalWidth * s2) / 2, (32 - img.naturalHeight * s2) / 2, img.naturalWidth * s2, img.naturalHeight * s2);
      out = encodeCanvas(canvas, ICON_MAX_CHARS);
    }
    return { ok: true, dataUrl: out };
  } catch {
    return { ok: false, error: "That file wouldn't open as an image." };
  }
}
