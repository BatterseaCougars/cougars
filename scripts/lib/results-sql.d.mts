// Types for results-sql.mjs, for the TypeScript that imports it (the team app's use-case tests). The rows' shape is
// apps/web/src/lib/results.ts ResultRows.
export const RESULTS_SQL: Record<"tournaments" | "games" | "teams" | "players" | "goals" | "winners", string>;
export function readResultRows<R = never>(
  query: (sql: string) => Promise<unknown[]>,
): Promise<[R] extends [never] ? import("../../apps/web/src/lib/results").ResultRows : R>;
