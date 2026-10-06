// The email the club gets for each "Try a session" enquiry (pages/api/join.ts). Reply-To is the enquirer, so the
// club answers by replying. Sent through shared/email.ts, which keeps it away from real inboxes outside production.
import type { Mail } from "../../../../../shared/email";
import { EXPERIENCE, type Enquiry } from "./enquiries";

export function enquiryMail(e: Enquiry, id: number, club: string): Mail {
  const rows: [string, string | null][] = [
    ["Name", e.name],
    ["Email", e.email],
    ["Phone", e.phone],
    ["Hockey", e.experience ? EXPERIENCE[e.experience] : null],
    ["From page", e.source],
  ];
  const lines = [
    `${e.name} wants to try a session.`,
    "",
    ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    ...(e.message ? ["", "Message:", e.message] : []),
    "",
    "Reply to this email to answer them directly.",
    `Enquiry #${id}`,
  ];
  return { to: [club], subject: `New enquiry: ${e.name}`, text: lines.join("\n"), replyTo: e.email };
}
