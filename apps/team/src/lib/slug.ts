/** "Sunday Skills" → "sunday-skills", made unique against the slugs already taken. */
export function slugify(name: string, taken: string[] = []): string {
  const base =
    name
      .toLowerCase()
      .replace(/^the\s+/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "item";
  let slug = base;
  for (let n = 2; taken.includes(slug); n++) slug = `${base}-${n}`;
  return slug;
}
