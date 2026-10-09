// What a charge was for, in words, and per-member and per-session sums over the store's charges (ADR 0007).
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
    const series = db.series.find((s) => s.id === c.seriesId);
    return {
      title: c.title ?? "Training",
      at: londonISO(c.dueOn, c.startTime ?? "19:30"),
      icon: series?.icon ?? "stick",
      tone: series?.tone ?? "blue",
    };
  }
  if (c.kind === "tournament") {
    const type = db.tournamentTypes.find((x) => x.id === c.typeId);
    return {
      title: c.title ?? "Tournament",
      at: londonISO(c.dueOn, c.startTime ?? "11:00"),
      icon: type?.icon ?? "trophy",
      tone: type?.tone ?? "red",
    };
  }
  // "2026-Q4" → "Quarterly membership, Q4 2026"
  const [year, q] = (c.quarter ?? "").split("-");
  return { title: `Quarterly membership, ${q} ${year}`, at: londonISO(c.dueOn, "12:00"), icon: "pound", tone: "green" };
}

/** A member's charges, newest first. */
export const chargesFor = (memberId: number) =>
  db.charges.filter((c) => c.memberId === memberId).sort((a, b) => b.dueOn.localeCompare(a.dueOn));

export const owedBy = (memberId: number) => owed(db.charges, memberId);

export const collectedFor = (kind: Charge["kind"], refId: number) => collected(db.charges, kind, refId);
