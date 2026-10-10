// The sign-in code email (ADR 0023): the code first and huge, in the club's frame (packages/shared/email-html.ts).
// The text version says the same.
import { EMAIL, emailPage } from "@cougars/shared/email-html";

export function signInEmail(
  code: string,
  minutes: number,
): { subject: string; text: string; html: string; secrets: string[] } {
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  const { carbon, bone, muted, yellow, body, mono } = EMAIL;
  return {
    // The code, as written and as shown: never in a log (#74)
    secrets: [code, spaced],
    subject: `Your Cougars sign-in code: ${code}`,
    text: [
      `Your code is ${code}`,
      "",
      `Type it into the Cougars app, where you asked for it. It works for ${minutes} minutes.`,
      "",
      "If you didn't ask, ignore this email: nobody can use the code without your phone or computer.",
      "",
      "Battersea Cougars",
    ].join("\n"),
    html: emailPage({
      title: "Your Cougars sign-in code",
      preheader: `Your code is ${code}. It works for ${minutes} minutes.`,
      panel: `    <div style="text-align:center;">
    <div style="font-family:${body};font-size:15px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${muted};">Your sign-in code</div>
    <div style="margin:20px auto;display:inline-block;background:${yellow};border-radius:10px;padding:16px 24px;font-family:${mono};font-size:52px;line-height:1;font-weight:800;letter-spacing:6px;color:${carbon};white-space:nowrap;">${spaced}</div>
    <div style="font-family:${body};font-size:16px;line-height:1.5;color:${bone};">Type it into the Cougars app, where you asked for it.<br>It works for <strong>${minutes} minutes</strong>.</div>
    </div>`,
      footer: "If you didn't ask, ignore this email: nobody can use the code without your phone or computer.",
    }),
  };
}
