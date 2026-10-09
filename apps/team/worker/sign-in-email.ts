// The sign-in code email (ADR 0023): the code first and huge, in the club's colours (ADR 0084). Email HTML is
// tables and inline styles, and no images, so it looks the same with images blocked. The text version says the same.

const CARBON = "#0e0d0b";
const PANEL = "#191715";
const BONE = "#efe8e1";
const MUTED = "#a6a09a";
const RED = "#e5131f";
const YELLOW = "#ffd60a";
const DISPLAY = "Anton, Impact, 'Arial Narrow Bold', 'Helvetica Neue', Arial, sans-serif";
const BODY = "'Inter Tight', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'SF Mono', Menlo, Consolas, 'Courier New', monospace";

export function signInEmail(code: string, minutes: number): { subject: string; text: string; html: string } {
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  return {
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
    html: `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Your Cougars sign-in code</title>
</head>
<body style="margin:0;padding:0;background:${CARBON};">
<div style="display:none;max-height:0;overflow:hidden;">Your code is ${code}. It works for ${minutes} minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CARBON};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
  <tr><td style="padding:0 4px 20px;font-family:${DISPLAY};font-size:34px;line-height:1;font-style:italic;font-weight:900;letter-spacing:1px;color:${RED};text-transform:uppercase;">
    Cougars
    <div style="font-family:${BODY};font-size:12px;font-style:normal;font-weight:600;letter-spacing:3px;color:${MUTED};padding-top:6px;">BATTERSEA ROLLER HOCKEY</div>
  </td></tr>
  <tr><td style="background:${PANEL};border-top:4px solid ${RED};border-radius:10px;padding:32px 24px;text-align:center;">
    <div style="font-family:${BODY};font-size:15px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${MUTED};">Your sign-in code</div>
    <div style="margin:20px auto;display:inline-block;background:${YELLOW};border-radius:10px;padding:16px 24px;font-family:${MONO};font-size:52px;line-height:1;font-weight:800;letter-spacing:6px;color:${CARBON};white-space:nowrap;">${spaced}</div>
    <div style="font-family:${BODY};font-size:16px;line-height:1.5;color:${BONE};">Type it into the Cougars app, where you asked for it.<br>It works for <strong>${minutes} minutes</strong>.</div>
  </td></tr>
  <tr><td style="padding:20px 4px 0;font-family:${BODY};font-size:13px;line-height:1.5;color:${MUTED};">
    If you didn't ask, ignore this email: nobody can use the code without your phone or computer.
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  };
}
