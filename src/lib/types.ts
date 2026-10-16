/** Row shapes (snake_case, as stored in SQLite) and app-facing types. */

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  email_verified: number;
  failed_attempts: number;
  locked_until: number | null;
  created_at: number;
  updated_at: number;
}

export interface ProfileRow {
  user_id: string;
  slug: string | null;
  display_name: string;
  description: string;
  tags: string;
  avatar: string;
  created_at: number;
  updated_at: number;
}

export interface LinkRow {
  id: string;
  user_id: string;
  url: string;
  title: string;
  description: string;
  favicon: string;
  position: number;
  created_at: number;
  updated_at: number;
}

export interface ContactRow {
  id: string;
  user_id: string;
  kind: string;
  label: string;
  value: string;
  href: string;
  icon: string;
  position: number;
  created_at: number;
  updated_at: number;
}

export interface OtpRow {
  id: string;
  email: string;
  code_hash: string;
  purpose: string;
  attempts: number;
  expires_at: number;
  created_at: number;
}

/* ── App-facing types ─────────────────────────────────────── */

export type OtpPurpose = "signup" | "reset";

export interface SessionUser {
  id: string;
  email: string;
}

export interface PublicLink {
  id: string;
  url: string;
  title: string;
  /** optional ≤50-char mini description shown under the host */
  desc: string;
  /** optional custom favicon (data URL) — "" = fetched favicon */
  favicon: string;
}

export type ContactKind = "email" | "phone" | "link";

export interface PublicContact {
  id: string;
  kind: ContactKind;
  label: string;
  value: string;
  /** mailto:/tel:/https — resolved from kind + value */
  href: string;
  /** custom icon (data URL) — "" = built-in glyph */
  icon: string;
}

export interface PublicProfile {
  slug: string;
  displayName: string;
  description: string;
  tags: string[];
  /** circular profile photo (data URL) — "" = initials */
  avatar: string;
  links: PublicLink[];
  contacts: PublicContact[];
}

export interface PageState {
  /** null while the user hasn't claimed a username yet */
  slug: string | null;
  displayName: string;
  description: string;
  tags: string[];
  avatar: string;
  links: PublicLink[];
  contacts: PublicContact[];
}
