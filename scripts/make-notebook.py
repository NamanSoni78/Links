#!/usr/bin/env python3
"""Generates the self-contained Colab notebook (turso-setup.ipynb) for
pushing the Links schema to a Turso database. Embeds scripts/schema.sql
so the notebook works without any other files."""

import json
import pathlib

SCHEMA_SQL = pathlib.Path(__file__).parent.joinpath("schema.sql").read_text().strip()
assert "__" not in SCHEMA_SQL, "placeholder clash"

cells = []


def md(src: str):
    cells.append({"cell_type": "markdown", "metadata": {}, "source": src})


def code(src: str):
    cells.append(
        {"cell_type": "code", "metadata": {}, "source": src, "execution_count": None, "outputs": []}
    )


md(
    """# 🔗 Links — Turso Database Setup

This one-time notebook creates (or upgrades) the **Links** database schema (7 tables + indexes) on your free **Turso** database.

**How to use**
1. Grab your database credentials — either from the [Turso dashboard](https://app.turso.tech) (database → *Connect*) or with the CLI:
   ```
   turso db show <your-db-name> --url
   turso db tokens create <your-db-name>
   ```
2. Paste them into the next cell.
3. **Runtime → Run all** — the notebook creates everything and verifies it.
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

CELL_SCHEMA = '''# @title 2 · Create the schema  { display-mode: "form" }
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

code(
    '''# @title 3 · Verify & copy your Vercel env vars  { display-mode: "form" }

expected = ["users", "profiles", "links", "otp_codes", "widgets", "contacts", "admin_config"]
body = {
    "requests": [
        {"type": "execute", "stmt": {"sql": "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"}},
        {"type": "close"},
    ]
}
res = requests.post(f"{http_url}/v2/pipeline", headers=headers, json=body, timeout=30)
res.raise_for_status()
raw = res.json()["results"][0]["response"]["result"]["rows"]
tables = [list(r)[0]["value"] for r in raw]

print("Tables found:", ", ".join(tables))
missing = [t for t in expected if t not in tables]
if missing:
    raise RuntimeError(f"Missing tables: {missing} — re-run the previous cell.")
print("All 7 expected tables are present. ✅\\n")

print("Copy these into Vercel → your project → Settings → Environment Variables:\\n")
print("-" * 60)
print("TURSO_DATABASE_URL = " + DATABASE_URL)
print("TURSO_AUTH_TOKEN   = " + AUTH_TOKEN[:10] + "…(the same token you pasted above)")
print("-" * 60)'''
)

md(
    """## Fallback (only if cell 2 failed)

The main method talks to Turso's HTTPS API directly. In the unlikely case it
doesn't work for your database, this cell installs the official
`@libsql/client` and applies the exact same schema through Node.js instead."""
)

CELL_FALLBACK = '''# @title 4 · Fallback: apply schema via Node.js  { display-mode: "form" }
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

(async () => {
  const statements = SCHEMA
    .split(";")
    .map((s) => s.replace(/^--.*$/gm, "").trim())
    .filter(Boolean);
  for (const stmt of statements) {
    await db.execute(stmt);
    console.log("  ✓", stmt.split("\\n")[0].slice(0, 60));
  }
  const tables = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  console.log("");
  console.log("Tables:", tables.rows.map((r) => r.name).join(", "));
  console.log("Done ✅");
})().catch((e) => { console.error(e); process.exit(1); });
""".replace("__SCHEMA_JS__", SCHEMA_SQL)

pathlib.Path("links-schema.cjs").write_text(script)

!node --version
!npm install --silent @libsql/client
!node links-schema.cjs'''

code(CELL_FALLBACK.replace("__SCHEMA__", SCHEMA_SQL))

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
out.write_text(json.dumps(notebook, indent=1))
print(f"Wrote {out} ({out.stat().st_size} bytes, {len(cells)} cells)")
