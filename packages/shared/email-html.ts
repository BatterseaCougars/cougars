// The club's branded email frame (ADR 0027, colours from ADR 0084), for the team app's sign-in code and the website's
// enquiry email. Email HTML is tables and inline styles, and no images, so it looks the same with images blocked.
// Anything a person typed goes through escapeHtml before it reaches the page.

export const EMAIL = {
  carbon: "#0e0d0b",
  panel: "#191715",
  raised: "#24211e",
  bone: "#efe8e1",
  muted: "#a6a09a",
  red: "#e5131f",
  yellow: "#ffd60a",
  display: "Anton, Impact, 'Arial Narrow Bold', 'Helvetica Neue', Arial, sans-serif",
  body: "'Inter Tight', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
  mono: "'SF Mono', Menlo, Consolas, 'Courier New', monospace",
} as const;

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Text made safe to put in HTML, in an element or an attribute. */
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);

/**
 * A whole email page: the Cougars masthead, `panel` (HTML) in the red-topped panel, then `footer` (HTML) in small
 * print. `preheader` is the line inbox lists show after the subject; `title` and `preheader` are plain text.
 */
export function emailPage({
  title,
  preheader,
  panel,
  footer = "",
}: {
  title: string;
  preheader: string;
  panel: string;
  footer?: string;
}): string {
  const { carbon, panel: panelBg, muted, red, display, body } = EMAIL;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${carbon};">
<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${carbon};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
  <tr><td style="padding:0 4px 20px;font-family:${display};font-size:34px;line-height:1;font-style:italic;font-weight:900;letter-spacing:1px;color:${red};text-transform:uppercase;">
    Cougars
    <div style="font-family:${body};font-size:12px;font-style:normal;font-weight:600;letter-spacing:3px;color:${muted};padding-top:6px;">BATTERSEA ROLLER HOCKEY</div>
  </td></tr>
  <tr><td style="background:${panelBg};border-top:4px solid ${red};border-radius:10px;padding:32px 24px;">
${panel}
  </td></tr>${
    footer
      ? `
  <tr><td style="padding:20px 4px 0;font-family:${body};font-size:13px;line-height:1.5;color:${muted};">
    ${footer}
  </td></tr>`
      : ""
  }
</table>
</td></tr>
</table>
</body>
</html>`;
}
