// In-memory SQLite that quacks like the subset of D1Database we use, with every
// migration in db/migrations applied. For Vitest only.
import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(import.meta.dirname, "../../db/migrations");

export function createTestD1(): D1Database & { raw: Database.Database } {
  const sqlite = new Database(":memory:");
  for (const file of readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    sqlite.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }

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
