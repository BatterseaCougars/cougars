// One-off: create the "Club details & homepage" document from the old Wix copy.
// Safe to re-run: it never overwrites an existing document.
//   npm run seed -w @cougars/studio
import { getCliClient } from "sanity/cli";
import { FALLBACK_SETTINGS } from "../web/src/lib/sanity/fallback";

const client = getCliClient({ apiVersion: "2025-01-01" });

const { heroImage: _ignored, training, ...rest } = FALLBACK_SETTINGS;
const doc = {
  _id: "siteSettings",
  _type: "siteSettings",
  ...rest,
  training: training.map((slot, i) => ({ _key: `slot${i}`, _type: "slot", ...slot })),
};

if (await client.getDocument("siteSettings")) {
  console.log("siteSettings already exists; left unchanged.");
} else {
  await client.create(doc);
  console.log("Seeded and published siteSettings.");
}
