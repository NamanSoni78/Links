/**
 * Links — Turso (libSQL) database client with tiny typed helpers.
 *
 * Works with:
 *  - Turso remote:  TURSO_DATABASE_URL=libsql://…  + TURSO_AUTH_TOKEN
 *  - Local SQLite:  TURSO_DATABASE_URL=file:db/local.db
 */
import { createClient, type Client, type InValue } from "@libsql/client";

const globalForDb = globalThis as unknown as { __linksDb?: Client };

let cached: Client | null = null;

/** Columns that shipped after the first schema release. Every entry carries
 * a DEFAULT so SQLite allows the ALTER even on a populated table. The setup
 * notebook / scripts/init-db.mjs are the full migrators (they also create
 * missing tables); this list only patches columns on tables that already
 * exist, so a database that skipped a migration self-heals on first request
 * instead of 500-ing with "no such column". */
const COLUMN_FIXES: ReadonlyArray<readonly [table: string, column: string, ddl: string]> = [
  ["users", "email_verified", "ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0"],
  ["users", "failed_attempts", "ALTER TABLE users ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0"],
  ["profiles", "description", "ALTER TABLE profiles ADD COLUMN description TEXT NOT NULL DEFAULT ''"],
  ["profiles", "tags", "ALTER TABLE profiles ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'"],
  ["profiles", "avatar", "ALTER TABLE profiles ADD COLUMN avatar TEXT NOT NULL DEFAULT ''"],
  ["links", "description", "ALTER TABLE links ADD COLUMN description TEXT NOT NULL DEFAULT ''"],
  ["links", "favicon", "ALTER TABLE links ADD COLUMN favicon TEXT NOT NULL DEFAULT ''"],
  ["links", "position", "ALTER TABLE links ADD COLUMN position INTEGER NOT NULL DEFAULT 0"],
  ["otp_codes", "attempts", "ALTER TABLE otp_codes ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0"],
  ["contacts", "kind", "ALTER TABLE contacts ADD COLUMN kind TEXT NOT NULL DEFAULT 'link'"],
  ["contacts", "label", "ALTER TABLE contacts ADD COLUMN label TEXT NOT NULL DEFAULT ''"],
  ["contacts", "href", "ALTER TABLE contacts ADD COLUMN href TEXT NOT NULL DEFAULT ''"],
  ["contacts", "icon", "ALTER TABLE contacts ADD COLUMN icon TEXT NOT NULL DEFAULT ''"],
  ["contacts", "position", "ALTER TABLE contacts ADD COLUMN position INTEGER NOT NULL DEFAULT 0"],
  ["widgets", "data", "ALTER TABLE widgets ADD COLUMN data TEXT NOT NULL DEFAULT '{}'"],
];

/** Lazy client — created on first query, not at import. This keeps
 *  `next build`'s page-data collection working when the database isn't
 *  reachable yet (fresh deploys, missing local file): the error surfaces
 *  per-query where callers can catch it, instead of crashing the module. */
function client(): Client {
  if (cached) return cached;
  cached =
    globalForDb.__linksDb ??
    createClient({
      url: process.env.TURSO_DATABASE_URL || "file:db/local.db",
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    });
  if (process.env.NODE_ENV !== "production") globalForDb.__linksDb = cached;
  return cached;
}

let schemaHealed: Promise<void> | null = null;

/** Best-effort, once-per-process column self-heal (see COLUMN_FIXES).
 * Never throws: if healing can't run, the original query proceeds and
 * surfaces whatever error is actually there, where callers handle it. */
async function ensureSchema(): Promise<void> {
  if (!schemaHealed) {
    schemaHealed = (async () => {
      try {
        const db = client();
        const tables = new Set(
          (
            await db.execute("SELECT name FROM sqlite_master WHERE type='table'")
          ).rows.map((r) => String(r.name))
        );
        const have = new Map<string, Set<string>>();
        for (const t of new Set(COLUMN_FIXES.map(([t]) => t))) {
          if (!tables.has(t)) continue; // missing table → notebook / init-db's job
          // A plain SELECT (not a PRAGMA statement) — this is the statement
          // class every SQLite-over-HTTP layer definitely supports. PRAGMA
          // table_info is kept as a fallback for exotic local setups.
          let names: string[];
          try {
            const tvf = await db.execute(
              `SELECT name FROM pragma_table_info('${t}')`
            );
            names = tvf.rows.map((r) => String(r.name));
          } catch {
            const pragma = await db.execute(`PRAGMA table_info(${t})`);
            names = pragma.rows.map((r) => String(r.name));
          }
          have.set(t, new Set(names));
        }
        for (const [table, column, ddl] of COLUMN_FIXES) {
          if (have.get(table)?.has(column)) continue;
          try {
            await db.execute(ddl);
            console.log(`[db] schema self-heal: added ${table}.${column}`);
          } catch (e) {
            // lost a race for this ALTER, or the whole table is missing
            // (creating tables is the notebook's job) — skip, keep healing
            const msg = e instanceof Error ? e.message : String(e);
            if (!/duplicate column name|no such table/i.test(msg)) throw e;
          }
        }
      } catch (e) {
        console.warn(
          "[db] schema self-heal skipped:",
          e instanceof Error ? e.message : e
        );
      }
    })();
  }
  return schemaHealed;
}

/** Run a query, return all rows. */
export async function all<T = Record<string, unknown>>(
  sql: string,
  args: InValue[] = []
): Promise<T[]> {
  await ensureSchema();
  const res = await client().execute({ sql, args });
  return res.rows as unknown as T[];
}

/** Run a query, return the first row or null. */
export async function get<T = Record<string, unknown>>(
  sql: string,
  args: InValue[] = []
): Promise<T | null> {
  const rows = await all<T>(sql, args);
  return rows[0] ?? null;
}

/** Run a statement, return affected row count. */
export async function run(sql: string, args: InValue[] = []): Promise<number> {
  await ensureSchema();
  const res = await client().execute({ sql, args });
  return res.rowsAffected;
}

/** Run multiple statements atomically (single transaction). */
export async function atomic(
  statements: { sql: string; args?: InValue[] }[]
): Promise<void> {
  await ensureSchema();
  await client().batch(
    statements.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
    "write"
  );
}
