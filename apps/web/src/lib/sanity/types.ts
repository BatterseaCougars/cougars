import type { PortableTextBlock } from "@portabletext/types";

export interface SanityImage {
  asset?: { _ref: string };
  hotspot?: { x: number; y: number };
  crop?: unknown;
  alt?: string;
}

export interface TrainingSlot {
  title: string;
  day: string;
  start: string;
  end: string;
  description?: string;
}

export interface SiteSettings {
  heroHeadline: string;
  heroSubheading: string;
  heroImage?: SanityImage | null;
  aboutHeading: string;
  aboutBody: string;
  founded: number;
  training: TrainingSlot[];
  kitNotes: string;
  feesText?: string | null;
  venue: { name: string; address: string; mapUrl: string };
  contactEmail: string;
  socials: { instagram?: string | null; facebook?: string | null; youtube?: string | null };
}

export interface Post {
  title: string;
  slug: string;
  publishedAt: string;
  excerpt?: string | null;
  cover?: SanityImage | null;
  body?: PortableTextBlock[] | null;
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
