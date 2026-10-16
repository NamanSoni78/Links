#!/usr/bin/env python3
"""Generates the self-contained Colab notebook (turso-setup.ipynb) for
pushing the Links schema to a Turso database. Embeds scripts/schema.sql
and a column-migration list so the notebook works without any other
files — and actually UPGRADES older databases, not just creates new ones.

The migration list is mirrored in three places (keep them in sync):
  - scripts/make-notebook.py   (this file → notebook cells 3 and 5)
  - scripts/init-db.mjs        (ensureColumns block)
  - src/lib/db.ts              (COLUMN_FIXES runtime self-heal)
"""

import json
import pathlib

SCHEMA_SQL = pathlib.Path(__file__).parent.joinpath("schema.sql").read_text().strip()
assert "__" not in SCHEMA_SQL, "placeholder clash"

# (table, column, ALTER DDL) — every entry carries a DEFAULT so SQLite
# allows the ADD COLUMN even on a table that already holds rows.
# CREATE TABLE IF NOT EXISTS never adds columns to an existing table,
# which is exactly why this list exists.
COLUMN_FIXES = [
    ("users", "email_verified", "ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0"),
    ("users", "failed_attempts", "ALTER TABLE users ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0"),
    ("profiles", "description", "ALTER TABLE profiles ADD COLUMN description TEXT NOT NULL DEFAULT ''"),
    ("profiles", "tags", "ALTER TABLE profiles ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'"),
    ("profiles", "avatar", "ALTER TABLE profiles ADD COLUMN avatar TEXT NOT NULL DEFAULT ''"),
    ("links", "description", "ALTER TABLE links ADD COLUMN description TEXT NOT NULL DEFAULT ''"),
    ("links", "favicon", "ALTER TABLE links ADD COLUMN favicon TEXT NOT NULL DEFAULT ''"),
    ("links", "position", "ALTER TABLE links ADD COLUMN position INTEGER NOT NULL DEFAULT 0"),
    ("otp_codes", "attempts", "ALTER TABLE otp_codes ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0"),
    ("contacts", "kind", "ALTER TABLE contacts ADD COLUMN kind TEXT NOT NULL DEFAULT 'link'"),
    ("contacts", "label", "ALTER TABLE contacts ADD COLUMN label TEXT NOT NULL DEFAULT ''"),
    ("contacts", "href", "ALTER TABLE contacts ADD COLUMN href TEXT NOT NULL DEFAULT ''"),
    ("contacts", "icon", "ALTER TABLE contacts ADD COLUMN icon TEXT NOT NULL DEFAULT ''"),
    ("contacts", "position", "ALTER TABLE contacts ADD COLUMN position INTEGER NOT NULL DEFAULT 0"),
    ("widgets", "data", "ALTER TABLE widgets ADD COLUMN data TEXT NOT NULL DEFAULT '{}'"),
]

PY_FIXES = "\n".join(f'    ("{t}", "{c}", "{d}"),' for t, c, d in COLUMN_FIXES)
JS_FIXES = "\n".join(f'  ["{t}", "{c}", "{d}"],' for t, c, d in COLUMN_FIXES)

cells = []


def md(src: str):
    cells.append({"cell_type": "markdown", "metadata": {}, "source": src})


def code(src: str):
    cells.append(
        {"cell_type": "code", "metadata": {}, "source": src, "execution_count": None, "outputs": []}
    )


md(
    """# 🔗 Links — Turso Database Setup

This one-time notebook **creates or upgrades** the **Links** database schema (7 tables + indexes) on your free **Turso** database.

**What it does**
1. Creates any missing tables (harmless if they already exist).
2. **Upgrades older databases**: adds columns that shipped in later app versions (`links.description`, `links.favicon`, `profiles.avatar`, …). `CREATE TABLE IF NOT EXISTS` alone never touches existing tables — so if your database was set up with an earlier version of the app, this step is what fixes `no such column` errors on `/dashboard`.

**How to use**
1. Grab your database credentials — either from the [Turso dashboard](https://app.turso.tech) (database → *Connect*) or with the CLI:
   ```
   turso db show <your-db-name> --url
   turso db tokens create <your-db-name>
   ```
2. Paste them into the next cell.
3. **Runtime → Run all** — the notebook creates everything, upgrades it, and verifies it.
4. Copy the same two values into your Vercel project's environment variables.

> The notebook is idempotent — running it twice is harmless."""
)

