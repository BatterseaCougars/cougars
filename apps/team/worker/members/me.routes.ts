// You: your own profile, next quarter's plan, and the role the app opens as (ADR 0024, ADR 0007).
import { ok, type Route } from "../api/api.route";
import { body } from "../api/api.http";
import { choosePlan, planNext, setEverydayRole, updateProfile } from "./members";

export const ME_ROUTES: Route[] = [
  {
    method: "PUT",
    path: /^\/api\/me$/,
    audit: false,
    action: "authenticated",
    changes: ["members"],
    // Your own phone, position and bio
    handle: async (c) => (await updateProfile(c.env.DB, c.memberId, await body(c.request)), ok()),
  },
  {
    method: "PUT",
    path: /^\/api\/me\/plan$/,
    audit: {
      event: "member.plan",
      subject: (c) => planNext(c.env.DB, c.memberId, c.today),
      about: (c) => ({ memberId: c.memberId }),
    },
    action: "authenticated",
    changes: ["members"],
    // { quarter: "2027-Q1", quarterly }: next quarter's plan, until it starts
    handle: async (c) => (await choosePlan(c.env.DB, c.memberId, await body(c.request), c.today, c.now), ok()),
  },
  {
    method: "PUT",
    path: /^\/api\/me\/everyday-role$/,
    audit: false,
    action: "authenticated",
    changes: ["everydayRole"],
    // { roleId: number | null }: the role the app opens as (ADR 0024)
    handle: async (c) => (await setEverydayRole(c.env.DB, c.memberId, await body(c.request), c.actions), ok()),
  },
];
