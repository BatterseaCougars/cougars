# 0099. Of anything personal, the bootstrap sends a member only their own

- **Status:** Accepted. Extends [0036](0036-api-security.md).
- **Date:** 2026-10-09

## Context

[0036](0036-api-security.md) stopped the bootstrap sending every member everyone's email, phone, payment reference
and rating. The security review of 2026-10-09 found what was left: every member still received who pays quarterly
(a payment status), every session's no-shows and walk-ins (the register), who said they're out of every event, every
member's roles and every role's actions (who the admins are and exactly what each role can do), and the phone or
email of every team that entered a tournament from outside the club. The screens showing these are admin screens;
the data was in every member's devtools.

The app isn't live. Dev's data becomes production's at launch ([0050](0050-schema-and-seed-until-launch.md)), so the
time to stop sending it is before anyone real signs in.

## Decision

Of anything personal, a member is sent **their own**, and everyone's only with the action that needs it:

| Field                            | Everyone's, with                                                                                                                       | Otherwise                                                                                                                        |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Member `quarterly`               | `manage:Member`                                                                                                                        | your own                                                                                                                         |
| Member `roles`                   | `manage:Member`, `manage:Role`, `impersonate:Member`                                                                                   | your own                                                                                                                         |
| `roles` (each role's actions)    | `manage:Member`, `manage:Role`, `impersonate:Member`                                                                                   | roles you could hold as you are: yours, and those that can do less (your everyday role's choices, [0037](0037-everyday-role.md)) |
| An event's `out`                 | runs events: `record:Attendance`, `update:Event`, `generate:Teams`, `publish:Teams`, `manage:Member`, `manage:Tournament`, `run:Draft` | your own                                                                                                                         |
| A session's `noShows`, `walkIns` | the same                                                                                                                               | your own                                                                                                                         |
| An entered team's `contact`      | `manage:Tournament`                                                                                                                    | empty                                                                                                                            |

Unchanged, because they're the point of the screen or already public: who's in and waiting (a sign-up list), a
member's name, position, bio, website name, Cougar flag and sessions played (all on the public website roster for
Cougars, and on the player card), and a closed draft's teams ([0070](0070-the-draft-is-for-its-captains.md)).

`impersonate:Member` gets everyone's roles because "view as a member" is still worked out in the browser
([0029](0029-view-as-a-member.md)) from their roles. If it moves to the server, that action drops out of the list.

## Consequences

- A plain member's devtools show the club's calendar, who's coming, and themselves. Nothing about anyone's payments,
  attendance record, permissions or contact details.
- Filtering is in the slices, so a change's reply (`changed`) is filtered exactly as the bootstrap is.
- `security.test.ts` holds each row of the table as a story: what a plain member sees, what they see of themselves,
  and what whoever runs the register sees.
- A screen built later for plain members that wants one of these fields has to argue for it here first.
