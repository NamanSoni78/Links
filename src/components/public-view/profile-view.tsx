import { ArrowUpRight, Link2, Mail, Phone } from "lucide-react";
import { FaviconImg } from "@/components/favicon-img";
import { hostOf } from "@/lib/url";
import type { ContactKind, PublicContact, PublicLink, PublicProfile } from "@/lib/types";

/**
 * The shared visual for a public profile page.
 * Used by /[username] (server-rendered) and the dashboard live
 * preview (client-rendered) so they always stay in sync.
 */

const AVATAR_COLORS = ["#C2410C", "#0F766E", "#BE123C", "#B45309", "#4D7C0F"] as const;

function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initialsOf(name: string, slug?: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  if (slug) return slug.slice(0, 2).toUpperCase();
  return "L";
}

export function LinkCard({
  link,
  index,
  preview,
}: {
  link: PublicLink;
  index: number;
  preview?: boolean;
}) {
  const className =
    "group flex w-full items-center gap-3.5 rounded-xl border border-border bg-card px-4 py-3.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md active:translate-y-0 animate-fade-up";

  const style = { ["--stagger" as string]: index + 5 } as React.CSSProperties;

  const inner = (
    <>
      <span className="flex size-[22px] shrink-0 items-center justify-center">
        {link.favicon ? (
           
          <img
            src={link.favicon}
            alt=""
            width={22}
            height={22}
            loading="lazy"
            draggable={false}
            className="size-[22px] rounded-[5px] object-contain"
          />
        ) : (
          <FaviconImg url={link.url} size={22} />
        )}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[14px] font-medium text-foreground">
          {link.title}
        </span>
        <span className="block truncate font-mono text-[11px] leading-4 text-muted-foreground">
          {hostOf(link.url)}
        </span>
        {link.desc && (
          <span className="mt-0.5 block truncate text-[10.5px] leading-4 text-muted-foreground/80">
            {link.desc}
          </span>
        )}
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" />
    </>
  );

  if (preview) {
    return (
      <div className={className} style={style}>
        {inner}
      </div>
    );
  }

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={className}
      style={style}
    >
      {inner}
    </a>
  );
}

const CONTACT_GLYPH: Record<ContactKind, typeof Mail> = {
  email: Mail,
  phone: Phone,
  link: Link2,
};

export function ContactCard({
  contact,
  index,
  preview,
}: {
  contact: PublicContact;
  index: number;
  preview?: boolean;
}) {
  const Glyph = CONTACT_GLYPH[contact.kind] ?? Link2;
  const className =
    "group flex w-full items-center gap-3 rounded-xl border border-border/80 bg-card/70 px-4 py-3 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-sm active:translate-y-0 animate-fade-up";
  const style = { ["--stagger" as string]: index + 7 } as React.CSSProperties;

  const inner = (
    <>
      <span className="flex size-[20px] shrink-0 items-center justify-center">
        {contact.icon ? (
           
          <img
            src={contact.icon}
            alt=""
            width={20}
            height={20}
            loading="lazy"
            draggable={false}
            className="size-[20px] rounded-[5px] object-contain"
          />
        ) : (
          <Glyph className="size-4 text-muted-foreground" aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[13px] font-medium text-foreground/90">
          {contact.label}
        </span>
        <span className="block truncate font-mono text-[11px] leading-4 text-muted-foreground">
          {contact.value}
        </span>
      </span>
    </>
  );

  if (preview || !contact.href) {
    return (
      <div className={className} style={style}>
        {inner}
      </div>
    );
  }

  return (
    <a href={contact.href} className={className} style={style}>
      {inner}
    </a>
  );
}

export function ProfileView({
  profile,
  preview = false,
}: {
  profile: PublicProfile;
  preview?: boolean;
}) {
  const color = avatarColor(profile.slug || "links");

  return (
    <div className="flex flex-col items-center px-4 pb-10 pt-8 text-center sm:pt-10">
      <div
        className="animate-fade-up relative size-20 shrink-0 shadow-sm"
        aria-hidden={profile.avatar ? undefined : true}
      >
        {profile.avatar ? (
           
          <img
            src={profile.avatar}
            alt={profile.displayName || "Profile photo"}
            width={80}
            height={80}
            loading="lazy"
            className="size-20 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex size-20 items-center justify-center rounded-full text-[26px] font-semibold tracking-tight text-white"
            style={{ backgroundColor: color }}
          >
            {initialsOf(profile.displayName, profile.slug ?? undefined)}
          </div>
        )}
      </div>

      <h1 className="animate-fade-up mt-5 max-w-full truncate px-2 text-[22px] font-semibold tracking-tight text-foreground [--stagger:1]">
        {profile.displayName || "Untitled"}
      </h1>

      {profile.slug && (
        <p className="animate-fade-up mt-1 font-mono text-[12px] text-muted-foreground [--stagger:2]">
          @{profile.slug}
        </p>
      )}

      {profile.description && (
        <p className="animate-fade-up mt-3 max-w-[340px] text-balance text-[14px] leading-relaxed text-muted-foreground [--stagger:3]">
          {profile.description}
        </p>
      )}

      {profile.tags.length > 0 && (
        <div className="animate-fade-up mt-4 flex max-w-full flex-wrap justify-center gap-1.5 px-2 [--stagger:4]">
          {profile.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-border bg-card px-2.5 py-[5px] font-mono text-[11px] text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-7 w-full max-w-[380px] space-y-3">
        {profile.links.map((l, i) => (
          <LinkCard key={l.id} link={l} index={i} preview={preview} />
        ))}
        {profile.links.length === 0 && (
          <p className="animate-fade-up pt-2 text-[13px] text-muted-foreground/60 [--stagger:5]">
            {preview ? "Links you add will show up here." : "Nothing shared here yet."}
          </p>
        )}
      </div>

      {profile.contacts.length > 0 && (
        <div className="mt-6 w-full max-w-[380px]">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
            Get in touch
          </p>
          <div className="space-y-2.5">
            {profile.contacts.map((c, i) => (
              <ContactCard key={c.id} contact={c} index={i} preview={preview} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
