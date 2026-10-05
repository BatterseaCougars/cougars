import type { PortableTextBlock } from "@portabletext/types";

export interface SanityImage {
  asset?: { _ref: string };
  hotspot?: { x: number; y: number };
  crop?: unknown;
  alt?: string;
  /** Demo content only (lib/sanity/demo.ts): placeholder photo base URL, sized by imageUrl(). */
  demoUrl?: string;
}

export interface TrainingSlot {
  title: string;
  day: string;
  start: string;
  end: string;
  description?: string;
}

// Club facts, one Sanity singleton each (apps/studio/schemaTypes/settings.ts). Page wording lives in code.
export interface Club {
  founded: number;
  contactEmail: string;
  socials: { instagram?: string | null; facebook?: string | null; youtube?: string | null };
  youtubeChannelId?: string | null;
  heroImage?: SanityImage | null;
}

export interface Fridays {
  training: TrainingSlot[];
  venue: { name: string; address: string; mapUrl: string };
  kitNotes: string;
  /** What the club lends a newcomer. Empty: the site says nothing about lending kit. */
  firstSessionKit?: string | null;
  feesText?: string | null;
}

export interface Pub {
  name: string;
  about: string;
  mapUrl?: string | null;
}

export interface Team {
  intro: string;
  league?: string | null;
  photo?: SanityImage | null;
}

export interface Kumite {
  intro: string;
  format: string[];
  awards: string[];
}

/** Every club fact in one object, the shape pages read through getSettings(). */
export interface SiteSettings extends Club, Fridays {
  pub: Pub;
  team: Team;
  kumite: Kumite;
}

export interface KumiteResult {
  season: string;
  /** YYYY-MM-DD. The newest is the reigning champion. */
  date: string;
  champions?: string | null;
  topScorer?: string | null;
  event?: { title: string; slug: string } | null;
}

export interface Video {
  _id: string;
  title: string;
  recordedOn: string;
  youtubeUrl: string;
  description?: string | null;
}

export type EventType = "training" | "social" | "tournament" | "kumite";

export interface ClubEvent {
  title: string;
  slug: string;
  type: EventType;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
  summary?: string | null;
  cover?: SanityImage | null;
  body?: PortableTextBlock[] | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
}

export interface Album {
  title: string;
  slug: string;
  date: string;
  cover?: SanityImage | null;
  photos: (SanityImage & { caption?: string | null })[];
}

export interface Sponsor {
  name: string;
  url?: string | null;
  logo?: SanityImage | null;
}

export interface Player {
  _id: string;
  name: string;
  nickname?: string | null;
  number?: number | null;
  position?: string | null;
  shoots?: string | null;
  since?: number | null;
  knownFor?: string | null;
  weakness?: string | null;
  quote?: string | null;
  photo?: SanityImage | null;
}
