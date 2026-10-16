/**
 * Client-safe username validation (no DB access).
 * Mirrors the rules in src/lib/slug.ts, which is server-only
 * because it ships the full reserved-words list.
 */

const RESERVED_CLIENT = new Set([
  "admin", "api", "login", "logout", "signup", "signin", "register",
  "dashboard", "settings", "account", "profile", "me", "links", "link",
  "terms", "privacy", "tos", "about", "help", "support", "blog", "docs",
  "status", "health", "root", "owner", "staff", "user", "users",
  "welcome", "hello", "new", "edit", "verify", "verification", "auth",
  "oauth", "app", "mail", "email", "sitemap", "robots", "manifest",
  "favicon", "icon", "static", "public", "assets", "test", "dev",
  "prod", "production", "staging", "www", "http", "https", "ftp",
]);

export function validateSlugClient(raw: string): { valid: true } | { valid: false; message: string } {
  const slug = raw.trim().toLowerCase();
  if (slug.length < 3) return { valid: false, message: "Usernames need at least 3 characters." };
  if (slug.length > 30)
    return { valid: false, message: "Usernames can be at most 30 characters." };
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug))
    return {
      valid: false,
      message: "Use lowercase letters, numbers and hyphens — no spaces or symbols.",
    };
  if (RESERVED_CLIENT.has(slug))
    return { valid: false, message: "That username is reserved. Try another." };
  return { valid: true };
}