code(
    '''# @title 1 · Paste your Turso credentials  { display-mode: "form" }

DATABASE_URL = "libsql://your-db-your-org.turso.io"  # @param {type:"string"}
AUTH_TOKEN  = "eyJ........"                          # @param {type:"string"}

assert DATABASE_URL and not DATABASE_URL.startswith("libsql://your-db"), \\
    "⬆️ Replace DATABASE_URL with your database URL from the Turso dashboard."
assert AUTH_TOKEN and not AUTH_TOKEN.startswith("eyJ........"), \\
    "⬆️ Replace AUTH_TOKEN with an auth token for your database."

print("Credentials look good.")
print("  URL  :", DATABASE_URL)'''
)

CELL_SCHEMA = '''# @title 2 · Create the schema (tables + indexes)  { display-mode: "form" }
import json
import requests

SCHEMA_SQL = """
__SCHEMA__
"""

# Turso databases speak HTTPS behind the libsql:// scheme.
http_url = DATABASE_URL.replace("libsql://", "https://").replace("wss://", "https://").rstrip("/")
headers = {"Authorization": f"Bearer {AUTH_TOKEN}", "Content-Type": "application/json"}

statements = []
for stmt in SCHEMA_SQL.split(";"):
    cleaned = "\\n".join(l for l in stmt.split("\\n") if not l.strip().startswith("--")).strip()
    if cleaned:
        statements.append(cleaned)

print(f"Applying {len(statements)} statements to {http_url}\\n")
for stmt in statements:
    label = stmt.split("\\n")[0][:60]
    body = {"requests": [{"type": "execute", "stmt": {"sql": stmt}}, {"type": "close"}]}
    res = requests.post(f"{http_url}/v2/pipeline", headers=headers, json=body, timeout=30)
    res.raise_for_status()
    results = res.json().get("results", [])
    failed = [r for r in results if r.get("type") == "error"]
    if failed:
        raise RuntimeError(json.dumps(failed, indent=2))
    print("  ✓", label)

print("\\n✅ Schema applied successfully.")'''

code(CELL_SCHEMA.replace("__SCHEMA__", SCHEMA_SQL))

CELL_UPGRADE = '''# @title 3 · Upgrade older databases (add missing columns)  { display-mode: "form" }
import json
import re
import requests

http_url = DATABASE_URL.replace("libsql://", "https://").replace("wss://", "https://").rstrip("/")
headers = {"Authorization": f"Bearer {AUTH_TOKEN}", "Content-Type": "application/json"}

# Columns that shipped in later app versions. CREATE TABLE IF NOT EXISTS
# never adds columns to a table that already exists — these ALTERs do.
COLUMN_FIXES = [
__PY_FIXES__
]


def pipeline(sqls):
    body = {"requests": [{"type": "execute", "stmt": {"sql": s}} for s in sqls] + [{"type": "close"}]}
    res = requests.post(f"{http_url}/v2/pipeline", headers=headers, json=body, timeout=60)
    res.raise_for_status()
    results = res.json().get("results", [])
    failed = [r for r in results if r.get("type") == "error"]
    if failed:
        raise RuntimeError(json.dumps(failed, indent=2))
    return [r["response"]["result"]["rows"] for r in results if r.get("type") == "ok"]


def columns_of(tables):
    """{table: set(column names)} — plain SELECT first; if the server rejects
    pragma_table_info, fall back to parsing sqlite_master's CREATE statements."""
    try:
        rows = pipeline([f"SELECT name FROM pragma_table_info('{t}')" for t in tables])
        return {t: {list(r)[0]["value"] for r in rws} for t, rws in zip(tables, rows)}
    except Exception:
        quoted = ",".join(f"'{t}'" for t in tables)
        rows = pipeline([f"SELECT name, sql FROM sqlite_master WHERE type='table' AND name IN ({quoted})"])
        ddl = {list(r)[0]["value"]: list(r)[1]["value"] for r in rows[0]}
        out = {}
        for t in tables:
            text = ddl.get(t) or ""
            body = text[text.index("(") + 1 : text.rindex(")")] if "(" in text and ")" in text else ""
            # every column is "name TYPE" with an uppercase SQLite type —
            # matches original lines AND columns ALTER-appended later, which
            # SQLite packs onto comma-led (sometimes shared) lines
            out[t] = set(re.findall(r"([a-z_][a-z0-9_]*)\\s+(?:TEXT|INTEGER|REAL|BLOB|NUMERIC)\\b", body))
        return out


fixed_tables = sorted({t for t, _, _ in COLUMN_FIXES})

# Which tables exist, and which columns do they already have?
rows = pipeline(["SELECT name FROM sqlite_master WHERE type='table'"])
tables = {list(r)[0]["value"] for r in rows[0]}
have = columns_of([t for t in fixed_tables if t in tables])

needed = [ddl for t, c, ddl in COLUMN_FIXES if t in tables and c not in have.get(t, set())]

if not needed:
    print("✅ Database already has every column — nothing to upgrade.")
else:
    print(f"Adding {len(needed)} missing column(s):\\n")
    for ddl in needed:
        try:
            pipeline([ddl])
            print("  +", ddl)
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("  = already present:", ddl)
            else:
                raise
    print("\\n✅ Upgrade complete.")'''

