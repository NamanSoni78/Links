"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { faviconFor } from "@/lib/url";
import { cn } from "@/lib/utils";

/**
 * Renders a link's favicon (Google s2 service — cached, reliable).
 * Falls back to a globe glyph if the icon can't be loaded.
 */
export function FaviconImg({
  url,
  size = 20,
  className,
}: {
  url: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <Globe
        aria-hidden="true"
        style={{ width: size, height: size }}
        className={cn("text-muted-foreground", className)}
      />
    );
  }

  return (
    <img
      src={faviconFor(url)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className={cn("rounded-[5px] object-contain", className)}
    />
  );
}
