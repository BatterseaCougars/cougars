// One-off: copy the old "Club details & homepage" document (siteSettings) into the club-facts singletons
// (docs/adr/0014-sanity-public-content.md). Its Kumite honours list isn't copied: results live in the team app (0100).
// Page wording (headline, about text) moved into the website code and is not copied.
//
// It never overwrites: documents that already exist are left alone. Without --commit it only prints the plan.
// The dev project unless SANITY_STUDIO_SITE_ENV=production (docs/adr/0010-environments-and-deploys.md):
//   npm run migrate-settings -w @cougars/studio              # dry run
//   npm run migrate-settings -w @cougars/studio -- --commit  # write
// Then check the results in the Studio, and delete siteSettings by hand once the site looks right.
import { getCliClient } from "sanity/cli";

const client = getCliClient({ apiVersion: "2025-01-01" });
const commit = process.argv.includes("--commit");

const old = await client.getDocument("siteSettings");
if (!old) {
  console.log(
    `No siteSettings document in ${client.config().projectId}/${client.config().dataset}: nothing to migrate.`,
  );
  process.exit(0);
}

/** Only the fields that have a value, so empty ones stay empty in the new documents. */
const pick = (keys: string[], from: Record<string, unknown> = old) =>
  Object.fromEntries(keys.filter((k) => from[k] !== undefined && from[k] !== null).map((k) => [k, from[k]]));

// The old kit text mixed the kit rules with the first-session offer. Sentences about the first session move to
// the new "Kit for first-timers" field, which switches the site's "spare kit to borrow" lines on.
const sentences: string[] = String(old.kitNotes ?? "").match(/[^.!?]+[.!?]*/g) ?? [];
const isFirstSession = (s: string) => /first (session|time|visit|night)/i.test(s);
const kitNotes = sentences
  .filter((s) => !isFirstSession(s))
  .join("")
  .trim();
const firstSessionKit = sentences.filter(isFirstSession).join("").trim();

const kumiteOld = (old.kumite ?? {}) as Record<string, unknown>;
const docs: Record<string, unknown>[] = [
  { _id: "club", _type: "club", ...pick(["founded", "contactEmail", "socials", "heroImage"]) },
  {
    _id: "fridays",
    _type: "fridays",
    ...pick(["training", "venue", "feesText"]),
    ...(kitNotes ? { kitNotes } : {}),
    ...(firstSessionKit ? { firstSessionKit } : {}),
  },
  { _id: "pub", _type: "pub", ...pick(["name", "about", "mapUrl"], (old.pub ?? {}) as Record<string, unknown>) },
  { _id: "team", _type: "team", ...pick(["intro", "league", "photo"], (old.team ?? {}) as Record<string, unknown>) },
  { _id: "kumite", _type: "kumite", ...pick(["intro", "format", "awards"], kumiteOld) },
];

console.log(
  `${commit ? "Creating" : "Would create"} in ${client.config().projectId}/${client.config().dataset} (existing documents are kept):`,
);
for (const d of docs)
  console.log(
    `  ${d._id}: ${
      Object.keys(d)
        .filter((k) => !k.startsWith("_"))
        .join(", ") || "(empty)"
    }`,
  );
if (firstSessionKit) console.log(`  "Kit for first-timers" set to: ${firstSessionKit}`);
else console.log('  No first-session kit sentence found: "Kit for first-timers" stays empty.');

if (commit) {
  const tx = client.transaction();
  for (const d of docs) tx.createIfNotExists(d as { _id: string; _type: string });
  await tx.commit();
  console.log("Done. Check the Studio, then delete siteSettings once the site looks right.");
} else {
  console.log("Dry run. Add -- --commit to write.");
}
