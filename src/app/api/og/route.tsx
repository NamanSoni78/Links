import { ImageResponse } from "next/og";
import { fetchPublicProfile } from "@/lib/profiles";

export const runtime = "nodejs";

/**
 * GET /api/og?u=slug — per-profile social card (1200×630).
 * Rendered once per profile, then cached at the edge.
 */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("u")?.toLowerCase() ?? "";
  const profile = await fetchPublicProfile(slug);

  if (!profile) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0D0C0B",
            color: "#FAF9F6",
            fontSize: 64,
            fontWeight: 600,
          }}
        >
          Links
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const initials = profile.displayName
    ? profile.displayName
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : profile.slug.slice(0, 2).toUpperCase();

  const subtitle =
    profile.description ||
    `${profile.links.length} link${profile.links.length === 1 ? "" : "s"} · all in one place`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0D0C0B",
          color: "#FAF9F6",
          padding: "72px 84px",
          fontFamily: "sans-serif",
        }}
      >
        {/* brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#EA580C",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            L
          </div>
          <div style={{ fontSize: 34, fontWeight: 650, letterSpacing: "-0.02em" }}>
            Links
          </div>
        </div>

        {/* identity */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 128,
              height: 128,
              borderRadius: 999,
              background: "#C2410C",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 52,
              fontWeight: 650,
              color: "#fff",
            }}
          >
            {initials}
          </div>
          <div
            style={{
              fontSize: 58,
              fontWeight: 650,
              letterSpacing: "-0.02em",
              color: "#FAF9F6",
            }}
          >
            {profile.displayName}
          </div>
          <div style={{ fontSize: 26, color: "#A8A29E", letterSpacing: "0.04em" }}>
            {`@${profile.slug}`}
          </div>
          {profile.description ? (
            <div
              style={{
                fontSize: 24,
                color: "#A8A29E",
                maxWidth: 760,
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
                {subtitle}
              </div>
          ) : null}
        </div>

        {/* footer row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #292524",
            paddingTop: 28,
          }}
        >
          <div style={{ fontSize: 22, color: "#A8A29E" }}>
            {`${profile.links.length} link${profile.links.length === 1 ? "" : "s"}`}
          </div>
          <div style={{ fontSize: 22, color: "#EA580C", letterSpacing: "0.02em" }}>
            {`links.namansoni.in/${profile.slug}`}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
