// In-memory SQLite that quacks like the subset of D1Database we use, as a fresh database starts: db/schema.sql with
// the club's seed (db/seed/club.sql) until launch, then every migration in db/migrations/ in order (ADR 0050).
// For Vitest only.
import Database from "better-sqlite3";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DB_DIR = join(import.meta.dirname, "../../../db");
const MIGRATIONS = join(DB_DIR, "migrations");

/** The files that make the database, in order. */
function sources(): string[] {
  const migrations = existsSync(MIGRATIONS) ? readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")) : [];
  if (migrations.length) return migrations.sort().map((f) => join(MIGRATIONS, f));
  return [join(DB_DIR, "schema.sql"), join(DB_DIR, "seed/club.sql")];
}

export function createTestD1(): D1Database & { raw: Database.Database } {
  const sqlite = new Database(":memory:");
  for (const file of sources()) sqlite.exec(readFileSync(file, "utf8"));

  const prepare = (sql: string) => {
    let params: unknown[] = [];
    const runNow = () => {
      const info = sqlite.prepare(sql).run(...params);
      return {
        success: true,
        results: [],
        meta: { last_row_id: Number(info.lastInsertRowid), changes: info.changes },
      };
    };
    const stmt = {
      bind(...p: unknown[]) {
        params = p;
        return stmt;
      },
      async all() {
        return { results: sqlite.prepare(sql).all(...params), success: true, meta: {} };
      },
      async first() {
        return sqlite.prepare(sql).get(...params) ?? null;
      },
      async run() {
        return runNow();
      },
      runNow,
    };
    return stmt;
  };
  // As D1's: in order, in one transaction, all or nothing
  const batch = async (stmts: { runNow: () => unknown }[]) => sqlite.transaction(() => stmts.map((s) => s.runNow()))();

  return { prepare, batch, raw: sqlite } as unknown as D1Database & { raw: Database.Database };
}
