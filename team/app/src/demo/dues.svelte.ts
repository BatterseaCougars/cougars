// What a charge was for, in words, and per-member and per-session sums over the store's charges.
import type { IconName } from "../app/shell/icons";
import { londonISO } from "../lib/dates";
import { collected, owed, type Charge } from "../lib/dues";
import type { Tone } from "./model";
import { db } from "./store.svelte";

export interface ChargeLabel {
  title: string;
  /** When it was held, as an instant for formatting. */
  at: string;
  icon: IconName;
  tone: Tone;
}

export function labelFor(c: Charge): ChargeLabel {
  if (c.kind === "session") {
    const session = db.sessions.find((s) => s.id === c.refId);
    const series = db.series.find((s) => s.id === session?.seriesId);
    return {
      title: series?.name ?? "Training",
      at: londonISO(c.dueOn, session?.startTime ?? series?.startTime ?? "19:30"),
      icon: series?.icon ?? "stick",
      tone: series?.tone ?? "blue",
    };
  }
  const t = db.tournaments.find((x) => x.id === c.refId);
  const type = db.tournamentTypes.find((x) => x.id === t?.typeId);
  return {
    title: t?.name ?? "Tournament",
    at: londonISO(c.dueOn, t?.startTime ?? "11:00"),
    icon: type?.icon ?? "trophy",
    tone: type?.tone ?? "red",
  };
}

/** A member's charges, newest first. */
export const chargesFor = (memberId: number) =>
  db.charges.filter((c) => c.memberId === memberId).sort((a, b) => b.dueOn.localeCompare(a.dueOn));

export const owedBy = (memberId: number) => owed(db.charges, memberId);

export const collectedFor = (kind: Charge["kind"], refId: number) => collected(db.charges, kind, refId);
