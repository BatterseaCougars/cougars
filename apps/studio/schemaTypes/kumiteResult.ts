import { defineField, defineType } from "sanity";

// One Kumite's winners. The newest by date is the reigning champion on the honours board. Plain fields only, so
// the team app can create these through the Sanity API when a Kumite finishes.
export const kumiteResult = defineType({
  name: "kumiteResult",
  title: "Kumite result",
  type: "document",
  fields: [
    defineField({
      name: "season",
      title: "Season",
      type: "string",
      description: "The name shown on the honours board, e.g. “Winter 2026”.",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "date",
      title: "Date",
      type: "date",
      description: "The day it was played. The newest result is shown as the reigning champions.",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "champions",
      title: "Winning team",
      type: "string",
      description: "The team name, or the players' names.",
    }),
    defineField({ name: "topScorer", title: "Top scorer", type: "string", description: "Optional." }),
    defineField({ name: "bestGoalie", title: "Best goalie", type: "string", description: "Optional." }),
    defineField({
      name: "event",
      title: "Event",
      type: "reference",
      to: [{ type: "event" }],
      options: { filter: 'type == "kumite"' },
      description: "Optional. The Kumite event this result belongs to.",
    }),
  ],
  orderings: [{ title: "Newest", name: "date", by: [{ field: "date", direction: "desc" }] }],
  preview: { select: { title: "season", subtitle: "champions" } },
});
