/**
 * Links — widget SVG generator (server only).
 *
 * Produces a standalone, self-contained SVG "card" of a widget —
 * this is what Markdown embeds point at (`![…](/api/embed/<slug>?v=…)`),
 * so it must render inside an <img>, which means:
 *   - system font stacks only (external fonts never load),
 *   - images inlined as data URIs by the route (external refs are blocked),
 *   - CSS animations (declarative) — no scripts, ever.
 *
 * Pure string building: no React, no async, microseconds per render.
 * The layout mirrors the HTML WidgetCard so previews stay honest.
 */
import {
  animationClass,
  fontByKey,
  WIDGET_ANIMATION_CSS,
  type WidgetData,
} from "./widgets";

const W = 456; // card width (reads well at README scale)
const PAD = 28; // inner padding, matches the HTML card
const CONTENT_W = W - PAD * 2;
const IMG = 88; // image box, matches the HTML card
const IMG_GAP = 16;

/* ── helpers ─────────────────────────────────────────────────── */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Greedy word-wrap with hard breaks for very long words; CJK-safe. */
function wrapText(text: string, maxChars: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const pieces: string[] = [];
      // hard-break words wider than a full line (URLs, CJK runs)
      let rest = word;
      while (rest.length > maxChars) {
        pieces.push(rest.slice(0, maxChars));
        rest = rest.slice(maxChars);
      }
      if (rest) pieces.push(rest);
      for (const piece of pieces) {
        if (!line) {
          line = piece;
        } else if (line.length + 1 + piece.length <= maxChars) {
          line += " " + piece;
        } else {
          out.push(line);
          line = piece;
        }
      }
    }
    out.push(line); // keep (possibly empty) paragraph lines
  }
  return out;
}

function fitLines(text: string, maxChars: number, maxLines: number): string[] {
  const lines = wrapText(text, maxChars);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  if (last.length > maxChars - 1) last = last.slice(0, maxChars - 1);
  kept[maxLines - 1] = last.replace(/[\s,.;:!?-]+$/, "") + "…";
  return kept;
}

/* ── generator ───────────────────────────────────────────────── */

