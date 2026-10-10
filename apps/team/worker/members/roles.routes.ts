// Roles (ADR 0024): what each role can do.
import { id, ok, type Route } from "../api/api.route";
import { body, json } from "../api/api.http";
import { createRole, roleSummary, updateRole } from "./members";

export const ROLES_ROUTES: Route[] = [
  {
    method: "POST",
    path: /^\/api\/roles$/,
    audit: {
      event: "role.created",
      subject: async (c, reply) => (reply ? roleSummary(c.env.DB, reply.id as number) : null),
      about: (_, reply) => ({ roleId: reply.id }),
    },
    action: "manage:Role",
    changes: ["roles"],
    handle: async (c) => json({ id: await createRole(c.env.DB, await body(c.request), c) }, 201),
  },
  {
    method: "PUT",
    path: /^\/api\/roles\/(\d+)$/,
    audit: {
      event: "role.updated",
      subject: (c) => roleSummary(c.env.DB, id(c)),
      about: (c) => ({ roleId: id(c) }),
    },
    action: "manage:Role",
    changes: ["roles", "members"],
    handle: async (c) => (await updateRole(c.env.DB, id(c), await body(c.request), c), ok()),
  },
];
