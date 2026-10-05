// Default club copy (facts from the old Wix site, rewritten). Used when Sanity is not configured yet, and
// by apps/studio/seed.ts to seed the "Club details & homepage" document.
import type { SiteSettings } from "./types";

export const FALLBACK_SETTINGS: SiteSettings = {
  heroHeadline: "Inline hockey in Battersea since 1996.",
  heroSubheading:
    "Inline hockey in Battersea since 1996. Fast, physical, non-contact, and open to anyone who wants to learn. First session? We lend you the kit.",
  aboutHeading: "Since 1996",
  aboutBody:
    "Nearly thirty years on the same sport court in Battersea. League players, weekend skaters and people " +
    "who have never held a stick, all on the same rink every Friday night.\n\n" +
    "We are a multinational, inclusive club. Nobody cares where you are from or how well you skate. " +
    "Turn up, gear up, play.\n\n" +
    "Our official team plays in the BIPHA league. And when Friday hockey is done, we head to the local pub " +
    "for a pint.",
  founded: 1996,
  training: [
    {
      title: "Friday session",
      day: "Friday",
      start: "19:30",
      end: "21:30",
      description: "All levels on one rink. Teams are balanced every week so every game is a real game.",
    },
  ],
  kitNotes:
    "Helmet and gloves are mandatory. Full pads (knees, elbows, shins) recommended. Kit is provided for your first session.",
  feesText: null,
  kumite: {
    intro:
      "Four times a year, the Cougars go underground. The Kumite is our in-house tournament, a special event " +
      "apart from regular Friday hockey. Everyone who signs up is drafted into balanced teams, every team plays " +
      "every other team, and one team walks away as champions. It sounds secret. It isn't: anyone can play.",
    format: [
      "Players are drafted into balanced teams on the day",
      "Full round robin: every team plays every team",
      "One team finishes top of the table as champions",
    ],
    awards: ["Champions", "Top scorer", "Most assists", "Most points"],
  },
  team: {
    intro:
      "The official Battersea Cougars team plays in the BIPHA league. Same club, same Friday rink, " +
      "plus fixtures against other inline hockey clubs.",
    league: "BIPHA",
    photo: null,
  },
  venue: {
    name: "Battersea Sports Centre",
    address: "London SW11 3AB",
    mapUrl: "https://maps.app.goo.gl/w5GZTqQF9Qekgeaa6",
  },
  contactEmail: "batterseahockey@gmail.com",
  socials: {
    instagram: "https://www.instagram.com/batterseacougarshockey/",
    facebook: "https://www.facebook.com/groups/531393120208526",
    youtube: null,
  },
};
