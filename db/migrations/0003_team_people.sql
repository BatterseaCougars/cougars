-- Team app: members and roles (ADR 0024, docs/team-app-data-model.md). Sign-in's tables (login_challenges,
-- auth_sessions) and the audit log come with sign-in. Members themselves are never seeded here: this repo is
-- public, so the roster comes from Bitwarden (db/seed/README.md).

CREATE TABLE members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  -- Null until known; sign-in needs it. Unique where set.
  email TEXT UNIQUE,
  phone TEXT,
  -- F (forward), D (defence) or G (goalie)
  position TEXT NOT NULL DEFAULT 'F',
  -- 0–100, for balancing teams; only read:Rating sees it
  rating INTEGER NOT NULL DEFAULT 50,
  cougar INTEGER NOT NULL DEFAULT 0,
  photo TEXT,
  -- pending (asked to join), active, inactive
  status TEXT NOT NULL DEFAULT 'active',
  -- The bank-transfer reference, COU-0001; set from the id once the row exists
  payment_reference TEXT UNIQUE,
  joined_on TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX members_status ON members (status);

CREATE TABLE roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  -- 1: can't be deleted or have its actions changed (Admin)
  is_system INTEGER NOT NULL DEFAULT 0
);

-- A role's actions, from the catalog in team/app/src/access/actions.ts. One no longer in the catalog is ignored.
CREATE TABLE role_actions (
  role_id INTEGER NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  PRIMARY KEY (role_id, action)
);

CREATE TABLE member_roles (
  member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  PRIMARY KEY (member_id, role_id)
);
CREATE INDEX member_roles_role ON member_roles (role_id);

-- The starting roles; admins change them in Settings → Roles.
INSERT INTO roles (name, description, is_system) VALUES
  ('Member', 'Everyone approved', 0),
  ('Contributor', 'Uploads photos and videos', 0),
  ('Door', 'Runs the register on Fridays', 0),
  ('Admin', 'Runs the club', 1);

INSERT INTO role_actions (role_id, action)
SELECT id, a.action FROM roles, (SELECT 'read:Event' AS action UNION ALL SELECT 'signup:Event') a
WHERE name IN ('Member', 'Contributor', 'Door');
INSERT INTO role_actions (role_id, action)
SELECT id, a.action FROM roles, (SELECT 'upload:Photo' AS action UNION ALL SELECT 'upload:Video') a
WHERE name = 'Contributor';
INSERT INTO role_actions (role_id, action) SELECT id, 'record:Attendance' FROM roles WHERE name = 'Door';
INSERT INTO role_actions (role_id, action) SELECT id, 'manage:all' FROM roles WHERE name = 'Admin';