code(CELL_UPGRADE.replace("__PY_FIXES__", PY_FIXES))

CELL_VERIFY = '''# @title 4 · Verify & copy your Vercel env vars  { display-mode: "form" }
import re
import requests

http_url = DATABASE_URL.replace("libsql://", "https://").replace("wss://", "https://").rstrip("/")
headers = {"Authorization": f"Bearer {AUTH_TOKEN}", "Content-Type": "application/json"}


def pipeline(sqls):
    body = {"requests": [{"type": "execute", "stmt": {"sql": s}} for s in sqls] + [{"type": "close"}]}
    res = requests.post(f"{http_url}/v2/pipeline", headers=headers, json=body, timeout=60)
    res.raise_for_status()
    results = res.json().get("results", [])
    failed = [r for r in results if r.get("type") == "error"]
    if failed:
        raise RuntimeError(json.dumps(failed, indent=2))
    return [r["response"]["result"]["rows"] for r in results if r.get("type") == "ok"]


def columns_of(tables):
    try:
        rows = pipeline([f"SELECT name FROM pragma_table_info('{t}')" for t in tables])
        return {t: {list(r)[0]["value"] for r in rws} for t, rws in zip(tables, rows)}
    except Exception:
        quoted = ",".join(f"'{t}'" for t in tables)
        rows = pipeline([f"SELECT name, sql FROM sqlite_master WHERE type='table' AND name IN ({quoted})"])
        ddl = {list(r)[0]["value"]: list(r)[1]["value"] for r in rows[0]}
        out = {}
        for t in tables:
            text = ddl.get(t) or ""
            body = text[text.index("(") + 1 : text.rindex(")")] if "(" in text and ")" in text else ""
            out[t] = set(re.findall(r"([a-z_][a-z0-9_]*)\\s+(?:TEXT|INTEGER|REAL|BLOB|NUMERIC)\\b", body))
        return out


expected = ["users", "profiles", "links", "otp_codes", "widgets", "contacts", "admin_config"]
rows = pipeline(
    ["SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"]
)
tables = [list(r)[0]["value"] for r in rows[0]]

print("Tables found:", ", ".join(tables))
missing = [t for t in expected if t not in tables]
if missing:
    raise RuntimeError(f"Missing tables: {missing} — re-run cell 2.")
print("All 7 expected tables are present. ✅\\n")

# Column check — the ones the app actually SELECTs.
critical = {
    "profiles": ["display_name", "description", "tags", "avatar"],
    "links": ["url", "title", "description", "favicon", "position"],
}
have = columns_of(list(critical))
for table, columns in critical.items():
    missing = [c for c in columns if c not in have.get(table, set())]
    if missing:
        raise RuntimeError(f"{table} is missing columns: {missing} — re-run cell 3.")
    print(f"  ✓ {table}: " + ", ".join(columns))

print("\\nSchema verified end to end. ✅\\n")

print("Copy these into Vercel → your project → Settings → Environment Variables:\\n")
print("-" * 60)
print("TURSO_DATABASE_URL = " + DATABASE_URL)
print("TURSO_AUTH_TOKEN   = " + AUTH_TOKEN[:10] + "…(the same token you pasted above)")
print("-" * 60)'''

