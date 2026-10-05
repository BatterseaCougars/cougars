// Sample content for previewing the design locally before Sanity has real
// content. Only used when DEMO_CONTENT=1 in `astro dev`; never in builds.
import type { ClubEvent, Post } from "./types";

const inDays = (d: number, time: string) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  const [h, m] = time.split(":").map(Number);
  t.setHours(h, m, 0, 0);
  return t.toISOString();
};

export const DEMO_EVENTS: ClubEvent[] = [
  {
    title: "Cougars Kumite: Winter (sample)",
    slug: "demo-kumite",
    type: "kumite",
    startsAt: inDays(40, "10:00"),
    endsAt: inDays(40, "16:00"),
    location: "Battersea Sports Centre",
    summary: "Sample event: drafted teams, full round robin, one champion.",
  },
  {
    title: "End of season social (sample)",
    slug: "demo-social",
    type: "social",
    startsAt: inDays(18, "21:45"),
    location: "Somewhere near the rink",
    summary: "Sample event shown in demo mode only.",
  },
  {
    title: "Skills clinic (sample)",
    slug: "demo-clinic",
    type: "training",
    startsAt: inDays(25, "19:30"),
    endsAt: inDays(25, "21:30"),
    location: "Battersea Sports Centre",
    summary: "Sample event shown in demo mode only.",
  },
];

export const DEMO_POSTS: Post[] = [
  { title: "Sample news post one", slug: "demo-1", publishedAt: inDays(-3, "12:00"), excerpt: "Demo mode only." },
  { title: "Sample news post two", slug: "demo-2", publishedAt: inDays(-12, "12:00"), excerpt: "Demo mode only." },
  { title: "Sample news post three", slug: "demo-3", publishedAt: inDays(-30, "12:00"), excerpt: "Demo mode only." },
];
