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
  created_at: number;
  updated_at: number;
}

export interface LinkRow {
  id: string;
  user_id: string;
  url: string;
  title: string;
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
}

export interface PublicProfile {
  slug: string;
  displayName: string;
  description: string;
  tags: string[];
  links: PublicLink[];
}

export interface PageState {
  /** null while the user hasn't claimed a username yet */
  slug: string | null;
  displayName: string;
  description: string;
  tags: string[];
  links: PublicLink[];
}
