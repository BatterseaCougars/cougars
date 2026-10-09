// The email the club gets for each "Try a session" enquiry (pages/api/join.ts). Reply-To is the enquirer, so the
// club answers by replying. Sent through packages/shared/email.ts, which keeps it away from real inboxes outside production.
// The HTML version is in the club's frame (packages/shared/email-html.ts); everything the enquirer typed is escaped.
import type { Mail } from "@cougars/shared/email";
import { EMAIL, emailPage, escapeHtml as h } from "@cougars/shared/email-html";
import { greetingName } from "./auto-reply";
import { EXPERIENCE, type Enquiry } from "./enquiries";

/** `autoReply`: what happened to the auto-reply, so the club knows whether the person has heard back. */
export function enquiryMail(e: Enquiry, id: number, club: string, autoReply = ""): Mail {
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
    ...(autoReply ? [autoReply] : []),
    "Reply to this email to answer them directly.",
    `Enquiry #${id}`,
  ];
  return {
    to: [club],
    subject: `New enquiry: ${e.name}`,
    text: lines.join("\n"),
    html: enquiryHtml(e, id, autoReply),
    replyTo: e.email,
  };
}

function enquiryHtml(e: Enquiry, id: number, autoReply: string): string {
  const { carbon, raised, bone, muted, yellow, display, body } = EMAIL;
  const link = (href: string, text: string) =>
    `<a href="${h(href)}" style="color:${bone};text-decoration:underline;">${h(text)}</a>`;
  const details: [string, string][] = [
    ["Email", link(`mailto:${e.email}`, e.email)],
    ...(e.phone ? [["Phone", link(`tel:${e.phone.replace(/[^\d+]/g, "")}`, e.phone)] as [string, string]] : []),
    ...(e.experience ? [["Played before", h(EXPERIENCE[e.experience])] as [string, string]] : []),
  ];
  const label = `font-family:${body};font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${muted};`;
  const value = `font-family:${body};font-size:16px;line-height:1.5;color:${bone};`;
  const reply = `mailto:${e.email}?subject=${encodeURIComponent("Battersea Cougars: trying a session")}`;
  return emailPage({
    title: `New enquiry: ${e.name}`,
    preheader: `${e.name} wants to try a session.${e.message ? ` “${e.message.slice(0, 80)}”` : ""}`,
    panel: `    <div style="${label}">New enquiry · try a session</div>
    <div style="padding:8px 0 24px;font-family:${display};font-size:32px;line-height:1.1;text-transform:uppercase;color:${bone};word-break:break-word;">${h(e.name)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${details.map(([k, v]) => `      <tr><td style="padding:0 0 14px;"><div style="${label}">${k}</div><div style="${value}word-break:break-word;">${v}</div></td></tr>`).join("\n")}
    </table>${
      e.message
        ? `
    <div style="${label}padding-top:6px;">Message</div>
    <div style="margin-top:8px;background:${raised};border-radius:8px;padding:14px 16px;${value}word-break:break-word;">${h(e.message).replace(/\r?\n/g, "<br>")}</div>`
        : ""
    }${
      autoReply
        ? `
    <div style="padding-top:20px;font-family:${body};font-size:14px;line-height:1.5;color:${muted};">${h(autoReply)}</div>`
        : ""
    }
    <div style="padding-top:24px;"><a href="${h(reply)}" style="display:inline-block;background:${yellow};color:${carbon};border-radius:8px;padding:12px 20px;font-family:${body};font-size:16px;font-weight:700;text-decoration:none;">Reply to ${h(greetingName(e.name) === "there" ? "them" : greetingName(e.name))}</a></div>`,
    footer: `Or just reply to this email: it goes straight to them.<br>Enquiry #${id}${e.source ? ` · from ${h(e.source)}` : ""}`,
  });
}
