// One-off: create the club-facts singletons (Club, Fridays, Pub, Team, Kumite) from the website's defaults
// (apps/web/src/lib/sanity/fallback.ts). Safe to re-run: it never overwrites an existing document.
// Seed the dev project first, then the live one (docs/adr/0010-environments-and-deploys.md):
//   npm run seed -w @cougars/studio
//   SANITY_STUDIO_SITE_ENV=production npm run seed -w @cougars/studio
import { getCliClient } from "sanity/cli";
import {
  FALLBACK_CLUB,
  FALLBACK_FRIDAYS,
  FALLBACK_KUMITE,
  FALLBACK_PUB,
  FALLBACK_TEAM,
} from "../web/src/lib/sanity/fallback";

const client = getCliClient({ apiVersion: "2025-01-01" });

/** Sanity stores "no value" as a missing field, not null. */
const defined = <T extends object>(obj: T) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined));

const docs = [
  { _id: "club", _type: "club", ...defined({ ...FALLBACK_CLUB, socials: defined(FALLBACK_CLUB.socials) }) },
  {
    _id: "fridays",
    _type: "fridays",
    ...defined({
      ...FALLBACK_FRIDAYS,
      training: FALLBACK_FRIDAYS.training.map((slot, i) => ({ _key: `slot${i}`, _type: "slot", ...slot })),
    }),
  },
  { _id: "pub", _type: "pub", ...defined(FALLBACK_PUB) },
  { _id: "team", _type: "team", ...defined(FALLBACK_TEAM) },
  { _id: "kumite", _type: "kumite", ...defined(FALLBACK_KUMITE) },
];

const tx = client.transaction();
for (const doc of docs) tx.createIfNotExists(doc);
await tx.commit();
console.log(
  `Seeded ${docs.map((d) => d._id).join(", ")} in ${client.config().projectId}/${client.config().dataset} (existing ones left unchanged).`,
);
