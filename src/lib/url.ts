/**
 * Links — URL helpers: normalization, hostname extraction and
 * favicon resolution (Google's public s2 favicon service — zero
 * server CPU, cached by Google's CDN).
 */

/** Normalizes user-typed URLs. Returns null when unusable. */
export function normalizeUrlInput(input: string): string | null {
  let s = (input || "").trim();
  if (!s) return null;
  if (/\s/.test(s)) return null;

  // Be forgiving: no scheme → assume https
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;

  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    // Require a real-looking host (localhost & IPs are fine for tinkerers,
    // but the host must at least contain a dot or be exactly "localhost")
    if (!u.hostname || (!u.hostname.includes(".") && u.hostname !== "localhost")) return null;
    if (s.length > 2048) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** "https://www.youtube.com/watch → youtube.com" */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** A sensible default title derived from the host ("youtube.com" → "YouTube"). */
export function titleFromUrl(url: string): string {
  const host = hostOf(url);
  const base = host.split(".")[0] || host;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** Favicon URL for a link (Google s2, 64px — reliable and cached). */
export function faviconFor(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(url))}&sz=64`;
}
