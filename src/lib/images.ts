/**
 * Links — image data-URL rules shared by client and server.
 *
 * Photos and icons are stored as tiny compressed data URLs (client
 * resizes/crops before upload), which keeps the database small and
 * the public pages self-contained — no object storage, no uploads,
 * no extra CPU.
 */

/** hard reject: files above this never enter the pipeline */
export const IMAGE_FILE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** favicon / contact icons above this get resized + recompressed */
export const ICON_COMPRESS_THRESHOLD = 800 * 1024; // 800 KB

/** output sizes */
export const AVATAR_OUTPUT_PX = 256;
export const ICON_OUTPUT_PX = 64;

/** max stored data-URL lengths (≈1.37× the binary size) */
export const AVATAR_MAX_CHARS = 200_000; // ≈150 KB binary
export const ICON_MAX_CHARS = 44_000; // ≈32 KB binary

const DATA_URL_RE = /^data:image\/(?:png|jpeg|webp|gif|x-icon|svg\+xml);base64,[A-Za-z0-9+/=]+$/;

/**
 * Server-side guard: accepts only well-formed base64 image data URLs
 * under `maxChars`. Returns the cleaned string or "".
 */
export function cleanImageDataUrl(raw: unknown, maxChars: number): string {
  if (typeof raw !== "string") return "";
  const s = raw.trim();
  if (s.length < 24 || s.length > maxChars) return "";
  if (!DATA_URL_RE.test(s)) return "";
  return s;
}
