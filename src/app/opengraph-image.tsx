import { ImageResponse } from "next/og";

/**
 * Root social card — generated at build time, zero runtime cost.
 */
export default function OpengraphImage() {
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
          padding: "80px 90px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 15,
              background: "#EA580C",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            L
          </div>
          <div style={{ fontSize: 36, fontWeight: 650, letterSpacing: "-0.02em" }}>
            Links
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 22,
          }}
        >
          <div
            style={{
              fontSize: 74,
              fontWeight: 650,
              letterSpacing: "-0.025em",
              lineHeight: 1.12,
              maxWidth: 900,
            }}
          >
            One link for everything you share.
          </div>
          <div style={{ fontSize: 27, color: "#A8A29E", lineHeight: 1.55, maxWidth: 780 }}>
            Claim your own corner of the internet — a clean, quick page for your
            bio and everything you&apos;re into. Free forever.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #292524",
            paddingTop: 30,
            fontSize: 23,
            color: "#EA580C",
            letterSpacing: "0.02em",
          }}
        >
          <span>links.namansoni.in</span>
          <span style={{ color: "#A8A29E" }}>Free · No ads · No tracking</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
