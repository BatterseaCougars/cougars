-- Team app: a member's everyday role (ADR 0037). Someone with more than Member (an admin) can choose to run the app
-- day to day as a lesser role, so ratings and admin screens don't show while they hand their phone round, and switch
-- up to their full role when they need it. Null: they use their full role. A role that's deleted drops back to null.
ALTER TABLE members ADD COLUMN everyday_role_id INTEGER REFERENCES roles (id) ON DELETE SET NULL;