code(CELL_VERIFY)

md(
    """## Fallback (only if cells 2–3 failed)

The main cells talk to Turso's HTTPS API directly. In the unlikely case that
doesn't work for your database, this cell installs the official
`@libsql/client` and applies the exact same schema **and column upgrades**
through Node.js instead."""
)

CELL_FALLBACK = '''# @title 5 · Fallback: schema + upgrades via Node.js  { display-mode: "form" }
import os, pathlib

os.environ["LINKS_DB_URL"] = DATABASE_URL
os.environ["LINKS_DB_TOKEN"] = AUTH_TOKEN

SCHEMA_SQL = """
__SCHEMA__
"""

script = """
const { createClient } = require("@libsql/client");
const db = createClient({
  url: process.env.LINKS_DB_URL,
  authToken: process.env.LINKS_DB_TOKEN,
});

const SCHEMA = `__SCHEMA_JS__`;

// Columns that shipped in later app versions (see schema.sql).
const COLUMN_FIXES = [
__JS_FIXES__
];

// Plain SELECT first (works over any SQLite-over-HTTP layer); PRAGMA as fallback.
async function columnsOf(table) {
  try {
    const r = await db.execute(`SELECT name FROM pragma_table_info('${table}')`);
    return new Set(r.rows.map((row) => row.name));
  } catch (e) {
    const r = await db.execute(`PRAGMA table_info(${table})`);
    return new Set(r.rows.map((row) => row.name));
  }
}

(async () => {
  const statements = SCHEMA
    .split(";")
    .map((s) => s.replace(/^--.*$/gm, "").trim())
    .filter(Boolean);
  for (const stmt of statements) {
    await db.execute(stmt);
    console.log("  ✓", stmt.split("\\n")[0].slice(0, 60));
  }

  const tables = new Set(
    (await db.execute("SELECT name FROM sqlite_master WHERE type='table'"))
      .rows.map((r) => r.name)
  );
  for (const [table, column, ddl] of COLUMN_FIXES) {
    if (!tables.has(table)) continue;
    if ((await columnsOf(table)).has(column)) continue;
    try {
      await db.execute(ddl);
      console.log(`  + ${table}.${column} added`);
    } catch (e) {
      if (!String(e).includes("duplicate column name")) throw e;
      console.log(`  = ${table}.${column} already present`);
    }
  }

  const list = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  console.log("");
  console.log("Tables:", list.rows.map((r) => r.name).join(", "));
  console.log("links columns:", [...(await columnsOf("links"))].join(", "));
  console.log("Done ✅");
})().catch((e) => { console.error(e); process.exit(1); });
""".replace("__SCHEMA_JS__", SCHEMA_SQL)

pathlib.Path("links-schema.cjs").write_text(script)

!node --version
!npm install --silent @libsql/client
!node links-schema.cjs'''

code(
    CELL_FALLBACK.replace("__SCHEMA__", SCHEMA_SQL).replace(
        "__JS_FIXES__", JS_FIXES
    )
)

notebook = {
    "nbformat": 4,
    "nbformat_minor": 5,
    "metadata": {
        "colab": {"procedence": [], "toc_visible": True},
        "kernelspec": {"name": "python3", "display_name": "Python 3"},
        "language_info": {"name": "python"},
    },
    "cells": cells,
}

out = pathlib.Path("/home/z/my-project/download/turso-setup.ipynb")
out.parent.mkdir(parents=True, exist_ok=True)

# Escape-sanity guard: the cell templates are normal (non-raw) Python
# strings, so e.g. a stray \b silently becomes a backspace and breaks the
# embedded regexes. No control characters may ever reach the notebook.
for c in cells:
    for bad, name in (("\x08", "backspace"), ("\x00", "NUL"), ("\x1b", "ESC"), ("\r", "CR")):
        assert bad not in c["source"], f"{name} leaked into a cell — fix template escaping"

out.write_text(json.dumps(notebook, indent=1))
print(f"Wrote {out} ({out.stat().st_size} bytes, {len(cells)} cells)")