export function renderWidgetSvg(
  data: WidgetData,
  opts: { imageSrc?: string } = {}
): string {
  const { content, style, typography, animation } = data;
  const font = fontByKey(typography.font);
  const centered = typography.align === "center";
  const animClass = animationClass(animation);

  const title = typography.uppercase ? content.title.toUpperCase() : content.title;
  // uppercase glyphs run ~8% wider
  const f = font.widthFactor * (typography.uppercase && title ? 1.08 : 1);

  const titleLines = title
    ? fitLines(title, Math.max(10, Math.floor(CONTENT_W / (typography.titleSize * f))), 3)
    : [];
  const messageLines = content.message
    ? fitLines(
        content.message,
        Math.max(12, Math.floor(CONTENT_W / (typography.messageSize * font.widthFactor))),
        4
      )
    : [];
  const hasLink = content.linkLabel.length > 0;

  /* ── vertical layout (cursor in px) ── */
  let y = PAD;
  const body: string[] = [];

  if (opts.imageSrc) {
    const x = centered ? (W - IMG) / 2 : PAD;
    let clip = "";
    if (content.imageShape === "circle") {
      clip = `<clipPath id="wim"><circle cx="${x + IMG / 2}" cy="${y + IMG / 2}" r="${IMG / 2}"/></clipPath>`;
    } else if (content.imageShape === "rounded") {
      clip = `<clipPath id="wim"><rect x="${x}" y="${y}" width="${IMG}" height="${IMG}" rx="18"/></clipPath>`;
    } else {
      clip = `<clipPath id="wim"><rect x="${x}" y="${y}" width="${IMG}" height="${IMG}" rx="6"/></clipPath>`;
    }
    body.push(`<defs>${clip}</defs>`);
    body.push(
      `<image x="${x}" y="${y}" width="${IMG}" height="${IMG}" href="${esc(opts.imageSrc)}" clip-path="url(#wim)" preserveAspectRatio="xMidYMid slice"/>`
    );
    y += IMG + IMG_GAP;
  }

  if (titleLines.length) {
    let baseline = y + typography.titleSize * 0.82;
    for (const line of titleLines) {
      body.push(
        `<text x="${centered ? W / 2 : PAD}" y="${round(baseline)}" text-anchor="${centered ? "middle" : "start"} fill="${style.textColor}" font-family="${esc(font.stack)}" font-size="${typography.titleSize}" font-weight="${typography.bold ? 700 : 500}"${typography.uppercase ? ' letter-spacing="0.6"' : ""}>${esc(line)}</text>`
      );
      baseline += typography.titleSize * 1.18;
    }
    y += typography.titleSize * 1.18 * titleLines.length;
  }

  if (messageLines.length) {
    y += titleLines.length ? 10 : 0;
    let baseline = y + typography.messageSize * 0.85;
    for (const line of messageLines) {
      body.push(
        `<text x="${centered ? W / 2 : PAD}" y="${round(baseline)}" text-anchor="${centered ? "middle" : "start"} fill="${style.textColor}" fill-opacity="0.82" font-family="${esc(font.stack)}" font-size="${typography.messageSize}">${esc(line)}</text>`
      );
      baseline += typography.messageSize * 1.5;
    }
    y += typography.messageSize * 1.5 * messageLines.length;
  }

  if (hasLink) {
    y += 20;
    const label = content.linkLabel;
    const pillW = Math.min(
      CONTENT_W,
      Math.max(96, Math.round(label.length * 13.5 * 0.56 + 56))
    );
    const pillX = centered ? (W - pillW) / 2 : PAD;
    const text = `<text x="${round(pillX + pillW / 2)}" y="${round(y + 21 + 5)}" text-anchor="middle" fill="${readableOn(style.accentColor)}" font-family="${esc(font.stack)}" font-size="14.5" font-weight="600">${esc(label)}</text>`;
    const pill = `<rect x="${pillX}" y="${y}" width="${pillW}" height="42" rx="21" fill="${style.accentColor}"/>`;
    body.push(
      content.linkUrl
        ? `<a href="${esc(content.linkUrl)}" target="_blank" rel="noopener noreferrer nofollow">${pill}${text}</a>`
        : pill + text
    );
    y += 42;
  }

  const height = Math.min(720, Math.max(120, y + PAD));

  /* ── background + frame ── */
  const defs: string[] = [];
  let bgFill = style.bgColor;
  if (style.bgMode === "gradient") {
    const a = (style.gradientAngle * Math.PI) / 180;
    const dx = Math.sin(a) / 2;
    const dy = -Math.cos(a) / 2;
    defs.push(
      `<linearGradient id="wbg" x1="${round(0.5 - dx)}" y1="${round(0.5 - dy)}" x2="${round(0.5 + dx)}" y2="${round(0.5 + dy)}"><stop offset="0" stop-color="${style.bgColor}"/><stop offset="1" stop-color="${style.bgColor2}"/></linearGradient>`
    );
    bgFill = "url(#wbg)";
  }
  if (style.shadow) {
    defs.push(
      `<filter id="wsh" x="-24%" y="-24%" width="148%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000000" flood-opacity="0.24"/></filter>`
    );
  }

  const bg = `<rect x="0" y="0" width="${W}" height="${height}" rx="${style.radius}" fill="${bgFill}"${style.shadow ? ' filter="url(#wsh)"' : ""}/>`;
  const frame =
    style.borderWidth > 0
      ? `<rect x="${style.borderWidth / 2}" y="${style.borderWidth / 2}" width="${W - style.borderWidth}" height="${height - style.borderWidth}" rx="${Math.max(0, style.radius - style.borderWidth / 2)}" fill="none" stroke="${style.borderColor}" stroke-width="${style.borderWidth}"/>`
      : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${round(height)}" viewBox="0 0 ${W} ${round(height)}" role="img" class="wgt${animClass ? " " + animClass : ""}"><title>${esc(title || content.message || "Widget")}</title><defs>${defs.join("")}</defs><style>${WIDGET_ANIMATION_CSS}.wgt.wa-pop,.wgt.wa-pulse{transform-box:fill-box;transform-origin:center}</style>${bg}${frame}${body.join("")}</svg>`;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Black or white — whichever reads better on the given color. */
function readableOn(hex: string): string {
  try {
    const [r, g, b] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 0.35 ? "#111111" : "#ffffff";
  } catch {
    return "#111111";
  }
}
