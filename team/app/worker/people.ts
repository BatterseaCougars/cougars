// Members and roles (ADR 0024). A member's permissions are the union of their roles' actions; actions no longer in
// the catalog are ignored.
import { all, first, run } from "../../../shared/d1";
import { ACTIONS, type Action } from "../src/access/actions";
import { HttpError, bool, int, oneOf, text } from "./http";

export interface MemberJson {
  id: number;
  name: string;
  email: string | null;
  position: "F" | "D" | "G";
  /** Only for those who may see ratings (read:Rating); 0 otherwise. */
  rating: number;
  cougar: boolean;
  status: "pending" | "active" | "inactive";
  paymentReference: string | null;
  /** Highest first: Admin, then newer roles, Member last. */
  roles: string[];
}

export interface RoleJson {
  id: number;
  name: string;
  description: string;
  system: boolean;
  actions: Action[];
}

const isAction = (a: string): a is Action => a in ACTIONS;

export async function listRoles(db: D1Database): Promise<RoleJson[]> {
  const roles = await all<{ id: number; name: string; description: string; is_system: number }>(
    db,
    "SELECT id, name, description, is_system FROM roles ORDER BY id",
  );
  const actions = await all<{ role_id: number; action: string }>(db, "SELECT role_id, action FROM role_actions");
  return roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    system: Boolean(r.is_system),
    actions: actions.filter((a) => a.role_id === r.id && isAction(a.action)).map((a) => a.action as Action),
  }));
}

export async function listMembers(db: D1Database, { ratings }: { ratings: boolean }): Promise<MemberJson[]> {
  const rows = await all<{
    id: number;
    name: string;
    email: string | null;
    position: "F" | "D" | "G";
    rating: number;
    cougar: number;
    status: MemberJson["status"];
    payment_reference: string | null;
    roles: string | null;
  }>(
    db,
    `SELECT m.id, m.name, m.email, m.position, m.rating, m.cougar, m.status, m.payment_reference,
            (SELECT group_concat(name) FROM (SELECT r.name FROM member_roles mr JOIN roles r ON r.id = mr.role_id
              WHERE mr.member_id = m.id ORDER BY r.is_system DESC, r.id DESC)) roles
     FROM members m ORDER BY m.name COLLATE NOCASE`,
  );
  return rows.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    position: m.position,
    rating: ratings ? m.rating : 0,
    cougar: Boolean(m.cougar),
    status: m.status,
    paymentReference: m.payment_reference,
    roles: m.roles ? m.roles.split(",") : [],
  }));
}

/** What a member may do: their roles' actions. */
export async function actionsOf(db: D1Database, memberId: number): Promise<Set<Action>> {
  const rows = await all<{ action: string }>(
    db,
    `SELECT DISTINCT ra.action FROM member_roles mr JOIN role_actions ra ON ra.role_id = mr.role_id
     WHERE mr.member_id = ?`,
    [memberId],
  );
  return new Set(rows.map((r) => r.action).filter(isAction));
}

/** The first admin: the local stand-in for whoever is signed in, until sign-in arrives. */
export async function firstAdmin(db: D1Database): Promise<number | null> {
  const row = await first<{ id: number }>(
    db,
    `SELECT m.id FROM members m JOIN member_roles mr ON mr.member_id = m.id JOIN roles r ON r.id = mr.role_id
     WHERE r.name = 'Admin' AND m.status = 'active' ORDER BY m.id LIMIT 1`,
  );
  return row?.id ?? null;
}

/** An admin edits a member: position, rating, cougar, status and roles. */
export async function updateMember(db: D1Database, id: number, o: Record<string, unknown>) {
  const existing = await first<{ id: number }>(db, "SELECT id FROM members WHERE id = ?", [id]);
  if (!existing) throw new HttpError(404, "No such member.");
  const name = text(o, "name");
  const position = oneOf(o, "position", ["F", "D", "G"] as const);
  const rating = int(o, "rating", { max: 100 });
  const cougar = bool(o, "cougar");
  const status = oneOf(o, "status", ["pending", "active", "inactive"] as const);
  const roles = o.roles;
  if (!Array.isArray(roles) || roles.some((r) => typeof r !== "string"))
    throw new HttpError(400, "roles should be a list.");
  const known = await all<{ id: number; name: string }>(db, "SELECT id, name FROM roles");
  const ids = roles.map((r) => {
    const role = known.find((k) => k.name === r);
    if (!role) throw new HttpError(400, `No role called ${r}.`);
    return role.id;
  });
  // Never leave the club without an admin
  const admin = known.find((k) => k.name === "Admin");
  if (admin && !ids.includes(admin.id)) {
    const others = await first<{ n: number }>(
      db,
      `SELECT count(*) n FROM member_roles mr JOIN members m ON m.id = mr.member_id
       WHERE mr.role_id = ? AND mr.member_id != ? AND m.status = 'active'`,
      [admin.id, id],
    );
    const was = await first<{ n: number }>(
      db,
      "SELECT count(*) n FROM member_roles WHERE role_id = ? AND member_id = ?",
      [admin.id, id],
    );
    if (was?.n && !others?.n) throw new HttpError(409, "That's the last admin. Make someone else an admin first.");
  }
  await run(db, "UPDATE members SET name = ?, position = ?, rating = ?, cougar = ?, status = ? WHERE id = ?", [
    name,
    position,
    rating,
    cougar ? 1 : 0,
    status,
    id,
  ]);
  await run(db, "DELETE FROM member_roles WHERE member_id = ?", [id]);
  for (const roleId of ids) await run(db, "INSERT INTO member_roles (member_id, role_id) VALUES (?, ?)", [id, roleId]);
}

function roleFields(o: Record<string, unknown>) {
  const name = text(o, "name", { max: 40 });
  const description = text(o, "description", { optional: true });
  const actions = o.actions;
  if (!Array.isArray(actions) || actions.some((a) => typeof a !== "string" || !isAction(a)))
    throw new HttpError(400, "actions should be a list of known actions.");
  return { name, description, actions: [...new Set(actions as Action[])] };
}

export async function createRole(db: D1Database, o: Record<string, unknown>): Promise<number> {
  const f = roleFields(o);
  if (await first(db, "SELECT 1 FROM roles WHERE name = ?", [f.name])) throw new HttpError(409, "That name is taken.");
  const res = await run(db, "INSERT INTO roles (name, description, is_system) VALUES (?, ?, 0)", [
    f.name,
    f.description,
  ]);
  const id = Number(res.meta.last_row_id);
  for (const a of f.actions) await run(db, "INSERT INTO role_actions (role_id, action) VALUES (?, ?)", [id, a]);
  return id;
}

export async function updateRole(db: D1Database, id: number, o: Record<string, unknown>) {
  const role = await first<{ is_system: number }>(db, "SELECT is_system FROM roles WHERE id = ?", [id]);
  if (!role) throw new HttpError(404, "No such role.");
  if (role.is_system) throw new HttpError(409, "The Admin role can't be changed.");
  const f = roleFields(o);
  if (await first(db, "SELECT 1 FROM roles WHERE name = ? AND id != ?", [f.name, id]))
    throw new HttpError(409, "That name is taken.");
  await run(db, "UPDATE roles SET name = ?, description = ? WHERE id = ?", [f.name, f.description, id]);
  await run(db, "DELETE FROM role_actions WHERE role_id = ?", [id]);
  for (const a of f.actions) await run(db, "INSERT INTO role_actions (role_id, action) VALUES (?, ?)", [id, a]);
}
