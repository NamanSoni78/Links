/**
 * Links — Widgets: shared model, defaults, fonts, presets & validation.
 *
 * A widget is a small customizable card the user designs once and embeds
 * anywhere — GitHub profile README, portfolio, docs — as an HTML iframe,
 * a Markdown image, or a raw SVG URL.
 *
 * Pure data + pure functions only: safe to import from client and server.
 * No zod, no node APIs — validation is hand-rolled like the rest of the app.
 */

/* ── types ───────────────────────────────────────────────────── */

export type FontKey =
  | "sans"
  | "serif"
  | "mono"
  | "trebuchet"
  | "verdana"
  | "times"
  | "impact"
  | "comic";

export type AnimationKey = "none" | "fade" | "rise" | "pop" | "float" | "pulse";
export type TextAnimKey = AnimationKey | "typing";
export type ImageShape = "circle" | "rounded" | "square";
export type BgMode = "solid" | "gradient";
export type Align = "left" | "center";

/** Optional blocks rendered under the header (title/message/button),
 *  in the user's chosen order — all of them optional. */
export type BlockKind = "text" | "sites" | "contacts";

export interface WidgetTextBlock {
  id: string;
  text: string;
  size: number;
  bold: boolean;
  animation: TextAnimKey;
  /** start delay in ms — the block waits before playing */
  delayMs: number;
  /** typing only — ms per character */
  speedMs: number;
  /** typing only — restart the cycle forever */
  loop: boolean;
}

export interface WidgetSitesBlock {
  showFavicon: boolean;
  showDesc: boolean;
  /** 0 = all (up to the hard cap) */
  limit: number;
}

export interface WidgetContactsBlock {
  showIcon: boolean;
  /** 0 = all (up to the hard cap) */
  limit: number;
}

export interface WidgetBlocks {
  /** enabled blocks, in render order */
  order: BlockKind[];
  texts: WidgetTextBlock[];
  sites: WidgetSitesBlock;
  contacts: WidgetContactsBlock;
}

/** The owner's live profile data, resolved at render time so a
 *  widget's "sites" / "contacts" blocks always mirror the page. */
export interface WidgetSiteItem {
  url: string;
  title: string;
  desc: string;
  /** custom favicon override (data URL) — "" uses the fetched one */
  favicon: string;
}
export interface WidgetContactItem {
  kind: string;
  label: string;
  value: string;
  href: string;
  /** custom icon (data URL) — "" falls back to a glyph */
  icon: string;
}
export interface WidgetProfileContext {
  displayName: string;
  bio: string;
  sites: WidgetSiteItem[];
  contacts: WidgetContactItem[];
}

export interface WidgetData {
  content: {
    imageUrl: string;
    imageShape: ImageShape;
    title: string;
    message: string;
    linkLabel: string;
    linkUrl: string;
  };
  style: {
    bgMode: BgMode;
    bgColor: string;
    bgColor2: string;
    gradientAngle: number;
    textColor: string;
    accentColor: string;
    borderColor: string;
    borderWidth: number;
    radius: number;
    shadow: boolean;
  };
  typography: {
    font: FontKey;
    titleSize: number;
    messageSize: number;
    bold: boolean;
    uppercase: boolean;
    align: Align;
  };
  animation: AnimationKey;
  blocks: WidgetBlocks;
}

/* ── fonts (system stacks only — they render inside SVG images,
      where external font loading is impossible by design) ────── */

export interface WidgetFont {
  key: FontKey;
  label: string;
  stack: string;
  /** rough average glyph width × font-size, drives SVG line wrapping */
  widthFactor: number;
}

