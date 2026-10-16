/**
 * Links — initialize the database schema.
 *
 * Works against local SQLite (default: file:db/local.db) or a remote
 * Turso database (set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN).
 *
 *   bun scripts/init-db.mjs
 */
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const url = process.env.TURSO_DATABASE_URL || "file:db/local.db";
const schemaPath = path.join(here, "schema.sql");

const raw = readFileSync(schemaPath, "utf8");
// Strip comment-only lines, then split into statements.
const statements = raw
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

const db = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

console.log(`Target: ${url.startsWith("file:") ? url : url.replace(/^libsql:/, "https:")}`);

try {
  for (const stmt of statements) {
    await db.execute(stmt);
  }

  // ── upgrade older databases: add columns that arrived after v1 ──
  // Every ALTER carries a DEFAULT so SQLite allows it on populated tables.
  const existingTables = new Set(
    (
      await db.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
      )
    ).rows.map((r) => r.name)
  );
  // Plain SELECT first (works over any SQLite-over-HTTP layer);
  // PRAGMA statement as fallback.
  async function columnsOf(table) {
    try {
      const r = await db.execute(`SELECT name FROM pragma_table_info('${table}')`);
      return r.rows.map((row) => row.name);
    } catch {
      const r = await db.execute(`PRAGMA table_info(${table})`);
      return r.rows.map((row) => row.name);
    }
  }
  const ensureColumns = [
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
  for (const [table, column, ddl] of ensureColumns) {
    if (!existingTables.has(table)) continue; // shouldn't happen — CREATEs ran above
    if (!(await columnsOf(table)).includes(column)) {
      await db.execute(ddl);
      console.log(`  + ${table}.${column} added`);
    }
  }

  const tables = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  console.log("✓ Schema applied. Tables:", tables.rows.map((r) => r.name).join(", "));

  // Prove the columns that matter are really there (belt and braces).
  for (const t of ["profiles", "links"]) {
    console.log(`  ${t} columns: ${(await columnsOf(t)).join(", ")}`);
  }
} catch (err) {
  console.error("✗ Schema failed:", err.message);
  process.exit(1);
}
