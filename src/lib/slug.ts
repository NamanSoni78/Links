/**
 * Links — username slug rules & validation.
 * Slugs: 3–30 chars, lowercase letters / digits / hyphens,
 * must not start or end with a hyphen, and must dodge reserved
 * routes (/admin, /sitemap.xml, …) and anything that could collide
 * with app paths or well-known files.
 */

export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  // app routes
  "admin", "administrator", "api", "apis", "app", "apps", "auth", "oauth",
  "login", "logout", "signin", "signup", "register", "verify", "verification",
  "otp", "dashboard", "settings", "account", "profile", "profiles", "me", "my",
  "links", "link", "page", "pages", "new", "edit", "create", "update", "delete",
  "deleted", "trash", "terms", "privacy", "policy", "tos", "legal", "law",
  "about", "contact", "help", "support", "docs", "doc", "blog", "news",
  "status", "health", "healthcheck", "ping", "root", "owner", "staff", "mod",
  "moderator", "manage", "management", "user", "users", "username", "handle",
  // commerce-ish / reserved words worth keeping clean
  "payment", "payments", "billing", "invoice", "invoices", "pricing", "plans",
  "upgrade", "shop", "store", "cart", "checkout", "buy", "sell", "donate",
  "donations", "sponsor", "sponsors", "partners", "affiliate", "affiliates",
  "careers", "jobs", "press", "media", "community", "forum", "chat", "dm",
  "dms", "message", "messages", "mail", "email", "emails", "notification",
  "notifications", "callback", "callbacks", "redirect", "goto", "out",
  "external", "embed", "widget", "graphql", "ws", "socket",
  // well-known files & crawler endpoints
  "favicon", "favicon.ico", "sitemap", "sitemap.xml", "robots", "robots.txt",
  "manifest", "manifest.json", "manifest.webmanifest", "ads", "ads.txt",
  "apple-touch-icon", "opengraph", "og", "twitter", "google", "googlebot",
  "bing", "baidu", "yahoo", "duckduckgo", "dnt", "well-known", "humans.txt",
  "security.txt", "rss", "atom", "atom.xml", "feed", "feeds",
  // infrastructure-ish words
  "files", "file", "download", "downloads", "upload", "uploads", "images",
  "image", "img", "icons", "icon", "fonts", "font", "css", "js", "assets",
  "static", "public", "private", "internal", "secret", "secrets", "secure",
  "security", "config", "configuration", "env", "environment", "vercel",
  "turso", "resend", "next", "nextjs", "http", "https", "www", "ftp",
  "localhost", "home", "index", "main", "system", "default", "undefined",
  "null", "none", "true", "false", "unknown", "anonymous", "guest",
  "error", "errors", "404", "401", "403", "500", "welcome", "hello",
  "start", "get-started", "quickstart", "onboarding", "guide", "guides",
  "faq", "faqs", "intro", "feed", "console", "log", "logs", "debug",
  "test", "tests", "testing", "dev", "development", "staging", "prod",
  "production",
]);

export type SlugCheck =
  | { valid: true; slug: string }
  | { valid: false; reason: "format" | "length" | "reserved"; message: string };

export function validateSlug(raw: string): SlugCheck {
  const slug = raw.toLowerCase().trim();

  if (slug.length < 3) {
    return { valid: false, reason: "length", message: "Usernames need at least 3 characters." };
  }
  if (slug.length > 30) {
    return { valid: false, reason: "length", message: "Usernames can be at most 30 characters." };
  }
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    return {
      valid: false,
      reason: "format",
      message: "Use lowercase letters, numbers and single hyphens — no spaces or symbols.",
    };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { valid: false, reason: "reserved", message: "That username is reserved. Try another." };
  }
  return { valid: true, slug };
}