export const WIDGET_FONTS: readonly WidgetFont[] = [
  { key: "sans", label: "Sans", stack: 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif', widthFactor: 0.53 },
  { key: "serif", label: "Serif", stack: 'Georgia, "Times New Roman", serif', widthFactor: 0.52 },
  { key: "mono", label: "Mono", stack: '"SF Mono", "Cascadia Code", "Courier New", monospace', widthFactor: 0.6 },
  { key: "trebuchet", label: "Trebuchet", stack: '"Trebuchet MS", Verdana, sans-serif', widthFactor: 0.52 },
  { key: "verdana", label: "Verdana", stack: "Verdana, Geneva, sans-serif", widthFactor: 0.6 },
  { key: "times", label: "Times", stack: '"Times New Roman", Times, serif', widthFactor: 0.48 },
  { key: "impact", label: "Impact", stack: 'Impact, "Arial Narrow", sans-serif', widthFactor: 0.46 },
  { key: "comic", label: "Comic", stack: '"Comic Sans MS", "Chalkboard SE", cursive', widthFactor: 0.57 },
];

export function fontByKey(key: string): WidgetFont {
  return WIDGET_FONTS.find((f) => f.key === key) ?? WIDGET_FONTS[0];
}

/* ── limits ──────────────────────────────────────────────────── */

export const WIDGET_LIMITS = {
  nameMax: 60,
  titleMax: 80,
  messageMax: 200,
  linkLabelMax: 40,
  urlMax: 500,
  titleSizeMin: 16,
  titleSizeMax: 40,
  messageSizeMin: 11,
  messageSizeMax: 18,
  radiusMin: 0,
  radiusMax: 24,
  borderMax: 3,
  /** free-tier friendly cap per account */
  perUser: 20,
  /* ── blocks ── */
  textMax: 120,
  textsMax: 5,
  textSizeMin: 11,
  textSizeMax: 22,
  delayMax: 4000,
  speedMin: 40,
  speedMax: 140,
  sitesCap: 10,
  contactsCap: 6,
} as const;

export const DEFAULT_BLOCKS: WidgetBlocks = {
  order: [],
  texts: [],
  sites: { showFavicon: true, showDesc: true, limit: 0 },
  contacts: { showIcon: true, limit: 0 },
};

/* ── defaults & presets ──────────────────────────────────────── */

export const DEFAULT_WIDGET: WidgetData = {
  content: {
    imageUrl: "",
    imageShape: "circle",
    title: "Hey, I'm Naman",
    message: "I build things for the web. This card lives in my README.",
    linkLabel: "Work with me",
    linkUrl: "",
  },
  style: {
    bgMode: "solid",
    bgColor: "#ffffff",
    bgColor2: "#f2ede4",
    gradientAngle: 135,
    textColor: "#1c1917",
    accentColor: "#1c1917",
    borderColor: "#e7e0d4",
    borderWidth: 1,
    radius: 16,
    shadow: true,
  },
  typography: {
    font: "sans",
    titleSize: 26,
    messageSize: 14,
    bold: true,
    uppercase: false,
    align: "left",
  },
  animation: "fade",
  blocks: { ...DEFAULT_BLOCKS, order: [], texts: [] },
};

export type PresetKey = "minimal" | "neon" | "terminal" | "bold" | "paper";

export interface WidgetPreset {
  key: PresetKey;
  label: string;
  hint: string;
  data: WidgetData;
}

const preset = (patch: {
  content?: Partial<WidgetData["content"]>;
  style?: Partial<WidgetData["style"]>;
  typography?: Partial<WidgetData["typography"]>;
  animation?: AnimationKey;
  blocks?: Partial<WidgetBlocks>;
}): WidgetData => ({
  content: { ...DEFAULT_WIDGET.content, ...patch.content },
  style: { ...DEFAULT_WIDGET.style, ...patch.style },
  typography: { ...DEFAULT_WIDGET.typography, ...patch.typography },
  animation: patch.animation ?? DEFAULT_WIDGET.animation,
  blocks: { ...DEFAULT_BLOCKS, ...patch.blocks },
});

/** Built-in starter designs — each tuned to read well in both
 *  light and dark GitHub READMEs. */
export const WIDGET_PRESETS: readonly WidgetPreset[] = [
  {
    key: "minimal",
    label: "Minimal",
    hint: "Clean white card, quiet border",
    data: preset({ animation: "fade" }),
  },
  {
    key: "neon",
    label: "Neon",
    hint: "Dark gradient, electric accent",
    data: preset({
      content: { linkLabel: "See my work" },
      style: {
        bgMode: "gradient",
        bgColor: "#0b0f19",
        bgColor2: "#141b34",
        gradientAngle: 135,
        textColor: "#f4f6fb",
        accentColor: "#3ef58b",
        borderColor: "#232c4d",
        borderWidth: 1,
        radius: 16,
        shadow: true,
      },
      typography: { font: "mono", titleSize: 24, messageSize: 13, bold: true, uppercase: false, align: "left" },
      animation: "pop",
    }),
  },
  {
    key: "terminal",
    label: "Terminal",
    hint: "Console green on black",
    data: preset({
      content: { title: "naman@web:~$", message: "currently shipping side projects", linkLabel: "view source" },
      style: {
        bgMode: "solid",
        bgColor: "#0a0f0a",
        bgColor2: "#0a0f0a",
        textColor: "#7ce38b",
        accentColor: "#7ce38b",
        borderColor: "#1d3a24",
        borderWidth: 1,
        radius: 12,
        shadow: false,
      },
      typography: { font: "mono", titleSize: 22, messageSize: 13, bold: false, uppercase: false, align: "left" },
      animation: "rise",
    }),
  },
  {
    key: "bold",
    label: "Bold",
    hint: "Warm gradient, loud type",
    data: preset({
      content: { title: "Naman Soni", message: "Full-stack developer & maker of small internet things.", linkLabel: "Get in touch" },
      style: {
        bgMode: "gradient",
        bgColor: "#ff6a3d",
        bgColor2: "#ff3d81",
        gradientAngle: 120,
        textColor: "#ffffff",
        accentColor: "#ffffff",
        borderColor: "#ffffff",
        borderWidth: 0,
        radius: 20,
        shadow: true,
      },
      typography: { font: "sans", titleSize: 32, messageSize: 15, bold: true, uppercase: true, align: "center" },
      animation: "rise",
    }),
  },
  {
    key: "paper",
    label: "Paper",
    hint: "Warm editorial, serif headings",
    data: preset({
      content: { title: "Field notes", message: "Essays and lessons from building on the web, sent monthly.", linkLabel: "Read the latest" },
      style: {
        bgMode: "solid",
        bgColor: "#faf6ef",
        bgColor2: "#f0e9dd",
        textColor: "#292524",
        accentColor: "#9a3412",
        borderColor: "#e5dccd",
        borderWidth: 1,
        radius: 14,
        shadow: false,
      },
      typography: { font: "serif", titleSize: 28, messageSize: 14, bold: true, uppercase: false, align: "left" },
      animation: "float",
    }),
  },
];

/* ── animations (one CSS block shared by the React card and the
      SVG generator, so previews are WYSIWYG) ─────────────────── */

export const WIDGET_ANIMATIONS: readonly { key: AnimationKey; label: string; looping: boolean }[] = [
  { key: "none", label: "None", looping: false },
  { key: "fade", label: "Fade in", looping: false },
  { key: "rise", label: "Rise up", looping: false },
  { key: "pop", label: "Pop in", looping: false },
  { key: "float", label: "Float", looping: true },
  { key: "pulse", label: "Pulse", looping: true },
];

export const WIDGET_ANIMATION_CSS = `
@keyframes wa-fade{from{opacity:0}to{opacity:1}}
@keyframes wa-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes wa-pop{0%{opacity:0;transform:scale(.92)}100%{opacity:1;transform:scale(1)}}
@keyframes wa-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes wa-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
.wa-fade{animation:wa-fade .7s ease-out both}
.wa-rise{animation:wa-rise .7s cubic-bezier(.22,1,.36,1) both}
.wa-pop{animation:wa-pop .55s cubic-bezier(.34,1.56,.64,1) both}
.wa-float{animation:wa-float 3.6s ease-in-out infinite}
.wa-pulse{animation:wa-pulse 2.8s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){
  .wa-fade,.wa-rise,.wa-pop,.wa-float,.wa-pulse{animation:none}
}`;

export function animationClass(key: string): string {
  const allowed = WIDGET_ANIMATIONS.some((a) => a.key === key);
  return key !== "none" && allowed ? `wa-${key}` : "";
}

/* ── typing animation (readme-typing-svg style) ───────────────────
 *
 * Generates one self-contained CSS snippet per text block: every
 * character gets its own keyframes (discrete 0→1 opacity step at its
 * reveal time) so the text "types itself" after an optional delay,
 * optionally looping forever. The SAME snippet is mounted by the
 * React card (editor preview + /embed page) and the SVG generator,
 * so previews are honest. CSS animations inside SVG images run on
 * GitHub READMEs, in emails-as-img, everywhere SVG renders.
 */

const CURSOR_HOLD_MS = 2200; // how long the finished line sits before a loop restarts

export interface TypingSpec {
  charCount: number;
  delayMs: number;
  speedMs: number;
  loop: boolean;
}

export function typingCycleMs(spec: TypingSpec): number {
  const typeMs = Math.max(0, spec.charCount) * spec.speedMs;
  return spec.loop ? spec.delayMs + typeMs + CURSOR_HOLD_MS : Math.max(1, spec.delayMs + typeMs);
}

/** CSS classes: `.wt-{uid}-{i}` per char, `.wtc-{uid}` cursor blink. */
export function typingCss(uid: string, spec: TypingSpec): string {
  const { charCount, delayMs, speedMs, loop } = spec;
  const cycle = typingCycleMs(spec);
  const rules: string[] = [];
  const pct = (ms: number) => Math.min(100, (ms / cycle) * 100);

  for (let i = 0; i < charCount; i++) {
    const at = pct(delayMs + i * speedMs);
    const to = Math.min(100, at + 0.01);
    rules.push(
      loop
        ? `@keyframes wt-${uid}-${i}{0%,${at.toFixed(3)}%{opacity:0}${to.toFixed(3)}%,99.9%{opacity:1}100%{opacity:0}}.wt-${uid}-${i}{animation:wt-${uid}-${i} ${cycle}ms steps(1,end) infinite}`
        : `@keyframes wt-${uid}-${i}{0%,${at.toFixed(3)}%{opacity:0}${to.toFixed(3)}%,100%{opacity:1}}.wt-${uid}-${i}{animation:wt-${uid}-${i} ${cycle}ms steps(1,end) 1 both}`
    );
  }
  rules.push(
    `@keyframes wtc-${uid}{0%,100%{opacity:1}50%{opacity:0}}.wtc-${uid}{animation:wtc-${uid} 1.06s steps(1,end) infinite}`
  );
  // motion-sensitive viewers just see the finished line
  rules.push(
    `@media (prefers-reduced-motion: reduce){${Array.from({ length: charCount }, (_, i) => `.wt-${uid}-${i}`).join(",")},.wtc-${uid}{animation:none}}`
  );
  return rules.join("");
}

/** Animation list offered for individual text blocks. */
export const WIDGET_TEXT_ANIMATIONS: readonly { key: TextAnimKey; label: string }[] = [
  { key: "none", label: "None" },
  { key: "fade", label: "Fade" },
  { key: "rise", label: "Rise" },
  { key: "pop", label: "Pop" },
  { key: "float", label: "Float" },
  { key: "pulse", label: "Pulse" },
  { key: "typing", label: "Typing" },
];

/* ── colors ──────────────────────────────────────────────────── */

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Returns `#rrggbb` (lowercase) or null if invalid. */
export function normalizeHex(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const s = raw.trim();
  if (!HEX_RE.test(s)) return fallback;
  if (s.length === 4) {
    return "#" + s.slice(1).split("").map((c) => c + c).join("").toLowerCase();
  }
  return s.toLowerCase();
}

/** WCAG relative luminance contrast ratio between two hex colors. */
export function contrastRatio(hexA: string, hexB: string): number {
  const lum = (hex: string): number => {
    const rgb = [1, 3, 5].map((i) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  try {
    const l1 = lum(hexA);
    const l2 = lum(hexB);
    const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (hi + 0.05) / (lo + 0.05);
  } catch {
    return 21;
  }
}

/** The background the text sits on — solid or the mid-blend of a gradient. */
export function effectiveBg(style: WidgetData["style"]): string {
  if (style.bgMode !== "gradient") return style.bgColor;
  const mixChannel = (a: string, b: string, i: number): number =>
    Math.round((parseInt(a.slice(i, i + 2), 16) + parseInt(b.slice(i, i + 2), 16)) / 2);
  try {
    const r = mixChannel(style.bgColor, style.bgColor2, 1).toString(16).padStart(2, "0");
    const g = mixChannel(style.bgColor, style.bgColor2, 3).toString(16).padStart(2, "0");
    const bl = mixChannel(style.bgColor, style.bgColor2, 5).toString(16).padStart(2, "0");
    return `#${r}${g}${bl}`;
  } catch {
    return style.bgColor;
  }
}

/* ── URLs ────────────────────────────────────────────────────── */

/** https (or localhost for dev). Blocks javascript:, data:, etc. */
export function safeWidgetUrl(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const s = raw.trim();
  if (!s || s.length > WIDGET_LIMITS.urlMax) return "";
  if (s.startsWith("https://")) return s;
  if (s.startsWith("http://") && (s.startsWith("http://localhost") || s.startsWith("http://127.0.0.1"))) return s;
  return "";
}

/* ── normalize / validate whole payload ──────────────────────── */

const clamp = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback;
  return Math.min(max, Math.max(min, n));
};

const pick = <T extends string>(raw: unknown, allowed: readonly T[], fallback: T): T =>
  (typeof raw === "string" && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback);

const FONT_KEYS = WIDGET_FONTS.map((f) => f.key);
const BLOCK_KINDS: readonly BlockKind[] = ["text", "sites", "contacts"];
const TEXT_ANIM_KEYS = WIDGET_TEXT_ANIMATIONS.map((a) => a.key);

function normalizeTextBlock(raw: unknown): WidgetTextBlock {
  const b = (raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown, max: number): string =>
    (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, "") : "").slice(0, max);
  const text = str(b.text, WIDGET_LIMITS.textMax).trim();
  return {
    id: str(b.id, 24) || Math.random().toString(36).slice(2, 8),
    text,
    size: clamp(b.size, WIDGET_LIMITS.textSizeMin, WIDGET_LIMITS.textSizeMax, 14),
    bold: typeof b.bold === "boolean" ? b.bold : false,
    animation: (typeof b.animation === "string" && (TEXT_ANIM_KEYS as string[]).includes(b.animation)
      ? (b.animation as TextAnimKey)
      : "none"),
    delayMs: clamp(b.delayMs, 0, WIDGET_LIMITS.delayMax, 0),
    speedMs: clamp(b.speedMs, WIDGET_LIMITS.speedMin, WIDGET_LIMITS.speedMax, 70),
    loop: typeof b.loop === "boolean" ? b.loop : true,
  };
}

function normalizeBlocks(raw: unknown): WidgetBlocks {
  const r = (raw ?? {}) as Record<string, unknown>;
  const order = Array.isArray(r.order)
    ? (r.order.filter(
        (k): k is BlockKind => typeof k === "string" && (BLOCK_KINDS as string[]).includes(k)
      ) as BlockKind[])
    : [];
  const texts = (Array.isArray(r.texts) ? r.texts : [])
    .map(normalizeTextBlock)
    .filter((t) => t.text.length > 0)
    .slice(0, WIDGET_LIMITS.textsMax);
  const s = (r.sites ?? {}) as Record<string, unknown>;
  const c = (r.contacts ?? {}) as Record<string, unknown>;
  return {
    order,
    texts,
    sites: {
      showFavicon: typeof s.showFavicon === "boolean" ? s.showFavicon : true,
      showDesc: typeof s.showDesc === "boolean" ? s.showDesc : true,
      limit: clamp(s.limit, 0, WIDGET_LIMITS.sitesCap, 0),
    },
    contacts: {
      showIcon: typeof c.showIcon === "boolean" ? c.showIcon : true,
      limit: clamp(c.limit, 0, WIDGET_LIMITS.contactsCap, 0),
    },
  };
}

/**
 * Coerces anything (partial client payloads, stale DB rows) into a
 * fully-valid WidgetData. Never throws — unknown fields fall back to
 * defaults, which keeps old widgets rendering after future edits.
 */
export function normalizeWidgetData(raw: unknown): WidgetData {
  const r = (raw ?? {}) as Record<string, unknown>;
  const c = (r.content ?? {}) as Record<string, unknown>;
  const s = (r.style ?? {}) as Record<string, unknown>;
  const t = (r.typography ?? {}) as Record<string, unknown>;

  const str = (v: unknown, max: number, fallback: string): string => {
    const out = typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, "").trim() : "";
    return (out || fallback === "\0" ? out : fallback).slice(0, max);
  };

  return {
    content: {
      imageUrl: safeWidgetUrl(c.imageUrl),
      imageShape: pick<ImageShape>(c.imageShape, ["circle", "rounded", "square"], "circle"),
      // "\0" sentinel: keep empty strings empty (no fallback)
      title: str(c.title, WIDGET_LIMITS.titleMax, "\0"),
      message: str(c.message, WIDGET_LIMITS.messageMax, "\0"),
      linkLabel: str(c.linkLabel, WIDGET_LIMITS.linkLabelMax, "\0"),
      linkUrl: safeWidgetUrl(c.linkUrl),
    },
    style: {
      bgMode: pick<BgMode>(s.bgMode, ["solid", "gradient"], "solid"),
      bgColor: normalizeHex(s.bgColor, DEFAULT_WIDGET.style.bgColor),
      bgColor2: normalizeHex(s.bgColor2, DEFAULT_WIDGET.style.bgColor2),
      gradientAngle: clamp(s.gradientAngle, 0, 360, DEFAULT_WIDGET.style.gradientAngle),
      textColor: normalizeHex(s.textColor, DEFAULT_WIDGET.style.textColor),
      accentColor: normalizeHex(s.accentColor, DEFAULT_WIDGET.style.accentColor),
      borderColor: normalizeHex(s.borderColor, DEFAULT_WIDGET.style.borderColor),
      borderWidth: clamp(s.borderWidth, 0, WIDGET_LIMITS.borderMax, DEFAULT_WIDGET.style.borderWidth),
      radius: clamp(s.radius, WIDGET_LIMITS.radiusMin, WIDGET_LIMITS.radiusMax, DEFAULT_WIDGET.style.radius),
      shadow: typeof s.shadow === "boolean" ? s.shadow : DEFAULT_WIDGET.style.shadow,
    },
    typography: {
      font: (typeof t.font === "string" && FONT_KEYS.includes(t.font as FontKey) ? (t.font as FontKey) : DEFAULT_WIDGET.typography.font),
      titleSize: clamp(t.titleSize, WIDGET_LIMITS.titleSizeMin, WIDGET_LIMITS.titleSizeMax, DEFAULT_WIDGET.typography.titleSize),
      messageSize: clamp(t.messageSize, WIDGET_LIMITS.messageSizeMin, WIDGET_LIMITS.messageSizeMax, DEFAULT_WIDGET.typography.messageSize),
      bold: typeof t.bold === "boolean" ? t.bold : DEFAULT_WIDGET.typography.bold,
      uppercase: typeof t.uppercase === "boolean" ? t.uppercase : DEFAULT_WIDGET.typography.uppercase,
      align: pick<Align>(t.align, ["left", "center"], "left"),
    },
    animation: pick<AnimationKey>(
      r.animation,
      WIDGET_ANIMATIONS.map((a) => a.key),
      "none"
    ),
    blocks: normalizeBlocks(r.blocks),
  };
}

