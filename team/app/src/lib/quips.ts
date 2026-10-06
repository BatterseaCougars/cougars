// Locker-room lines, spelt the way the team says them. The ask is what Home says before you answer; the rest are
// the app talking back when you do. Admins edit them in Settings → Quips; these are the starting set. Keep them
// short and cheeky, never needy, and never make one a club fact.

export type QuipKind = "ask" | "in" | "waitlist" | "out";

export interface Quip {
  id: number;
  kind: QuipKind;
  text: string;
}

export const QUIP_KINDS: { kind: QuipKind; label: string; hint: string }[] = [
  { kind: "ask", label: "Ask", hint: "On Home before you've answered" },
  { kind: "in", label: "In", hint: "When you say you're in" },
  { kind: "waitlist", label: "Waitlist", hint: "When it's full and you're queued" },
  { kind: "out", label: "Out", hint: "When you say you're out" },
];

/** Two lines of the Home message on a phone. */
export const QUIP_MAX = 56;

const SEED: Record<QuipKind, string[]> = {
  ask: [
    "If you ain't first, you last.",
    "Well? We haven't got all night.",
    "Skates on or excuses ready?",
    "In or out. It's not a hard one.",
    "Your public awaits. Allegedly.",
  ],
  in: [
    "Shake and bake.",
    "Good. Bring your legs.",
    "Bold. Stretch first.",
    "In. Try to stay upright this time.",
    "Lovely. Someone has to lose the faceoffs.",
    "Brave. Pads on, ego off.",
    "Noted. Pass it occasionally.",
    "Right answer. Took you long enough.",
    "In. The bar's low. Clear it.",
  ],
  waitlist: [
    "Full house. Someone always bottles it.",
    "Bench for now. Keep it warm.",
    "Waitlist. Start hoping for traffic.",
    "Queued. Stretch anyway, optimist.",
    "Full. Should've been quicker.",
  ],
  out: [
    "If you ain't first, you last.",
    "Noted. Your spot's going to someone faster.",
    "Fine. More puck for us.",
    "Cool. We'll say you were scared.",
    "Out? Bold of you to think we'd notice.",
    "Rest up, princess.",
    "Shame. Said no one.",
    "Your loss. Literally, on the scoreboard.",
  ],
};

export const QUIPS: Quip[] = (Object.keys(SEED) as QuipKind[])
  .flatMap((kind) => SEED[kind].map((text) => ({ kind, text })))
  .map((q, i) => ({ id: i + 1, ...q }));

export const pick = <T>(list: T[]): T | undefined => list[Math.floor(Math.random() * list.length)];
