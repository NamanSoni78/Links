import type { CSSProperties } from "react";
import {
  animationClass,
  fontByKey,
  typingCss,
  WIDGET_ANIMATION_CSS,
  type WidgetData,
  type WidgetProfileContext,
  type WidgetTextBlock,
} from "@/lib/widgets";
import { FaviconImg } from "@/components/favicon-img";
import { hostOf } from "@/lib/url";
import { cn } from "@/lib/utils";

/**
 * The single HTML renderer for widgets — used by the public page
 * (/username/widget, what iframes embed) and by the editor's live
 * preview, so what you design is exactly what visitors see.
 *
 * Renders the header (image/title/message), then the optional blocks
 * (text · sites · contacts) in the owner's chosen order, then the
 * button. Typing text blocks ship their own generated CSS so the
 * exact same animation runs in the SVG image version.
 *
 * No hooks, no client-only APIs → usable from server and client
 * components alike. Parents mount <WidgetAnimationStyles /> once.
 */

export function WidgetAnimationStyles() {
  return <style dangerouslySetInnerHTML={{ __html: WIDGET_ANIMATION_CSS }} />;
}

const typingUid = (block: WidgetTextBlock, index: number): string =>
  `${index}${block.id.replace(/[^a-zA-Z0-9]/g, "") || "t"}`.slice(0, 16);

function TextBlockView({ block, index }: { block: WidgetTextBlock; index: number }) {
  if (block.animation === "typing") {
    const uid = typingUid(block, index);
    const chars = Array.from(block.text);
    return (
      <p
        className="m-0 max-w-full whitespace-pre-wrap break-words"
        style={{
          fontSize: block.size,
          lineHeight: 1.45,
          fontWeight: block.bold ? 700 : 400,
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: typingCss(uid, { charCount: chars.length, delayMs: block.delayMs, speedMs: block.speedMs, loop: block.loop }) }} />
        {chars.map((ch, i) => (
          <span key={i} className={`wt-${uid}-${i}`}>
            {ch === " " ? "\u00A0" : ch}
          </span>
        ))}
        <span className={`wtc-${uid}`}>▌</span>
      </p>
    );
  }

  const cls = animationClass(block.animation);
  return (
    <p
      className={cn("m-0 max-w-full whitespace-pre-wrap break-words", cls)}
      style={{
        fontSize: block.size,
        lineHeight: 1.45,
        fontWeight: block.bold ? 700 : 400,
        ...(cls ? { animationDelay: `${block.delayMs}ms` } : null),
      }}
    >
      {block.text}
    </p>
  );
}

function SitesBlockView({
  profile,
  showFavicon,
  showDesc,
  limit,
  flatLinks,
}: {
  profile: WidgetProfileContext;
  showFavicon: boolean;
  showDesc: boolean;
  limit: number;
  flatLinks: boolean;
}) {
  const sites = profile.sites.slice(0, limit > 0 ? limit : profile.sites.length);
  if (sites.length === 0) {
    return (
      <p className="m-0 text-[13px] opacity-50" style={{ fontSize: 13, opacity: 0.5 }}>
        Your links will appear here.
      </p>
    );
  }
  return (
    <div className="w-full space-y-1.5">
      {sites.map((s) => {
        const inner = (
          <>
            {showFavicon && (
              <span className="flex size-[20px] shrink-0 items-center justify-center">
                {s.favicon ? (
                   
                  <img src={s.favicon} alt="" width={20} height={20} loading="lazy" className="size-[20px] rounded-[5px] object-contain" />
                ) : (
                  <FaviconImg url={s.url} size={20} />
                )}
              </span>
            )}
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[13.5px] font-medium">{s.title}</span>
              <span className="block truncate font-mono text-[10.5px] leading-4 opacity-70">
                {hostOf(s.url)}
                {showDesc && s.desc ? ` — ${s.desc}` : ""}
              </span>
            </span>
          </>
        );
        return flatLinks || !/^https?:\/\//.test(s.url) ? (
          <div key={s.url} className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5">
            {inner}
          </div>
        ) : (
          <a
            key={s.url}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 no-underline transition-transform duration-150 hover:translate-x-[2px]"
          >
            {inner}
          </a>
        );
      })}
    </div>
  );
}

function ContactsBlockView({
  profile,
  showIcon,
  limit,
  flatLinks,
}: {
  profile: WidgetProfileContext;
  showIcon: boolean;
  limit: number;
  flatLinks: boolean;
}) {
  const contacts = profile.contacts.slice(0, limit > 0 ? limit : profile.contacts.length);
  if (contacts.length === 0) {
    return (
      <p className="m-0" style={{ fontSize: 13, opacity: 0.5 }}>
        Add contacts on your page to list them here.
      </p>
    );
  }
  return (
    <div className="w-full space-y-1.5">
      {contacts.map((c) => {
        const initial = (c.kind === "email" ? "@" : c.kind === "phone" ? "☎" : "↗");
        const inner = (
          <>
            {showIcon && (
              <span className="flex size-[20px] shrink-0 items-center justify-center">
                {c.icon ? (
                   
                  <img src={c.icon} alt="" width={20} height={20} loading="lazy" className="size-[20px] rounded-[5px] object-contain" />
                ) : (
                  <span className="flex size-[20px] items-center justify-center rounded-[5px] border border-current text-[10px] opacity-70" style={{ borderColor: "currentColor" }}>
                    {initial}
                  </span>
                )}
              </span>
            )}
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[13px] font-medium">{c.label}</span>
              <span className="block truncate font-mono text-[10.5px] leading-4 opacity-70">{c.value}</span>
            </span>
          </>
        );
        return flatLinks || !c.href ? (
          <div key={c.value} className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5">
            {inner}
          </div>
        ) : (
          <a
            key={c.value}
            href={c.href}
            className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 no-underline transition-transform duration-150 hover:translate-x-[2px]"
          >
            {inner}
          </a>
        );
      })}
    </div>
  );
}

