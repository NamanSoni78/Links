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
 * Renders the same header/blocks/button layout as the HTML WidgetCard
 * (title → optional text · sites · contacts blocks in order → button),
 * including per-character typing animations, so previews are honest.
 *
 * Optional `width`/`height` scale the card to a custom resolution:
 * one given → proportional scale; both → fit inside the box (aspect
 * preserved, transparent letterbox), never distorted.
 *
 * Pure string building: no React, no async, microseconds per render.
 */
import {
  animationClass,
  fontByKey,
  typingCss,
  WIDGET_ANIMATION_CSS,
  type WidgetData,
  type WidgetProfileContext,
  type WidgetTextBlock,
} from "./widgets";
import { hostOf } from "./url";

const W = 456; // card width (reads well at README scale)
const PAD = 28; // inner padding, matches the HTML card
const CONTENT_W = W - PAD * 2;
const IMG = 88; // image box, matches the HTML card
const IMG_GAP = 16;
const MAX_H = 1440;

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
    out.push(line);
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

const typingUid = (block: WidgetTextBlock, index: number): string =>
  `${index}${block.id.replace(/[^a-zA-Z0-9]/g, "") || "t"}`.slice(0, 16);

export interface RenderWidgetSvgOpts {
  /** header image, already inlined as a data URI by the route */
  imageSrc?: string;
  /** owner profile — powers the sites/contacts blocks */
  profile?: WidgetProfileContext;
  /** site url → inlined favicon data URI (route pre-fetches) */
  resolvedIcons?: Record<string, string>;
  /** custom output resolution (aspect always preserved) */
  width?: number;
  height?: number;
}

/* ── generator ───────────────────────────────────────────────── */

