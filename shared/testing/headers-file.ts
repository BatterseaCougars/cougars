// Reads a Cloudflare `_headers` file (static assets) the way tests compare it with the headers a Worker sets: a map
// of path pattern to lower-cased header names and values. Comments and blank lines are skipped.
export function parseHeadersFile(text: string): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  let current: Record<string, string> | null = null;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      current = {};
      out[line.trim()] = current;
      continue;
    }
    if (!current) throw new Error(`_headers: a header before any path: ${line}`);
    const i = line.indexOf(":");
    if (i < 0) throw new Error(`_headers: not a header: ${line}`);
    current[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return out;
}
