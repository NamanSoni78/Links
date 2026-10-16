/**
 * Links — the widget-AI contract (pure, shared client + server).
 *
 * One JSON format powers three flows:
 *   1. "Our AI" — the admin-configured agent gets the same system
 *      prompt and answers in-chat, ending with the JSON block.
 *   2. "Any AI" — users copy the interview prompt to ChatGPT/Claude/
 *      Gemini and paste the answer back; /llms.txt documents the same
 *      contract for AI assistants that read the site.
 *   3. Import — both flows land in parseWidgetImport(), which feeds
 *      normalizeWidgetData() so nothing invalid ever reaches the DB.
 */
import type { WidgetProfileContext } from "./widgets";

export const WIDGET_SCHEMA_DOC = `{
  "name": "short widget name (max 60 chars)",
  "data": {
    "content": {
      "imageUrl": "",                    // optional https:// image URL
      "imageShape": "circle|rounded|square",
      "title": "up to 80 chars",
      "message": "up to 200 chars",
      "linkLabel": "button text (optional, max 40)",
      "linkUrl": "https://… (optional)"
    },
    "style": {
      "bgMode": "solid|gradient",
      "bgColor": "#rrggbb",
      "bgColor2": "#rrggbb",             // gradient end
      "gradientAngle": 135,              // 0-360
      "textColor": "#rrggbb",
      "accentColor": "#rrggbb",          // button background
      "borderColor": "#rrggbb",
      "borderWidth": 0,                  // 0-3
      "radius": 16,                      // 0-24
      "shadow": true
    },
    "typography": {
      "font": "sans|serif|mono|trebuchet|verdana|times|impact|comic",
      "titleSize": 26,                   // 16-40
      "messageSize": 14,                 // 11-18
      "bold": true,                      // bold title
      "uppercase": false,                // uppercase title
      "align": "left|center"
    },
    "animation": "none|fade|rise|pop|float|pulse",
    "blocks": {                          // optional sections under the title, all optional
      "order": ["text","sites","contacts"],  // enabled blocks in display order
      "texts": [                          // up to 5 animated text lines
        {
          "text": "up to 120 chars",
          "size": 15,                     // 11-22
          "bold": false,
          "animation": "none|fade|rise|pop|float|pulse|typing",
          "delayMs": 400,                 // 0-4000, start delay
          "speedMs": 70,                  // typing speed per char, 40-140
          "loop": true                    // retype forever
        }
      ],
      "sites":    { "showFavicon": true, "showDesc": true, "limit": 0 },  // 0 = all of the user's links
      "contacts": { "showIcon": true, "limit": 0 }                        // 0 = all of the user's contacts
    }
  }
}`;

function profileSummary(ctx: WidgetProfileContext): string {
  const sites = ctx.sites
    .slice(0, 15)
    .map((s) => `- ${s.title} (${s.url})${s.desc ? ` — ${s.desc}` : ""}`)
    .join("\n");
  const contacts = ctx.contacts
    .slice(0, 10)
    .map((c) => `- ${c.label}: ${c.value} (${c.kind})`)
    .join("\n");
  return [
    ctx.displayName && `Display name: ${ctx.displayName}`,
    ctx.bio && `Bio: ${ctx.bio}`,
    sites && `Their sites/links:\n${sites}`,
    contacts && `Their contacts:\n${contacts}`,
    !sites && !contacts && "They haven't added links or contacts yet.",
  ]
    .filter(Boolean)
    .join("\n");
}

function interviewRules(baseUrl: string): string {
  return `HOW TO WORK:
1. Ask 2-4 short questions about what the widget is for (style, tone, what to highlight). Use the person's real info above when it helps. If they already described everything, skip to step 2.
2. Design the widget and output ONLY a single fenced json code block in exactly this shape:
${WIDGET_SCHEMA_DOC}
3. JSON rules: colors are #rrggbb hex, keep text within the stated limits, pick tasteful color combos with strong contrast, and only include blocks that fit the purpose ("sites" lists their real links, "contacts" lists their real contacts — reference them by the info above, the site fills in the live data).
4. After the json block, add one short line telling the user they can paste this into ${baseUrl}/widgets (choose "New", then "With AI", then the Paste tab) or hand it back to the Links agent.`;
}

/** The prompt users copy into ANY external AI. */
export function buildExternalPrompt(ctx: WidgetProfileContext, baseUrl: string): string {
  return `You are a widget design assistant for Links (${baseUrl}) — a free "one link for everything" site where people build small embeddable cards for their GitHub READMEs, portfolios and docs.

The person you're helping (their real Links page data):
${profileSummary(ctx)}

${interviewRules(baseUrl)}`;
}

/** System prompt for the built-in agent (same contract, chattier). */
export function buildAgentSystemPrompt(ctx: WidgetProfileContext, baseUrl: string): string {
  return `You are the widget design agent for Links (${baseUrl}), a free link-in-bio site. You help signed-in users design small embeddable cards (text, their sites, their contacts, colors, fonts, animations) through friendly conversation.

The user's live Links page data:
${profileSummary(ctx)}

${interviewRules(baseUrl)}

Between questions, stay warm and concise (1-3 sentences). When the design is settled, emit the json block — it becomes a live preview + "Create widget" button in their chat, so it must be your complete final answer. Never invent URLs for the user; use their real links above or leave fields empty.`;
}

export interface WidgetImportResult {
  name?: string;
  data: unknown;
}

/**
 * Extracts the widget JSON from an AI reply — tolerates surrounding
 * chatter, markdown fences, and missing fences. Returns null when no
 * plausible object is found.
 */
export function parseWidgetImport(text: string): WidgetImportResult | null {
  const candidates: string[] = [];

  // fenced blocks, last one wins (the "final answer")
  const fences = [...text.matchAll(/```(?:json|widget)?\s*([\s\S]*?)```/gi)];
  for (const m of fences.reverse()) candidates.push(m[1]);

  // bare { … } object
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) candidates.push(text.slice(first, last + 1));

  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c.trim());
      if (parsed && typeof parsed === "object") {
        if (parsed.data && typeof parsed.data === "object") {
          return {
            name: typeof parsed.name === "string" ? parsed.name : undefined,
            data: parsed.data,
          };
        }
        // the object itself might be the widget data
        if (parsed.content || parsed.style || parsed.typography || parsed.blocks) {
          return { data: parsed };
        }
      }
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}
