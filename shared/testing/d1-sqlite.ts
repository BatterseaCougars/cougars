// In-memory SQLite that quacks like the subset of D1Database we use: db/schema.sql with the club's seed
// (db/seed/club.sql), as a fresh database starts. For Vitest only.
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DB_DIR = join(import.meta.dirname, "../../db");

export function createTestD1(): D1Database & { raw: Database.Database } {
  const sqlite = new Database(":memory:");
  sqlite.exec(readFileSync(join(DB_DIR, "schema.sql"), "utf8"));
  sqlite.exec(readFileSync(join(DB_DIR, "seed/club.sql"), "utf8"));

  const prepare = (sql: string) => {
    let params: unknown[] = [];
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
        const info = sqlite.prepare(sql).run(...params);
        return {
          success: true,
          results: [],
          meta: { last_row_id: Number(info.lastInsertRowid), changes: info.changes },
        };
      },
    };
    return stmt;
  };

  return { prepare, raw: sqlite } as unknown as D1Database & { raw: Database.Database };
}
