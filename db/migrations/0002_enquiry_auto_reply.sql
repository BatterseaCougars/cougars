-- Turnstile and the auto-reply (docs/adr/0028-turnstile-and-auto-reply.md).
-- verified: 1 if Cloudflare Turnstile said a person sent the form (only they get an auto-reply).
-- auto_replied_at: when the auto-reply went out; the caps (per day, per address per week) count these.
ALTER TABLE enquiries ADD COLUMN verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE enquiries ADD COLUMN auto_replied_at TEXT;

CREATE INDEX enquiries_auto_replied_at ON enquiries (auto_replied_at);
CREATE INDEX enquiries_email ON enquiries (email);
