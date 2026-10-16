<div align="center">

# 🔗 Links

**Your internet homepage — one page for all your links, and embeddable cards for everywhere else.**

A free, fast, clean **link-in-bio** platform and a **widget studio**, built with
Next.js 16 and designed to run entirely on free tiers.

[Live](https://links.namansoni.in) · [Setup guide](setup.md) · [Report a bug](https://github.com/NamanSoni78/Links/issues)

</div>

---

## What is this?

[Linktree](https://linktr.ee), but yours. Claim a username, get a public page at
`links.namansoni.in/<you>`, add your links, and share one URL everywhere.

And then something Linktree doesn't do: **widgets** — little cards you design in
the browser (text, fonts, colors, images, links, motion) and embed anywhere with
a single line. GitHub profile READMEs, portfolios, docs, email signatures —
anywhere that renders an image.

<div align="center">

```
┌─────────────────────┐        ┌──────────────────────┐
│                     │        │                      │
│   your links page   │        │   your widget card   │
│                     │        │                      │
│   · GitHub          │        │   Naman Soni         │
│   · Blog            │  ──►   │   shipping small     │
│   · X / Twitter     │        │   internet things    │
│   · …               │        │   [ See my work ]    │
│                     │        │                      │
└─────────────────────┘        └──────────────────────┘
     /username                    /api/embed/<slug>
```

</div>

## Features

### The link page

- **Email + password accounts** with **OTP email verification** and forgot-password reset
- **Live username claiming** — instant availability checks, reserved-path protection (`/admin`, `/sitemap.xml`, …)
- **Page editor** — display name, bio, tags, links with **auto-fetched favicons**, drag-to-reorder, undo on delete, and a **live phone preview**
- **Public profiles** cached at the edge with per-profile SEO metadata, JSON-LD, and dynamic Open Graph images

### The widget studio

- **Design once, embed anywhere** — each widget gets a Markdown snippet, an HTML snippet, a raw SVG URL, and a shareable page
- **Full customization** — 8 font stacks, solid or gradient backgrounds, per-element colors, corner radius, borders, shadows, image with circle/rounded/square crop
- **Small animations** — fade, rise, pop, float, pulse (CSS only, `prefers-reduced-motion` friendly)
- **Starter presets** — Minimal, Neon, Terminal, Bold, Paper
- **Real editor UX** — debounced autosave, ⌘S flush, live preview, per-widget public links with uniqueness + reserved-word checks, duplicate, delete with confirmation
- **Graceful degradation** — delete a widget and its embeds everywhere quietly switch to an "unavailable" card, never a broken image

### The platform

- **Day / night mode**, fluid CSS-only animations
- **Admin panel** — user/widget/page counts, 14-day signup chart, recent accounts
- **Terms of Service & Privacy Policy** included
- **SEO** — sitemap, robots, web manifest, canonical URLs, OG/Twitter cards

## Built to cost ~$0

Every routing decision optimizes for **free-tier survival** (Vercel Hobby's
4 h/month of active CPU):

- Public pages & widget embeds are **CDN-cached** — visitors don't wake a function
- Widget SVGs cache for a day at the edge and bust on save via a `?v=` tag
- Auth, landing, legal pages are fully static
- Per-request code does nothing heavier than indexed SQLite reads + one native PBKDF2 hash

The whole stack is free:

| Layer     | Choice                                          |
| --------- | ----------------------------------------------- |
| Framework | Next.js 16 (App Router) · TypeScript · React 19 |
| Styling   | Tailwind CSS 4 · shadcn/ui · Geist              |
| Database  | [Turso](https://turso.tech) (libSQL)            |
| Email     | [Resend](https://resend.com)                    |
| Auth      | PBKDF2 + JWT sessions (httpOnly cookies)        |
| Hosting   | Vercel Hobby                                    |

## Quick start

```bash
git clone https://github.com/NamanSoni78/Links.git
cd Links
npm install
cp .env.example .env    # defaults to a local SQLite file
npm run db:init         # create the schema
npm run dev             # → http://localhost:3000
```

OTP codes print to the server console in dev — no email account needed to try
the full flow. To deploy for real (Turso + Resend + Vercel, ~15 minutes),
see **[setup.md](setup.md)**.

## Project layout

```
src/
├── app/            # pages: landing · auth · dashboard · widgets · /w/ · admin · legal
├── components/     # widget builder, page editor, public views, chrome
├── lib/            # db, auth, otp, mail, widget model + SVG generator
└── proxy.ts        # /admin basic-auth gate
scripts/
├── schema.sql      # single source of truth for the DB schema
├── init-db.mjs     # apply schema locally or to remote Turso
├── e2e.mjs         # end-to-end test suite
└── make-notebook.py # regenerates the Colab setup notebook
```

## Security

PBKDF2-SHA256 (100k iterations) passwords · hashed OTP codes with expiry,
attempt limits and resend cooldowns · login lockout · httpOnly JWT sessions
re-checked against the DB · strictly whitelisted + normalized widget content
(https-only URLs, length caps) so embeds can't smuggle markup anywhere.

## Author

**Naman Soni** — [GitHub](https://github.com/NamanSoni78) · [links.namansoni.in](https://links.namansoni.in)

Provided as-is, with no guarantees. See the in-app Terms of Service for the
human-language version. If you deploy your own instance, a star is appreciated 🌟
