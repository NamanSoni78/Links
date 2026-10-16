# 🔗 Links

A free, fast, clean **link-in-bio** platform — a simpler Linktree — built with
Next.js 16 and designed to run entirely on free tiers
(**Vercel** + **Turso** + **Resend**), at [links.namansoni.in](https://links.namansoni.in).

## Features

- **Email + password accounts** with **OTP email verification** (Resend, from `no-reply@links.namansoni.in`)
- **Forgot-password** flow with email codes
- **Live username claiming** — `links.namansoni.in/you` with instant availability checks, protected against reserved paths (`/admin`, `/sitemap.xml`, …)
- **Page editor** — display name, bio, tags, and links with **auto-fetched favicons**, drag-to-reorder, undo on delete, auto-titles, and a **live phone preview**
- **Public profiles** cached at the edge (near-zero function CPU per visit), with per-profile SEO metadata, JSON-LD, dynamic Open Graph images, and a custom 404 that invites claiming the username
- **Day / night mode**, buttery CSS-only animations, `prefers-reduced-motion` friendly
- **Admin panel** at `/admin` (HTTP Basic auth via env vars) — user counts, 14-day signup chart, recent users table
- **Terms of Service & Privacy Policy** written for an indie, no-guarantees service
- SEO: `sitemap.xml`, `robots.txt`, web manifest, canonical URLs, OG/Twitter cards

## Tech stack

| Layer     | Choice                                                      |
| --------- | ----------------------------------------------------------- |
| Framework | Next.js 16 (App Router) + TypeScript + React 19             |
| Styling   | Tailwind CSS 4, shadcn/ui primitives, Geist Sans/Mono       |
| Database  | Turso (libSQL) via `@libsql/client` — free tier             |
| Email     | Resend — free tier (100 emails/day)                         |
| Auth      | PBKDF2 password hashing (WebCrypto) + `jose` JWT sessions in httpOnly cookies |
| Hosting   | Vercel Hobby                                                |

---

## 🚀 Deploy to links.namansoni.in (15 minutes, all free)

### 1 · Turso — the database

1. Create a free account at [turso.tech](https://turso.tech) and create a database (any name, e.g. `links`).
2. Open **`turso-setup.ipynb`** (included next to this zip) in [Google Colab](https://colab.research.google.com), paste your **database URL** and **auth token**, and run all cells. That creates the schema (4 tables) for you.
   - Prefer a terminal? `turso db show <name> --url` + `turso db tokens create <name>`, then `npm install && npm run db:init` with the env vars below.
3. Keep the URL and token handy — they go into Vercel next.

### 2 · Resend — the email

1. Create a free account at [resend.com](https://resend.com).
2. Add your domain **`namansoni.in`** under *Domains* and add the shown **SPF + DKIM** DNS records at your registrar. Wait for *Verified*.
3. Create an **API key** and keep it handy. Mail will be sent from `no-reply@links.namansoni.in` (configurable via `EMAIL_FROM`).

### 3 · Vercel — the app

1. Push this project to a GitHub repo (or use the Vercel CLI / drag-and-drop).
2. In Vercel: **Add New → Project → import the repo**. No build settings needed — defaults work.
3. Under **Settings → Environment Variables**, add:

| Variable              | Value                                              |
| --------------------- | -------------------------------------------------- |
| `TURSO_DATABASE_URL`  | `libsql://…` from step 1                           |
| `TURSO_AUTH_TOKEN`    | token from step 1                                  |
| `RESEND_API_KEY`      | `re_…` from step 2                                 |
| `EMAIL_FROM`          | `Links <no-reply@links.namansoni.in>` *(optional — this is the default)* |
| `AUTH_SECRET`         | any long random string (see command below)         |
| `ADMIN_USERNAME`      | your admin panel username                          |
| `ADMIN_PASSWORD`      | your admin panel password                          |
| `NEXT_PUBLIC_SITE_URL`| `https://links.namansoni.in`                       |

Generate an `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. **Deploy.** Then add the domain: **Settings → Domains → Add → `links.namansoni.in`** and follow the DNS instructions (a `CNAME` to `cname.vercel-dns.com`, or the A record `76.76.21.21`).

That's it — signup, email codes, profiles and the admin panel all work now.

### 4 · Admin panel

Visit `https://links.namansoni.in/admin` and sign in with HTTP Basic auth using
`ADMIN_USERNAME` / `ADMIN_PASSWORD`. It shows total/verified users, claimed
pages, link counts, a 14-day signup chart, and the latest 25 accounts.

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
`demo@links.test / demo-pass-123` style accounts can be created in seconds.

Useful scripts:

```bash
npm run db:init     # (re)apply the schema — safe, idempotent
npm run test:e2e    # 35-check end-to-end test suite against the dev server
```

---

## 🧘 How it respects Vercel's free CPU limits

The whole point: **public pages cost (almost) nothing to serve.**

- Public profile pages are rendered once, then served from the **CDN full-route cache**; saving from the editor calls `revalidatePath` for instant updates. Visitors don't invoke serverless functions at all.
- The sitemap regenerates at most hourly; dynamic OG images are edge-cached for a day per profile.
- Landing, auth, terms and privacy pages are fully static.
- Only the dashboard, API routes and admin panel run per-request, and each does nothing heavier than a few indexed SQLite queries plus one PBKDF2 hash (native crypto, ~50 ms).

## 🗂 Project structure

```
src/
├── app/
│   ├── page.tsx              # landing
│   ├── [username]/page.tsx   # public profile (ISR-cached, SEO, JSON-LD)
│   ├── (auth)/               # login · signup · verify · forgot/reset password
│   ├── (dash)/               # dashboard editor · settings
│   ├── admin/                # basic-auth operator panel
│   ├── terms/ · privacy/     # legal pages
│   ├── api/                  # auth, profile, links, account, slug-check, og
│   ├── sitemap.ts · robots.ts · manifest.ts · icon.svg
│   └── opengraph-image.tsx   # static brand social card (build-time)
├── components/               # editor, public view, auth forms, chrome
├── lib/                      # db, auth, otp, mail, slug rules, url helpers
└── proxy.ts                  # /admin basic-auth gate
scripts/
├── schema.sql                # single source of truth for the DB schema
├── init-db.mjs               # apply schema (local file or remote Turso)
├── e2e.mjs                   # end-to-end test suite
└── make-notebook.py          # regenerates turso-setup.ipynb from schema.sql
```

## 🔒 Security notes

- Passwords: PBKDF2-SHA256, 100k iterations, per-user salt, constant-time compare — via native WebCrypto (no pure-JS bcrypt burn).
- Sessions: HS256 JWT in an httpOnly, sameSite=lax, Secure cookie; re-checked against the database on every request.
- OTP codes: stored hashed, 10-minute expiry, 6-attempt limit, 60-second resend cooldown.
- Login lockout: 10 failed attempts → 15-minute lock.
- Public profile pages set `rel="noopener noreferrer nofollow"` on user links; JSON-LD is escape-hardened.

## 📄 License & credits

A small project by [Naman Soni](https://github.com/NamanSoni78) — provided as-is,
with no guarantees. See the in-app Terms of Service for the human-language version.