export function renderWidgetSvg(data: WidgetData, opts: RenderWidgetSvgOpts = {}): string {
  const { content, style, typography, animation, blocks } = data;
  const font = fontByKey(typography.font);
  const centered = typography.align === "center";
  const animClass = animationClass(animation);
  const profile = opts.profile ?? { displayName: "", bio: "", sites: [], contacts: [] };
  const icons = opts.resolvedIcons ?? {};

  const title = typography.uppercase ? content.title.toUpperCase() : content.title;
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

  const sites = blocks.order.includes("sites")
    ? profile.sites.slice(0, blocks.sites.limit > 0 ? blocks.sites.limit : profile.sites.length)
    : [];
  const contacts = blocks.order.includes("contacts")
    ? profile.contacts.slice(0, blocks.contacts.limit > 0 ? blocks.contacts.limit : profile.contacts.length)
    : [];

  const extraStyles: string[] = [];

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
        `<text x="${centered ? W / 2 : PAD}" y="${round(baseline)}" text-anchor="${centered ? "middle" : "start"}" fill="${style.textColor}" font-family="${esc(font.stack)}" font-size="${typography.titleSize}" font-weight="${typography.bold ? 700 : 500}"${typography.uppercase ? ' letter-spacing="0.6"' : ""}>${esc(line)}</text>`
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
        `<text x="${centered ? W / 2 : PAD}" y="${round(baseline)}" text-anchor="${centered ? "middle" : "start"}" fill="${style.textColor}" fill-opacity="0.82" font-family="${esc(font.stack)}" font-size="${typography.messageSize}">${esc(line)}</text>`
      );
      baseline += typography.messageSize * 1.5;
    }
    y += typography.messageSize * 1.5 * messageLines.length;
  }

  /* ── blocks (text · sites · contacts, in the owner's order) ── */
  blocks.order.forEach((kind) => {
    if (titleLines.length || messageLines.length) y += 16;

    if (kind === "text") {
      blocks.texts.forEach((t, ti) => {
        if (ti > 0) y += 8;
        const size = t.size;
        const maxChars = Math.max(10, Math.floor(CONTENT_W / (size * font.widthFactor)));
        const lines = fitLines(t.text, maxChars, 4);

        if (t.animation === "typing") {
          const uid = typingUid(t, ti);
          const chars = Array.from(t.text);
          extraStyles.push(
            typingCss(uid, {
              charCount: chars.length,
              delayMs: t.delayMs,
              speedMs: t.speedMs,
              loop: t.loop,
            })
          );
          let ci = 0;
          let baseline = y + size * 0.85;
          lines.forEach((line, li) => {
            const parts = Array.from(line).map(
              (ch) => `<tspan class="wt-${uid}-${ci++}">${esc(ch)}</tspan>`
            );
            if (li === lines.length - 1) parts.push(`<tspan class="wtc-${uid}">▌</tspan>`);
            body.push(
              `<text x="${centered ? W / 2 : PAD}" y="${round(baseline)}" text-anchor="${centered ? "middle" : "start"}" fill="${style.textColor}" fill-opacity="0.92" font-family="${esc(font.stack)}" font-size="${size}" font-weight="${t.bold ? 700 : 400}">${parts.join("")}</text>`
            );
            baseline += size * 1.45;
          });
          y += size * 1.45 * lines.length;
        } else {
          const cls = animationClass(t.animation);
          const delay = cls ? ` style="animation-delay:${t.delayMs}ms"` : "";
          let baseline = y + size * 0.85;
          for (const line of lines) {
            body.push(
              cls
                ? `<g class="${cls}"${delay}><text x="${centered ? W / 2 : PAD}" y="${round(baseline)}" text-anchor="${centered ? "middle" : "start"}" fill="${style.textColor}" fill-opacity="0.92" font-family="${esc(font.stack)}" font-size="${size}" font-weight="${t.bold ? 700 : 400}">${esc(line)}</text></g>`
                : `<text x="${centered ? W / 2 : PAD}" y="${round(baseline)}" text-anchor="${centered ? "middle" : "start"}" fill="${style.textColor}" fill-opacity="0.92" font-family="${esc(font.stack)}" font-size="${size}" font-weight="${t.bold ? 700 : 400}">${esc(line)}</text>`
            );
            baseline += size * 1.45;
          }
          y += size * 1.45 * lines.length;
        }
      });
    }

    if (kind === "sites") {
      sites.forEach((s) => {
        const hasDesc = blocks.sites.showDesc && !!s.desc;
        const titleSize = 13;
        const titleText = fitLines(s.title || hostOf(s.url), Math.max(8, Math.floor(CONTENT_W / (titleSize * font.widthFactor))), 1)[0];
        const descText = hasDesc
          ? fitLines(s.desc, Math.max(10, Math.floor(CONTENT_W / (10 * font.widthFactor))), 1)[0]
          : "";
        const estW = titleText.length * titleSize * font.widthFactor;

        // icon sits just left of the (possibly centered) text cluster
        let textX = blocks.sites.showFavicon ? PAD + 28 : PAD;
        let iconX = PAD;
        let anchor = "start";
        if (centered) {
          anchor = "middle";
          textX = W / 2 + (blocks.sites.showFavicon ? 14 : 0);
          iconX = W / 2 - estW / 2 - 28;
        }

        if (blocks.sites.showFavicon) {
          const iconSrc = s.favicon || icons[s.url] || "";
          body.push(
            iconSrc
              ? `<image x="${round(iconX)}" y="${round(y + 2)}" width="20" height="20" href="${esc(iconSrc)}" preserveAspectRatio="xMidYMid meet"/>`
              : `<circle cx="${round(iconX + 10)}" cy="${round(y + 12)}" r="6" fill="${style.textColor}" fill-opacity="0.25"/>`
          );
        }
        body.push(
          `<text x="${round(textX)}" y="${round(y + titleSize * 0.85)}" text-anchor="${anchor}" fill="${style.textColor}" font-family="${esc(font.stack)}" font-size="${titleSize}" font-weight="600">${esc(titleText)}</text>`
        );
        if (descText) {
          body.push(
            `<text x="${round(textX)}" y="${round(y + titleSize + 11)}" text-anchor="${anchor}" fill="${style.textColor}" fill-opacity="0.65" font-family="${esc(font.stack)}" font-size="10">${esc(descText)}</text>`
          );
        }
        y += hasDesc ? 34 : 24;
      });
      y += sites.length ? 4 : 0;
    }

    if (kind === "contacts") {
      contacts.forEach((c) => {
        const labelSize = 13;
        const labelText = c.label || (c.kind === "email" ? "Email" : c.kind === "phone" ? "Phone" : "Link");
        const valueText = fitLines(c.value, Math.max(10, Math.floor(CONTENT_W / (10.5 * 0.6))), 1)[0];
        const estW = labelText.length * labelSize * font.widthFactor;

        let textX = blocks.contacts.showIcon ? PAD + 27 : PAD;
        let iconX = PAD;
        let anchor = "start";
        if (centered) {
          anchor = "middle";
          textX = W / 2 + (blocks.contacts.showIcon ? 13.5 : 0);
          iconX = W / 2 - estW / 2 - 27;
        }

        if (blocks.contacts.showIcon) {
          const iconSrc = c.icon || "";
          if (iconSrc) {
            body.push(
              `<image x="${round(iconX)}" y="${round(y + 1)}" width="18" height="18" href="${esc(iconSrc)}" preserveAspectRatio="xMidYMid meet"/>`
            );
          } else {
            const glyph = c.kind === "email" ? "@" : c.kind === "phone" ? "☎" : "↗";
            body.push(
              `<rect x="${round(iconX)}" y="${round(y)}" width="18" height="18" rx="5" fill="none" stroke="${style.textColor}" stroke-opacity="0.45"/><text x="${round(iconX + 9)}" y="${round(y + 12.5)}" text-anchor="middle" fill="${style.textColor}" fill-opacity="0.8" font-family="${esc(font.stack)}" font-size="10">${esc(glyph)}</text>`
            );
          }
        }
        body.push(
          `<text x="${round(textX)}" y="${round(y + labelSize * 0.85)}" text-anchor="${anchor}" fill="${style.textColor}" font-family="${esc(font.stack)}" font-size="${labelSize}" font-weight="600">${esc(labelText)}</text>`
        );
        body.push(
          `<text x="${round(textX)}" y="${round(y + labelSize + 10)}" text-anchor="${anchor}" fill="${style.textColor}" fill-opacity="0.65" font-family="monospace" font-size="10.5">${esc(valueText)}</text>`
        );
        y += 32;
      });
    }
  });

  /* ── button ── */
  const hasLink = content.linkLabel.length > 0;
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

  const height = Math.min(MAX_H, Math.max(120, y + PAD));

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

  /* ── custom resolution (aspect never distorted) ── */
  let outW = W;
  let outH = height;
  if (opts.width && opts.height) {
    outW = opts.width;
    outH = opts.height;
  } else if (opts.width) {
    outW = opts.width;
    outH = Math.round((height * opts.width) / W);
  } else if (opts.height) {
    outH = opts.height;
    outW = Math.round((W * opts.height) / height);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${round(outW)}" height="${round(outH)}" viewBox="0 0 ${W} ${round(height)}" preserveAspectRatio="xMidYMid meet" role="img" class="wgt${animClass ? " " + animClass : ""}"><title>${esc(title || content.message || "Widget")}</title><defs>${defs.join("")}</defs><style>${WIDGET_ANIMATION_CSS}${extraStyles.join("")}g.wa-rise,g.wa-pop,g.wa-float,g.wa-pulse{transform-box:fill-box;transform-origin:center}</style>${bg}${frame}${body.join("")}</svg>`;
}
