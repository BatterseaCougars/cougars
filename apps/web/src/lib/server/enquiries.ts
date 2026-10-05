import { run } from "../../../../../shared/d1";

export const EXPERIENCE = {
  never: "Never played",
  some: "Skated / played a bit",
  regular: "Play regularly",
} as const;
export type Experience = keyof typeof EXPERIENCE;

export interface Enquiry {
  name: string;
  email: string;
  phone: string | null;
  experience: Experience | null;
  message: string | null;
  source: string | null;
}

export type ParseResult = { ok: true; enquiry: Enquiry } | { ok: false; errors: Record<string, string> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(form: FormData, key: string, max: number): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function parseEnquiry(form: FormData): ParseResult {
  const name = text(form, "name", 100);
  const email = text(form, "email", 200).toLowerCase();
  const phone = text(form, "phone", 40);
  const experience = text(form, "experience", 20);
  const message = text(form, "message", 2000);
  const source = text(form, "source", 200);

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Please tell us your name.";
  if (!EMAIL_RE.test(email)) errors.email = "Please enter a valid email address.";
  if (experience && !(experience in EXPERIENCE)) errors.experience = "Please pick an option.";
  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    enquiry: {
      name,
      email,
      phone: phone || null,
      experience: (experience as Experience) || null,
      message: message || null,
      source: source || null,
    },
  };
}

/** Bots fill every field; humans never see the hidden `website` field. */
export function isSpam(form: FormData): boolean {
  return Boolean(text(form, "website", 200));
}

export async function saveEnquiry(db: D1Database, e: Enquiry): Promise<number> {
  const result = await run(
    db,
    `INSERT INTO enquiries (name, email, phone, experience, message, source)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [e.name, e.email, e.phone, e.experience, e.message, e.source],
  );
  return Number(result.meta.last_row_id);
}
