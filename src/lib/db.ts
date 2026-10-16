/**
 * Links — Turso (libSQL) database client with tiny typed helpers.
 *
 * Works with:
 *  - Turso remote:  TURSO_DATABASE_URL=libsql://…  + TURSO_AUTH_TOKEN
 *  - Local SQLite:  TURSO_DATABASE_URL=file:db/local.db
 */
import { createClient, type Client, type InValue } from "@libsql/client";

const globalForDb = globalThis as unknown as { __linksDb?: Client };

function createDb(): Client {
  return createClient({
    url: process.env.TURSO_DATABASE_URL || "file:db/local.db",
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });
}

export const db = globalForDb.__linksDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__linksDb = db;

/** Run a query, return all rows. */
export async function all<T = Record<string, unknown>>(
  sql: string,
  args: InValue[] = []
): Promise<T[]> {
  const res = await db.execute({ sql, args });
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
  const res = await db.execute({ sql, args });
  return res.rowsAffected;
}

/** Run multiple statements atomically (single transaction). */
export async function atomic(
  statements: { sql: string; args?: InValue[] }[]
): Promise<void> {
  await db.batch(
    statements.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
    "write"
  );
}