export function WidgetCard({
  data,
  className,
  flatLinks = false,
  profile,
}: {
  data: WidgetData;
  className?: string;
  /** render links as non-interactive <span>/<div> — for contexts where
   *  the card sits inside an <a> (dashboard thumbnails). Nested anchors
   *  are invalid HTML and break React hydration. */
  flatLinks?: boolean;
  /** owner profile — powers the sites/contacts blocks */
  profile?: WidgetProfileContext;
}) {
  const { content, style, typography, animation, blocks } = data;
  const font = fontByKey(typography.font);
  const centered = typography.align === "center";
  const emptyProfile: WidgetProfileContext = { displayName: "", bio: "", sites: [], contacts: [] };
  const ctx = profile ?? emptyProfile;

  const cardStyle: CSSProperties = {
    borderRadius: style.radius,
    border:
      style.borderWidth > 0
        ? `${style.borderWidth}px solid ${style.borderColor}`
        : undefined,
    background:
      style.bgMode === "gradient"
        ? `linear-gradient(${style.gradientAngle}deg, ${style.bgColor}, ${style.bgColor2})`
        : style.bgColor,
    boxShadow: style.shadow ? "0 14px 34px -14px rgb(0 0 0 / 0.28)" : undefined,
    color: style.textColor,
    fontFamily: font.stack,
  };

  const hasImage = content.imageUrl.length > 0;
  const hasTitle = content.title.length > 0;
  const hasMessage = content.message.length > 0;
  const hasLink = content.linkLabel.length > 0;
  const hasBlocks = blocks.order.length > 0;
  const hasAnything = hasImage || hasTitle || hasMessage || hasLink || hasBlocks;

  const imageRadius =
    content.imageShape === "circle"
      ? "9999px"
      : content.imageShape === "rounded"
        ? "18px"
        : "6px";

  const textBlocks = blocks.texts;

  return (
    <div
      data-widget-card
      style={cardStyle}
      className={cn(
        "w-full max-w-[420px] select-none px-7 py-6 sm:px-8 sm:py-7",
        animationClass(animation),
        className
      )}
    >
      {!hasAnything ? (
        <p style={{ fontSize: 14, opacity: 0.55, textAlign: centered ? "center" : "left" }}>
          Empty widget — add a title, message or image.
        </p>
      ) : (
        <div
          className="flex flex-col"
          style={{
            alignItems: centered ? "center" : "flex-start",
            textAlign: centered ? "center" : "left",
          }}
        >
          {hasImage && (
            <img
              src={content.imageUrl}
              alt=""
              width={88}
              height={88}
              loading="lazy"
              draggable={false}
              referrerPolicy="no-referrer"
              className="mb-4 size-[88px] shrink-0 object-cover"
              style={{ borderRadius: imageRadius }}
            />
          )}

          {hasTitle && (
            <h2
              className="m-0 max-w-full whitespace-pre-wrap break-words"
              style={{
                fontSize: typography.titleSize,
                lineHeight: 1.18,
                fontWeight: typography.bold ? 700 : 500,
                textTransform: typography.uppercase ? "uppercase" : "none",
                letterSpacing: typography.uppercase ? "0.02em" : undefined,
              }}
            >
              {content.title}
            </h2>
          )}

          {hasMessage && (
            <p
              className="m-0 max-w-full whitespace-pre-wrap break-words"
              style={{
                fontSize: typography.messageSize,
                lineHeight: 1.5,
                marginTop: hasTitle ? 10 : 0,
                opacity: 0.82,
              }}
            >
              {content.message}
            </p>
          )}

          {blocks.order.map((kind) => {
            const gap = { marginTop: hasTitle || hasMessage ? 16 : 0 };
            if (kind === "text") {
              if (textBlocks.length === 0) return null;
              return (
                <div key="block-text" className="w-full space-y-2" style={{ ...gap, width: "100%" }}>
                  {textBlocks.map((t, i) => (
                    <TextBlockView key={t.id} block={t} index={i} />
                  ))}
                </div>
              );
            }
            if (kind === "sites") {
              return (
                <div key="block-sites" style={{ ...gap, width: "100%" }}>
                  <SitesBlockView
                    profile={ctx}
                    showFavicon={blocks.sites.showFavicon}
                    showDesc={blocks.sites.showDesc}
                    limit={blocks.sites.limit}
                    flatLinks={flatLinks}
                  />
                </div>
              );
            }
            return (
              <div key="block-contacts" style={{ ...gap, width: "100%" }}>
                <ContactsBlockView
                  profile={ctx}
                  showIcon={blocks.contacts.showIcon}
                  limit={blocks.contacts.limit}
                  flatLinks={flatLinks}
                />
              </div>
            );
          })}

          {hasLink &&
            (flatLinks || !content.linkUrl ? (
              <span
                className="mt-5 inline-flex max-w-full items-center justify-center truncate rounded-full px-5 py-2.5 text-[13.5px] font-semibold"
                style={{ background: style.accentColor, color: readableOn(style.accentColor) }}
              >
                {content.linkLabel}
              </span>
            ) : (
              <a
                href={content.linkUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-5 inline-flex max-w-full items-center justify-center truncate rounded-full px-5 py-2.5 text-[13.5px] font-semibold no-underline transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
                style={{ background: style.accentColor, color: readableOn(style.accentColor) }}
              >
                {content.linkLabel}
              </a>
            ))}
        </div>
      )}
    </div>
  );
}

/** Black or white — whichever reads better on the given color. */
export function readableOn(hex: string): string {
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
