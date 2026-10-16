import type { CSSProperties } from "react";
import { animationClass, fontByKey, WIDGET_ANIMATION_CSS, type WidgetData } from "@/lib/widgets";
import { cn } from "@/lib/utils";

/**
 * The single HTML renderer for widgets — used by the public page
 * (/w/<slug>, what iframes embed) and by the editor's live preview,
 * so what you design is exactly what visitors see.
 *
 * No hooks, no client-only APIs → usable from server and client
 * components alike. Parents mount <WidgetAnimationStyles /> once.
 */

export function WidgetAnimationStyles() {
  return <style dangerouslySetInnerHTML={{ __html: WIDGET_ANIMATION_CSS }} />;
}

export function WidgetCard({
  data,
  className,
  flatLinks = false,
}: {
  data: WidgetData;
  className?: string;
  /** render the link button as a <span> — for contexts where the card sits
   *  inside an <a> (dashboard thumbnails). Nested anchors are invalid HTML
   *  and break React hydration, so thumbnails flatten the link instead. */
  flatLinks?: boolean;
}) {
  const { content, style, typography, animation } = data;
  const font = fontByKey(typography.font);
  const centered = typography.align === "center";

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
  const hasAnything = hasImage || hasTitle || hasMessage || hasLink;

  const imageRadius =
    content.imageShape === "circle"
      ? "9999px"
      : content.imageShape === "rounded"
        ? "18px"
        : "6px";

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
