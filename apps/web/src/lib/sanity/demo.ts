// Sample content for previewing the design locally before Sanity has real
// content. Only used when DEMO_CONTENT=true in `astro dev`; never in builds.
// Photos are random placeholders from picsum.photos (not hockey); videos are
// public inline hockey clips on YouTube.
import type { Album, ClubEvent, Honour, Player, Post, SanityImage, Video } from "./types";

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

const pic = (seed: string, alt = ""): SanityImage => ({ demoUrl: `https://picsum.photos/seed/cougars-${seed}`, alt });

export const DEMO_POSTS: Post[] = [
  {
    title: "Sample news post one",
    slug: "demo-1",
    publishedAt: inDays(-3, "12:00"),
    excerpt: "Demo mode only.",
    cover: pic("news1"),
  },
  {
    title: "Sample news post two",
    slug: "demo-2",
    publishedAt: inDays(-12, "12:00"),
    excerpt: "Demo mode only.",
    cover: pic("news2"),
  },
  {
    title: "Sample news post three",
    slug: "demo-3",
    publishedAt: inDays(-30, "12:00"),
    excerpt: "Demo mode only.",
    cover: pic("news3"),
  },
];

export const DEMO_VIDEOS: Video[] = [
  {
    _id: "demo-video-1",
    title: "Friday night highlights (sample)",
    recordedOn: inDays(-4, "21:00"),
    youtubeUrl: "https://www.youtube.com/watch?v=_O72RtQsqA4",
    description: "Sample video: inline street hockey highlights.",
  },
  {
    _id: "demo-video-2",
    title: "Top ten goals (sample)",
    recordedOn: inDays(-11, "21:00"),
    youtubeUrl: "https://www.youtube.com/watch?v=X_rw0CtkL5Q",
    description: "Sample video: IIHF InLine Hockey World Championship 2015.",
  },
];

const album = (slug: string, title: string, days: number, count: number): Album => ({
  title,
  slug,
  date: inDays(days, "21:00"),
  cover: pic(`${slug}-0`),
  photos: Array.from({ length: count }, (_, i) => ({ ...pic(`${slug}-${i}`), caption: `Sample photo ${i + 1}` })),
});
export const DEMO_ALBUMS: Album[] = [
  album("demo-friday", "Friday night, last week (sample)", -4, 9),
  album("demo-kumite", "Kumite: Autumn (sample)", -50, 12),
  album("demo-social", "Summer social (sample)", -90, 6),
];

// Made-up characters to preview the squad cards. Not real members.
const player = (n: number, nickname: string, rest: Omit<Player, "_id" | "name" | "nickname" | "number">): Player => ({
  _id: `demo-player-${n}`,
  name: "Sample player",
  nickname,
  number: n,
  ...rest,
});
export const DEMO_PLAYERS: Player[] = [
  player(4, "The Wall", {
    position: "Defence",
    shoots: "Left",
    since: 1998,
    knownFor: "Standing still, effectively",
    weakness: "Stairs, the day after",
    quote: "I was never out of position. The game moved.",
  }),
  player(17, "Hollywood", {
    position: "Forward",
    shoots: "Right",
    since: 2011,
    knownFor: "Celebrating goals scored in warm-up",
    weakness: "Passing",
    quote: "Did anyone get that on video?",
  }),
  player(1, "The Octopus", {
    position: "Goalie",
    shoots: "Left",
    since: 2006,
    knownFor: "Saves nobody can explain, including him",
    weakness: "Shots along the floor",
    quote: "I meant to do that.",
  }),
  player(88, "Sunday League", {
    position: "Forward",
    shoots: "Right",
    since: 2019,
    knownFor: "Offside, a rule we do not have",
    weakness: "Stopping",
    quote: "In football this would be a foul.",
  }),
  player(23, "The Professor", {
    position: "Defence",
    shoots: "Left",
    since: 2002,
    knownFor: "Explaining the play you just got wrong",
    weakness: "Being picked last in the draft",
    quote: "Technically, that was the correct pass.",
  }),
  player(9, "Fresh Legs", {
    position: "Wherever",
    shoots: "Right",
    since: 2025,
    knownFor: "Turning up early with all the kit",
    weakness: "Has not found the brakes yet",
    quote: "Which way are we shooting?",
  }),
];

// Placeholder honours board. Real winners go in the Studio (Club details → Kumite).
export const DEMO_HONOURS: Honour[] = [
  { season: "Autumn 2026", champions: "Team Sample A", topScorer: "Sample player" },
  { season: "Summer 2026", champions: "Team Sample B", topScorer: "Sample player" },
  { season: "Spring 2026", champions: "Team Sample C", topScorer: "Sample player" },
  { season: "Winter 2026", champions: "Team Sample D", topScorer: "Sample player" },
];
