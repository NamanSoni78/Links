/**
 * Links — end-to-end flow test against the dev server (http://localhost:3000).
 *
 * Assumes: dev server running, DB reachable, no RESEND_API_KEY (dev codes
 * are returned in API responses), ADMIN_USERNAME=admin ADMIN_PASSWORD=admin123.
 *
 *   node scripts/e2e.mjs
 */
const BASE = process.env.E2E_BASE || "http://localhost:3000";

const results = [];
function pass(name) {
  results.push([name, true]);
  console.log(`  ✓ ${name}`);
}
function failx(name, detail) {
  results.push([name, false]);
  console.log(`  ✗ ${name} — ${detail}`);
}

async function req(method, path, { body, cookie, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const setCookie = res.headers.get("set-cookie");
  let data = null;
  let text = "";
  try {
    text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      /* not json */
    }
  } catch {
    /* no body */
  }
  return { status: res.status, data, setCookie, text, res };
}

const email = `e2e-${Date.now()}@example.com`;
const email2 = `e2e2-${Date.now()}@example.com`;
const slug = `e2euser${Date.now().toString().slice(-6)}`;
let session = "";

console.log("\n── Links e2e ─────────────────────────────\n");

/* 1 — signup validation */
{
  const r = await req("POST", "/api/auth/signup", { body: { email: "nope", password: "x", agree: true } });
  r.status === 400 ? pass("signup rejects bad input") : failx("signup rejects bad input", r.status);
  const r2 = await req("POST", "/api/auth/signup", { body: { email: email, password: "password123", agree: false } });
  r2.status === 400 ? pass("signup requires terms agreement") : failx("signup requires terms agreement", r2.status);
}

/* 2 — signup + verify + session */
{
  const r = await req("POST", "/api/auth/signup", {
    body: { email, password: "password123", agree: true },
  });
  if (r.status !== 200 || !r.data.ok) failx("signup works", JSON.stringify(r.data));
  else {
    pass("signup works (dev code returned)");
    const code = r.data.devCode;
    const v = await req("POST", "/api/auth/otp", {
      body: { email, code, purpose: "signup" },
    });
    if (v.status !== 200 || !v.data.ok) {
      failx("verify sets session", JSON.stringify(v.data));
    } else {
      session = v.setCookie?.split(";")[0] ?? "";
      session ? pass("verify sets session cookie") : failx("verify sets session cookie", "no cookie");
    }
  }
}

/* 3 — me */
{
  const r = await req("GET", "/api/me", { cookie: session });
  r.data?.user?.email === email
    ? pass("GET /api/me shows the user")
    : failx("GET /api/me shows the user", JSON.stringify(r.data));
}

/* 4 — slug availability */
{
  const r = await req("GET", `/api/slug-check?slug=${slug}`);
  r.data?.available === true
    ? pass("slug available before claim")
    : failx("slug available before claim", JSON.stringify(r.data));
  const bad = await req("GET", "/api/slug-check?slug=admin");
  bad.data?.reason === "reserved"
    ? pass("reserved slug rejected")
    : failx("reserved slug rejected", JSON.stringify(bad.data));
}

/* 5 — claim page + links */
{
  const r = await req("PUT", "/api/profile", {
    cookie: session,
    body: {
      slug,
      displayName: "E2E Tester",
      description: "I test things end to end.",
      tags: ["tester", "qa"],
      links: [
        { id: "", url: "https://github.com/NamanSoni78", title: "GitHub" },
        { id: "", url: "youtube.com", title: "" }, // scheme-less + auto title
      ],
    },
  });
  if (r.status !== 200 || !r.data.ok) {
    failx("save page", JSON.stringify(r.data));
  } else {
    pass("claim username + save page");
    r.data.slug === slug
      ? pass("slug echoed back")
      : failx("slug echoed back", r.data.slug);
  }
}

/* 6 — public page */
{
  const r = await req("GET", `/${slug}`);
  if (r.status !== 200) failx("public profile 200", r.status);
  else {
    const html = r.text;
    html.includes("E2E Tester") && html.includes("schema.org")
      ? pass("public page renders name + JSON-LD")
      : failx("public page renders name + JSON-LD", "content missing");
  }
  const r2 = await req("GET", `/${slug.toUpperCase()}`);
  r2.status === 308 || r2.status === 307
    ? pass("uppercase slug redirects to lowercase")
    : failx("uppercase slug redirects", r2.status);
  const r3 = await req("GET", "/does-not-exist-xyz");
  r3.status === 404 ? pass("unknown slug 404s") : failx("unknown slug 404s", r3.status);
}

/* 7 — slug now taken */
{
  const r = await req("GET", `/api/slug-check?slug=${slug}`);
  r.data?.available === false
    ? pass("claimed slug now taken")
    : failx("claimed slug now taken", JSON.stringify(r.data));
}

/* 8 — sitemap + og */
{
  const r = await req("GET", "/sitemap.xml");
  r.text.includes(slug)
    ? pass("sitemap includes the new page")
    : failx("sitemap includes the new page", "slug missing");
  const og = await req("GET", `/api/og?u=${slug}`);
  og.status === 200 && (og.res.headers.get("content-type") ?? "").includes("image")
    ? pass("dynamic OG image renders")
    : failx("dynamic OG image renders", `${og.status} ${og.res.headers.get("content-type")}`);
}

