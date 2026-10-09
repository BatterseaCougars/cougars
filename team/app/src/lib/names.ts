// The name a member goes by (ADR 0085): the one they chose on their profile (a nickname, their first name and initial,
// their full name), everywhere the app shows them, as on the website. Their full name stays for sign-in, payment
// references and an admin's views, and search finds either.

interface Named {
  name: string;
  webName?: string | null;
}

/** What to call them: their chosen name, or their full name if they haven't chosen one. */
export const goesBy = (p: Named) => p.webName?.trim() || p.name;

/** The short form: on their trading card, in "Team …", greetings and lists of first names. A chosen name whole, else their first name. */
export const shortName = (p: Named) => p.webName?.trim() || p.name.trim().split(/\s+/)[0];

/** Search: either name, any part of it. */
export const matchesName = (p: Named, query: string) => {
  const q = query.trim().toLowerCase();
  return !q || p.name.toLowerCase().includes(q) || !!p.webName?.toLowerCase().includes(q);
};

/** For a lookup that may find no one: their name, or nothing. */
export const goesByOf = (p: Named | null | undefined) => (p ? goesBy(p) : "");
export const shortNameOf = (p: Named | null | undefined) => (p ? shortName(p) : "");