/** JSON → WidgetData for rows read from the DB. */
export function parseWidgetData(json: string): WidgetData {
  try {
    return normalizeWidgetData(JSON.parse(json));
  } catch {
    return normalizeWidgetData({});
  }
}

/* ── widget slug rules (live under /w/<slug>, own namespace) ──── */

const RESERVED_WIDGET_SLUGS: ReadonlySet<string> = new Set([
  "new", "edit", "create", "update", "delete", "duplicate", "index", "null",
  "undefined", "admin", "api", "settings", "dashboard", "widgets", "embed",
  "w", "og", "favicon.ico", "sitemap.xml", "robots.txt",
]);

export type WidgetSlugCheck =
  | { valid: true; slug: string }
  | { valid: false; message: string };

export function validateWidgetSlug(raw: string): WidgetSlugCheck {
  const slug = raw.toLowerCase().trim();
  if (slug.length < 3) return { valid: false, message: "Widget links need at least 3 characters." };
  if (slug.length > 30) return { valid: false, message: "Widget links can be at most 30 characters." };
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    return { valid: false, message: "Use lowercase letters, numbers and single hyphens." };
  }
  if (RESERVED_WIDGET_SLUGS.has(slug)) return { valid: false, message: "That link is reserved. Try another." };
  return { valid: true, slug };
}

/** Kebab-case a display name into a candidate slug. */
export function slugifyWidgetName(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return base || "widget";
}

/** Short cache-busting tag derived from updatedAt. */
export function widgetVersion(updatedAt: number): string {
  return (updatedAt % 0xffffff).toString(36).padStart(4, "0");
}

