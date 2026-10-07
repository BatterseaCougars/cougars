-- Team app: how a member's name appears on the public website roster (ADR 0043), chosen on their profile: their full
-- name, first name, first name and initial, or a nickname. Null: first name and initial ("Adrian K.").
ALTER TABLE members ADD COLUMN web_name TEXT;
