/**
 * Links — contact normalization (pure, shared client + server).
 *
 * A contact is an email address, a phone number, or a plain link.
 * The `href` visitors click is derived from the kind so users can
 * never inject javascript: or other schemes.
 */
import { normalizeUrlInput } from "./url";
import type { ContactKind } from "./types";

export const CONTACT_KINDS: readonly ContactKind[] = ["email", "phone", "link"];

export const CONTACT_KIND_META: Record<ContactKind, { label: string; valueHint: string }> = {
  email: { label: "Email", valueHint: "you@example.com" },
  phone: { label: "Phone", valueHint: "+91 98765 43210" },
  link: { label: "Link", valueHint: "https://t.me/yourhandle" },
};

export interface ContactInput {
  id?: string;
  kind: string;
  label: string;
  value: string;
  icon?: string;
}

export type ContactResult =
  | { ok: true; contact: { id: string; kind: ContactKind; label: string; value: string; href: string; icon: string } }
  | { ok: false; error: string };

const PHONE_RE = /^[+()\d][\d\s()-]{2,24}$/;

/** Coerces one contact row; returns null when it has no usable value. */
export function normalizeContact(input: ContactInput): ContactResult | null {
  const kind = (CONTACT_KINDS as readonly string[]).includes(input.kind)
    ? (input.kind as ContactKind)
    : "link";
  const rawValue = (input.value || "").trim();
  if (!rawValue) return null;

  const label =
    (input.label || "").trim().slice(0, 30) || CONTACT_KIND_META[kind].label;

  let href = "";
  let value = "";
  if (kind === "email") {
    const email = rawValue.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return { ok: false, error: `“${rawValue}” doesn't look like an email address.` };
    }
    value = email.slice(0, 120);
    href = `mailto:${value}`;
  } else if (kind === "phone") {
    if (!PHONE_RE.test(rawValue)) {
      return { ok: false, error: `“${rawValue}” doesn't look like a phone number.` };
    }
    value = rawValue.slice(0, 120);
    href = `tel:${rawValue.replace(/[^\d+]/g, "")}`;
  } else {
    const url = normalizeUrlInput(rawValue);
    if (!url) return { ok: false, error: `“${rawValue}” isn't a valid https link.` };
    value = url.slice(0, 120);
    href = value;
  }

  return {
    ok: true,
    contact: {
      id: (input.id || "").slice(0, 40) || "",
      kind,
      label,
      value,
      href,
      icon: input.icon ?? "",
    },
  };
}
