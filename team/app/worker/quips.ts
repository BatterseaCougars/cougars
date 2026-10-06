// Home's quips and greetings (lib/quips.ts QUIP_KINDS), edited by admins in Settings → Quips. Every kind keeps
// at least one line, so Home always has something to say.
import { all, first, run } from "../../../shared/d1";
import { QUIP_KINDS, type QuipKind } from "../src/lib/quips";
import { HttpError } from "./http";

export const listQuips = (db: D1Database) =>
  all<{ id: number; kind: QuipKind; text: string }>(db, "SELECT id, kind, text FROM quips ORDER BY id");

function quipText(o: Record<string, unknown>, kind: QuipKind) {
  const max = QUIP_KINDS.find((k) => k.kind === kind)!.max;
  const text = typeof o.text === "string" ? o.text.trim() : "";
  if (!text) throw new HttpError(400, "Say something.");
  if (text.length > max) throw new HttpError(400, `Keep it to ${max} characters.`);
  return text;
}

export async function createQuip(db: D1Database, o: Record<string, unknown>) {
  const kind = QUIP_KINDS.find((k) => k.kind === o.kind)?.kind;
  if (!kind) throw new HttpError(400, "Which kind of quip?");
  const res = await run(db, "INSERT INTO quips (kind, text) VALUES (?, ?)", [kind, quipText(o, kind)]);
  return { id: Number(res.meta.last_row_id) };
}

export async function updateQuip(db: D1Database, id: number, o: Record<string, unknown>) {
  const q = await first<{ kind: QuipKind }>(db, "SELECT kind FROM quips WHERE id = ?", [id]);
  if (!q) throw new HttpError(404, "No such quip.");
  await run(db, "UPDATE quips SET text = ? WHERE id = ?", [quipText(o, q.kind), id]);
}

export async function deleteQuip(db: D1Database, id: number) {
  const q = await first<{ kind: QuipKind }>(db, "SELECT kind FROM quips WHERE id = ?", [id]);
  if (!q) throw new HttpError(404, "No such quip.");
  // One statement: never the last of its kind, even with two deletes at once
  const res = await run(db, "DELETE FROM quips WHERE id = ? AND (SELECT COUNT(*) FROM quips WHERE kind = ?) > 1", [
    id,
    q.kind,
  ]);
  if (!res.meta.changes) throw new HttpError(409, "Keep at least one.");
}