/* 9 — login flows */
{
  const out = await req("POST", "/api/auth/logout", { cookie: session });
  out.status === 200 ? pass("logout") : failx("logout", out.status);
  const wrong = await req("POST", "/api/auth/login", {
    body: { email, password: "wrong-password" },
  });
  wrong.status === 401 ? pass("wrong password rejected") : failx("wrong password rejected", wrong.status);
  const good = await req("POST", "/api/auth/login", {
    body: { email, password: "password123" },
  });
  if (good.status === 200 && good.data.ok) {
    session = good.setCookie.split(";")[0];
    pass("login works, new session");
  } else failx("login works", JSON.stringify(good.data));
}

/* 10 — forgot + reset */
{
  const f = await req("POST", "/api/auth/forgot", { body: { email } });
  const code = f.data?.devCode;
  if (!code) failx("forgot sends code (dev)", JSON.stringify(f.data));
  else {
    pass("forgot sends code (dev)");
    const unknown = await req("POST", "/api/auth/forgot", { body: { email: "nobody@nowhere.io" } });
    unknown.status === 200 && unknown.data?.ok
      ? pass("forgot doesn't leak unknown emails")
      : failx("forgot doesn't leak", JSON.stringify(unknown.data));
    const rp = await req("POST", "/api/auth/reset", {
      body: { email, code, password: "newpassword456" },
    });
    rp.status === 200 ? pass("reset password with code") : failx("reset password", JSON.stringify(rp.data));
    const oldLogin = await req("POST", "/api/auth/login", { body: { email, password: "password123" } });
    oldLogin.status === 401
      ? pass("old password no longer works")
      : failx("old password rejected", oldLogin.status);
    const newLogin = await req("POST", "/api/auth/login", { body: { email, password: "newpassword456" } });
    newLogin.status === 200
      ? pass("new password works")
      : failx("new password works", JSON.stringify(newLogin.data));
  }
}

/* 11 — change password via settings api */
{
  const r = await req("POST", "/api/account/password", {
    cookie: session,
    body: { currentPassword: "newpassword456", newPassword: "finalpassword789" },
  });
  r.status === 200 ? pass("password change via settings") : failx("password change", JSON.stringify(r.data));
}

/* 12 — unverified user flow (second account) */
{
  const s = await req("POST", "/api/auth/signup", {
    body: { email: email2, password: "password123", agree: true },
  });
  const signupCode = s.data?.devCode;
  const l = await req("POST", "/api/auth/login", { body: { email: email2, password: "password123" } });
  l.data?.needsVerification === true
    ? pass("unverified login routes to verification")
    : failx("unverified login routes", JSON.stringify(l.data));
  if (signupCode) {
    const v = await req("POST", "/api/auth/otp", {
      body: { email: email2, code: signupCode, purpose: "signup" },
    });
    v.status === 200 ? pass("second account verified") : failx("second account verified", JSON.stringify(v.data));
    // session2
    const session2 = v.setCookie.split(";")[0];
    const claim = await req("PUT", "/api/profile", {
      cookie: session2,
      body: { slug: slug, displayName: "Clash Test", description: "", tags: [], links: [] },
    });
    claim.status === 409
      ? pass("slug conflict rejected (409)")
      : failx("slug conflict rejected", claim.status);
    const del = await req("DELETE", "/api/account", { cookie: session2 });
    del.status === 200 ? pass("account deletion works") : failx("account deletion", del.status);
  }
}

/* 13 — admin */
{
  const auth = "Basic " + Buffer.from("admin:admin123").toString("base64");
  const noAuth = await req("GET", "/admin");
  noAuth.status === 401 ? pass("admin requires basic auth") : failx("admin requires basic auth", noAuth.status);
  const r = await req("GET", "/admin", { headers: { authorization: auth } });
  if (r.status === 200) {
    r.text.includes(email) ? pass("admin lists the user") : failx("admin lists the user", "email missing");
    pass("admin renders (200)");
  } else failx("admin with creds renders", r.status);
}

/* 14 — static assets */
{
  const r = await req("GET", "/icon.svg");
  r.status === 200 ? pass("app icon served") : failx("app icon served", r.status);
  const r2 = await req("GET", "/manifest.webmanifest");
  r2.status === 200 ? pass("manifest served") : failx("manifest served", r2.status);
}

/* 15 — cleanup: delete the main test account */
{
  const r = await req("DELETE", "/api/account", { cookie: session });
  r.status === 200 ? pass("cleanup: main test account deleted") : failx("cleanup", r.status);
  const page = await req("GET", `/${slug}`);
  page.status === 404 ? pass("profile page 404s after deletion") : failx("profile 404 after delete", page.status);
}

/* summary */
const failed = results.filter(([, ok]) => !ok);
console.log("\n──────────────────────────────────────────");
console.log(`  ${results.length - failed.length}/${results.length} passed${failed.length ? `, ${failed.length} FAILED` : ""}\n`);
process.exit(failed.length ? 1 : 0);
