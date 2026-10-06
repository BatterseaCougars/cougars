// Locker-room lines, spelt the way the team says them. The ask is a teammate's catchphrase; the replies are
// the app talking back when you answer. Keep them short, and never make one a club fact.

export interface Quip {
  text: string;
  by?: string;
}

export const ASK: Quip = { text: "If you ain't first, you last." };

export const IN: Quip[] = [
  { text: "Shake and bake." },
  { text: "That's how you do it. See you Friday." },
  { text: "First on the rink, first in our hearts." },
  { text: "Good. Bring your legs." },
];

export const WAITLIST: Quip[] = [
  { text: "Full house. You're next in line." },
  { text: "On the bench for now. Someone always drops." },
];

export const OUT: Quip[] = [
  { text: "If you ain't first, you last." },
  { text: "Suit yourself. The rink'll miss you." },
  { text: "Noted. Your spot's going to someone faster." },
];

export const pick = (list: Quip[]): Quip => list[Math.floor(Math.random() * list.length)];
