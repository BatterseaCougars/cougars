// Locker-room lines, spelt the way the team says them. Replies: the ask is what Home says before you answer; the
// rest are the app talking back when you do. Greetings: Home's title, by the time of day, on a training night, or
// once you've looked too often (lib/greetings.ts picks the set). Admins edit them in Settings → Quips; these are
// the starting set. Keep them short and cheeky, never needy, and never make one a club fact.

export type ReplyKind = "ask" | "nudge" | "in" | "waitlist" | "out";
export type GreetingKind = "morning" | "afternoon" | "evening" | "late" | "training" | "nag";
export type QuipKind = ReplyKind | GreetingKind;
export type QuipGroup = "reply" | "greeting";

export interface Quip {
  id: number;
  kind: QuipKind;
  text: string;
}

/** Two lines of the Home message on a phone. */
export const QUIP_MAX = 56;
/** Two lines of Home's poster title on a phone, with a longish name. */
export const GREETING_MAX = 40;
/** The In button's label, half a card wide on a phone. */
export const NUDGE_MAX = 14;

export const QUIP_KINDS: { kind: QuipKind; group: QuipGroup; label: string; hint: string; max: number }[] = [
  { kind: "ask", group: "reply", label: "Ask", hint: "On Home before you've answered", max: QUIP_MAX },
  {
    kind: "nudge",
    group: "reply",
    label: "Nudge",
    hint: "Typed on the In button of the next session, until you're in",
    max: NUDGE_MAX,
  },
  { kind: "in", group: "reply", label: "In", hint: "When you say you're in", max: QUIP_MAX },
  { kind: "waitlist", group: "reply", label: "Waitlist", hint: "When it's full and you're queued", max: QUIP_MAX },
  { kind: "out", group: "reply", label: "Out", hint: "When you say you're out", max: QUIP_MAX },
  { kind: "morning", group: "greeting", label: "Morning", hint: "Home's title before noon", max: GREETING_MAX },
  { kind: "afternoon", group: "greeting", label: "Afternoon", hint: "Home's title from noon", max: GREETING_MAX },
  { kind: "evening", group: "greeting", label: "Evening", hint: "Home's title from 6pm", max: GREETING_MAX },
  { kind: "late", group: "greeting", label: "Late", hint: "Home's title from 11pm until 5am", max: GREETING_MAX },
  {
    kind: "training",
    group: "greeting",
    label: "Training night",
    hint: "Home's title on the day of a training session, until 11pm",
    max: GREETING_MAX,
  },
  {
    kind: "nag",
    group: "greeting",
    label: "Again?",
    hint: "Home's title from someone's 4th look in a day, whatever the time",
    max: GREETING_MAX,
  },
];

const SEED: Record<QuipKind, string[]> = {
  ask: [
    "If you ain't first, you last.",
    "Well? We haven't got all night.",
    "Skates on or excuses ready?",
    "In or out. It's not a hard one.",
    "Your public awaits. Allegedly.",
    "Commitment issues? It's one button.",
    "Neither in nor out. Very you.",
    "Still deciding? The puck won't wait.",
  ],
  nudge: ["Do it…", "Go on…", "You know it…", "Tap it…"],
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
  morning: ["Up and at 'em, {name}", "Rise and grind, {name}", "Early doors, {name}", "Morning, {name}. Stretch."],
  afternoon: [
    "Well, well. {name}.",
    "Skiving, {name}?",
    "Look who it is. {name}.",
    "Shouldn't you be working, {name}?",
  ],
  evening: ["Evening, {name}", "Still standing, {name}?", "Legs fresh, {name}?", "Night shift, {name}?"],
  late: ["Can't sleep, {name}?", "Go to bed, {name}", "Bit late, {name}"],
  training: ["Lace up, {name}", "Skates on tonight, {name}", "Tonight's the night, {name}", "Game face, {name}"],
  nag: [
    "{nth} look today, {name}. Touch grass.",
    "{nth} visit. It's not changing, {name}.",
    "Refreshing won't make it {day}, {name}",
    "{nth} time today. Go outside, {name}.",
    "Again, {name}? {nth} today.",
  ],
};

export const QUIPS: Quip[] = (Object.keys(SEED) as QuipKind[])
  .flatMap((kind) => SEED[kind].map((text) => ({ kind, text })))
  .map((q, i) => ({ id: i + 1, ...q }));

export const pick = <T>(list: T[]): T | undefined => list[Math.floor(Math.random() * list.length)];
