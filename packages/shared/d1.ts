// Thin helpers over a D1 binding. No ORM: write SQL, keep it in one place per
// domain (e.g. apps/web/src/lib/server/enquiries.ts). Pattern borrowed from
// gwenda-hackney/ark packages/shared/d1.js.

export type Param = string | number | null;

export async function all<T>(db: D1Database, sql: string, params: Param[] = []): Promise<T[]> {
  const { results } = await db
    .prepare(sql)
    .bind(...params)
    .all<T>();
  return results;
}

export async function first<T>(db: D1Database, sql: string, params: Param[] = []): Promise<T | null> {
  return db
    .prepare(sql)
    .bind(...params)
    .first<T>();
}

export async function run(db: D1Database, sql: string, params: Param[] = []) {
  return db
    .prepare(sql)
    .bind(...params)
    .run();
}
