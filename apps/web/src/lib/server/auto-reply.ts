// The email someone gets after the "Try a session" form, if Turnstile says they're a person and the caps allow
// (docs/adr/0028-turnstile-and-auto-reply.md). Every fact comes from the Studio (or the confirmed fallbacks), so it
// never says anything the site doesn't. It goes to an address anyone can type, so nothing the sender wrote is
// repeated except a cleaned-up first name.
import type { Mail } from "@cougars/shared/email";
import type { SiteSettings } from "../sanity/types";
import type { Enquiry } from "./enquiries";

/** "Jo" from "Jo Bloggs"; "there" for anything that isn't plainly a name (links, symbols, very long). */
export function greetingName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return /^\p{L}[\p{L}'’-]{0,23}$/u.test(first) ? first : "there";
}

export function autoReplyMail(e: Enquiry, s: SiteSettings, club: string): Mail {
  const slot = s.training[0];
  const lines = [
    `Hi ${greetingName(e.name)},`,
    "",
    "Thanks for your interest in Battersea Cougars. We've got your details and someone from the club will get back to you soon.",
    ...(slot
      ? [
          "",
          `We play ${slot.day}s, ${slot.start}–${slot.end} at ${s.venue.name}, ${s.venue.address}.`,
          `Map: ${s.venue.mapUrl}`,
        ]
      : []),
    "",
    ...(s.firstSessionKit ? [s.firstSessionKit] : []),
    s.kitNotes,
    "",
    "See you on court,",
    "Battersea Cougars",
  ];
  return {
    to: [e.email],
    subject: "Thanks for getting in touch, Battersea Cougars",
    text: lines.join("\n"),
    replyTo: club,
  };
}
