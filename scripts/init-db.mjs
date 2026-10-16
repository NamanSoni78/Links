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
  const ensureColumns = [
    ["profiles", "avatar", "ALTER TABLE profiles ADD COLUMN avatar TEXT NOT NULL DEFAULT ''"],
    ["links", "description", "ALTER TABLE links ADD COLUMN description TEXT NOT NULL DEFAULT ''"],
    ["links", "favicon", "ALTER TABLE links ADD COLUMN favicon TEXT NOT NULL DEFAULT ''"],
  ];
  for (const [table, column, ddl] of ensureColumns) {
    const cols = await db.execute(`PRAGMA table_info(${table})`);
    if (!cols.rows.some((r) => r.name === column)) {
      await db.execute(ddl);
      console.log(`  + ${table}.${column} added`);
    }
  }

  const tables = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  console.log("✓ Schema applied. Tables:", tables.rows.map((r) => r.name).join(", "));
} catch (err) {
  console.error("✗ Schema failed:", err.message);
  process.exit(1);
}
