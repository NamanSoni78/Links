# 🔧 Links — Setup & Deployment Guide

Everything you need to run **Links** yourself: local development, and a
15-minute deployment to production on **entirely free tiers**
(Vercel Hobby + Turso + Resend).

For an overview of what the project is and does, see the [README](README.md).

---

## 🚀 Deploy to production (15 minutes, all free)

### 1 · Turso — the database

1. Create a free account at [turso.tech](https://turso.tech) and create a database (any name, e.g. `links`).
2. Open **`turso-setup.ipynb`** (in this repo) in [Google Colab](https://colab.research.google.com), paste your **database URL** and **auth token**, and run all cells. That creates the schema (5 tables) for you.
   - Prefer a terminal? `turso db show <name> --url` + `turso db tokens create <name>`, then `npm install && npm run db:init` with the env vars below.
3. Keep the URL and token handy — they go into Vercel next.

### 2 · Resend — the email

1. Create a free account at [resend.com](https://resend.com).
2. Add your domain (e.g. **`namansoni.in`**) under *Domains* and add the shown **SPF + DKIM** DNS records at your registrar. Wait for *Verified*.
3. Create an **API key** and keep it handy. Mail will be sent from `no-reply@<your-domain>` (configurable via `EMAIL_FROM`).

### 3 · Vercel — the app

1. Push this project to a GitHub repo (or use the Vercel CLI / drag-and-drop).
2. In Vercel: **Add New → Project → import the repo**. No build settings needed — defaults work.
3. Under **Settings → Environment Variables**, add:

| Variable              | Value                                              |
| --------------------- | -------------------------------------------------- |
| `TURSO_DATABASE_URL`  | `libsql://…` from step 1                           |
| `TURSO_AUTH_TOKEN`    | token from step 1                                  |
| `RESEND_API_KEY`      | `re_…` from step 2                                 |
| `EMAIL_FROM`          | `Links <no-reply@your-domain.com>` *(optional — a sensible default is used)* |
| `AUTH_SECRET`         | any long random string (see command below)         |
| `ADMIN_USERNAME`      | your admin panel username                          |
| `ADMIN_PASSWORD`      | your admin panel password                          |
| `NEXT_PUBLIC_SITE_URL`| `https://your-domain.com`                          |

Generate an `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. **Deploy.** Then add the domain: **Settings → Domains → Add**, and follow the DNS instructions (a `CNAME` to `cname.vercel-dns.com`, or the A record `76.76.21.21`).

That's it — signup, email codes, profiles, widgets and the admin panel all work now.

### 4 · Admin panel

Visit `https://your-domain.com/admin` and sign in with HTTP Basic auth using
`ADMIN_USERNAME` / `ADMIN_PASSWORD`. It shows total/verified users, claimed
pages, link + widget counts, a 14-day signup chart, and the latest 25 accounts.

---

## 💻 Local development

```bash
npm install

# Local SQLite database (no Turso account needed)
cp .env.example .env          # defaults already point at a local file
npm run db:init               # creates db/local.db with the schema

npm run dev                   # http://localhost:3000
```

With no `RESEND_API_KEY` set, OTP codes are **printed to the server console**
(and returned in API responses) so you can test the full flow without email.

Useful scripts:

```bash
npm run db:init     # (re)apply the schema — safe, idempotent
npm run test:e2e    # end-to-end test suite against the dev server
```

---

## 🧘 How it respects Vercel's free CPU limits

The whole point: **public pages cost (almost) nothing to serve.**

- Public profile pages and widget pages are rendered once, then served from the **CDN full-route cache**; saving from the editors calls `revalidatePath` for instant updates. Visitors don't invoke serverless functions at all.
- Widget embed SVGs are served with `Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=604800` — the CDN absorbs virtually all embed traffic, and a `?v=` version tag busts caches on save.
- The sitemap regenerates at most hourly; dynamic OG images are edge-cached for a day per profile.
- Landing, auth, terms and privacy pages are fully static.
- Only the dashboard, API routes and admin panel run per-request, and each does nothing heavier than a few indexed SQLite queries plus one PBKDF2 hash (native crypto, ~50 ms).
- Widgets have no server-side rendering pipeline at all in the common case: the SVG generator is a single string-builder pass (no headless browser, no satori, no image rasterization).

## 🗂 Project structure

```
src/
├── app/
│   ├── page.tsx              # landing
│   ├── [username]/page.tsx   # public profile (ISR-cached, SEO, JSON-LD)
│   ├── w/[slug]/page.tsx     # public widget page (what iframes embed)
│   ├── (auth)/               # login · signup · verify · forgot/reset password
│   ├── (dash)/               # dashboard editor · widgets · settings
│   ├── admin/                # basic-auth operator panel
│   ├── terms/ · privacy/     # legal pages
│   ├── api/                  # auth, profile, links, account, widgets, embed, og
│   ├── sitemap.ts · robots.ts · manifest.ts · icon.svg
│   └── opengraph-image.tsx   # static brand social card (build-time)
├── components/
│   ├── widgets/              # builder, live preview, embed panel, list
│   ├── editor/               # profile page editor + phone preview
│   ├── public-view/          # profile renderer
│   ├── auth/ · dash/ · legal/
├── lib/
│   ├── widgets.ts            # widget model, fonts, presets, validation
│   ├── widget-svg.ts         # deterministic SVG generator (embeds)
│   ├── widgets-db.ts         # widget data access + slug allocation
│   ├── db.ts · auth.ts · otp.ts · mail.ts · slug.ts · url.ts
└── proxy.ts                  # /admin basic-auth gate
scripts/
├── schema.sql                # single source of truth for the DB schema
├── init-db.mjs               # apply schema (local file or remote Turso)
├── e2e.mjs                   # end-to-end test suite
└── make-notebook.py          # regenerates turso-setup.ipynb from schema.sql
```

## 🗄 Database schema

Five tables — `users`, `profiles`, `links`, `otp_codes`, `widgets`. See
[`scripts/schema.sql`](scripts/schema.sql). User deletion cascades to profiles,
links and widgets. Widget slugs are globally unique within the `/w/` namespace
and checked against a reserved-word blacklist.

## 🔒 Security notes

- Passwords: PBKDF2-SHA256, 100k iterations, per-user salt, constant-time compare — via native WebCrypto (no pure-JS bcrypt burn).
- Sessions: HS256 JWT in an httpOnly, sameSite=lax, Secure cookie; re-checked against the database on every request.
- OTP codes: stored hashed, 10-minute expiry, 6-attempt limit, 60-second resend cooldown.
- Login lockout: 10 failed attempts → 15-minute lock.
- Widget content is strictly validated and normalized server-side (whitelisted fonts/colors/animations, https-only URLs, length caps) before it is ever stored or rendered — the SVG generator only ever sees sanitized values, so no injection through embeds.
- Public profile pages set `rel="noopener noreferrer nofollow"` on user links; JSON-LD is escape-hardened.

## 🧩 Widget embed formats

Each widget can be embedded four ways, all served straight from cache:

| Format   | Snippet                                                      | Best for                    |
| -------- | ------------------------------------------------------------ | --------------------------- |
| Markdown | `![name](https://…/api/embed/slug?v=…)`                      | GitHub READMEs, forums      |
| HTML     | `<a href=…><img src=…></a>` (+ commented iframe variant)    | Websites, email signatures  |
| Image    | the raw SVG URL                                              | Notion, dev.to, anywhere    |
| Page     | `https://…/w/slug`                                           | DMs, link-in-bio pages      |

The SVG carries the widget's CSS animations and renders in any `<img>` context.
The interactive iframe (`/w/slug/embed`) is for sites that allow iframes.
