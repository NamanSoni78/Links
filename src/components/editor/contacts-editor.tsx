"use client";

/**
 * Links — the optional contact box.
 *
 * Visitors see it under the links on the public page: emails, phone
 * numbers, plain links — each with an optional custom icon. Empty by
 * default; the section simply doesn't render when there's nothing in
 * it. Rows are validated live (the same normalizeContact the server
 * uses) so nothing embarrassing slips through.
 */
import { useState } from "react";
import { ChevronDown, ChevronUp, Link2, Mail, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { IconUploadButton } from "@/components/editor/icon-upload-button";
import { CONTACT_KINDS, CONTACT_KIND_META, normalizeContact } from "@/lib/contacts";
import { LIMITS } from "@/lib/limits";
import type { ContactKind } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface EditorContact {
  key: string;
  id: string;
  kind: ContactKind;
  label: string;
  value: string;
  icon: string;
}

const KIND_ICON = { email: Mail, phone: Phone, link: Link2 } as const;

function contactError(c: EditorContact): string {
  if (!c.value.trim()) return "";
  const verdict = normalizeContact(c);
  if (verdict && !verdict.ok) return verdict.error;
  return "";
}

export function ContactsEditor({
  contacts,
  onChange,
}: {
  contacts: EditorContact[];
  onChange: (contacts: EditorContact[]) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const add = () => {
    if (contacts.length >= LIMITS.contactsMax) {
      toast.error(`Up to ${LIMITS.contactsMax} contacts — tidy pages win.`);
      return;
    }
    onChange([
      ...contacts,
      {
        key: `c${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        id: "",
        kind: "email",
        label: "",
        value: "",
        icon: "",
      },
    ]);
  };

  const update = (key: string, patch: Partial<EditorContact>) =>
    onChange(contacts.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const remove = (index: number) => {
    const removed = contacts[index];
    const next = contacts.filter((_, i) => i !== index);
    onChange(next);
    toast("Contact removed", {
      action: {
        label: "Undo",
        onClick: () => onChange(next.slice(0, index).concat(removed, next.slice(index))),
      },
      duration: 6000,
    });
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= contacts.length) return;
    const next = [...contacts];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div>
      <div className="space-y-2.5">
        {contacts.map((c, i) => {
          const err = contactError(c);
          return (
            <div
              key={c.key}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverIndex(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null && dragIndex !== i) move(dragIndex, i);
                setDragIndex(null);
                setDragOverIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setDragOverIndex(null);
              }}
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 transition-all sm:flex-nowrap sm:gap-2.5",
                dragOverIndex === i && dragIndex !== null
                  ? "border-brand/70 ring-[3px] ring-ring/15"
                  : "border-border",
                err ? "border-destructive/50" : ""
              )}
            >
              {/* drag handle + arrows */}
              <ChevronUp
                aria-label={`Move contact ${i + 1} up`}
                role="button"
                tabIndex={0}
                onClick={() => move(i, i - 1)}
                className={cn("size-3.5 shrink-0 text-muted-foreground/60 transition-colors hover:text-foreground", i === 0 && "invisible")}
              />
              <ChevronDown
                aria-label={`Move contact ${i + 1} down`}
                role="button"
                tabIndex={0}
                onClick={() => move(i, i + 1)}
                className={cn("mr-1 size-3.5 shrink-0 text-muted-foreground/60 transition-colors hover:text-foreground", i === contacts.length - 1 && "invisible")}
              />

              {/* icon */}
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
                <IconUploadButton
                  icon={c.icon}
                  onChange={(v) => update(c.key, { icon: v })}
                  ariaLabel={`Custom icon for contact ${i + 1}`}
                  fallback={(() => {
                    const Glyph = KIND_ICON[c.kind] ?? Link2;
                    return <Glyph className="size-4 text-muted-foreground" />;
                  })()}
                />
              </div>

              {/* kind */}
              <div className="flex shrink-0 rounded-lg border border-border bg-muted/40 p-0.5">
                {CONTACT_KINDS.map((k) => {
                  const Glyph = KIND_ICON[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => update(c.key, { kind: k })}
                      aria-label={`${CONTACT_KIND_META[k].label} contact`}
                      aria-pressed={c.kind === k}
                      title={CONTACT_KIND_META[k].label}
                      className={cn(
                        "flex size-6 items-center justify-center rounded-[6px] transition-colors",
                        c.kind === k ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Glyph className="size-3.5" />
                    </button>
                  );
                })}
              </div>

              {/* label + value */}
              <input
                value={c.label}
                onChange={(e) => update(c.key, { label: e.target.value.slice(0, 30) })}
                placeholder={CONTACT_KIND_META[c.kind].label}
                aria-label={`Contact ${i + 1} label`}
                className="h-9 w-24 min-w-0 shrink-0 rounded-lg border border-border bg-background px-3 text-[13px] outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-[3px] focus:ring-ring/20 sm:w-28"
              />
              <div className="order-last min-w-0 basis-full sm:order-none sm:basis-auto sm:flex-1">
                <input
                  value={c.value}
                  onChange={(e) => update(c.key, { value: e.target.value.slice(0, 120) })}
                  placeholder={CONTACT_KIND_META[c.kind].valueHint}
                  inputMode={c.kind === "email" ? "email" : c.kind === "phone" ? "tel" : "url"}
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-label={`Contact ${i + 1} value`}
                  aria-invalid={!!err || undefined}
                  className={cn(
                    "h-9 w-full rounded-lg border bg-background px-3 text-[13px] outline-none transition-colors placeholder:text-muted-foreground/50 focus:ring-[3px] focus:ring-ring/20",
                    c.kind === "link" && "font-mono text-[12.5px]",
                    err ? "border-destructive/60 focus:border-destructive" : "border-border focus:border-ring"
                  )}
                />
                {err && (
                  <p className="mt-1 text-[11.5px] text-destructive" role="alert">
                    {err}
                  </p>
                )}
              </div>

              {/* delete */}
              <button
                type="button"
                aria-label={`Remove contact ${i + 1}`}
                onClick={() => remove(i)}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={add}
        disabled={contacts.length >= LIMITS.contactsMax}
        className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 text-[13.5px] font-medium text-muted-foreground transition-all hover:border-ring/50 hover:bg-muted/60 hover:text-foreground active:scale-[0.99] disabled:opacity-50"
      >
        <Plus className="size-4" />
        Add a contact
        <span className="font-mono text-[11px] text-muted-foreground/60">
          {contacts.length}/{LIMITS.contactsMax}
        </span>
      </button>

      {contacts.length === 0 && (
        <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground/70">
          Optional — an email, a phone number or any link people can reach you at.
          Leave it empty and this whole section stays off your page.
        </p>
      )}
    </div>
  );
}
