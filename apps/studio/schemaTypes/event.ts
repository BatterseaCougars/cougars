import { defineField, defineType } from "sanity";
import { bodyField, imageField, slugField } from "./shared";

export const event = defineType({
  name: "event",
  title: "Event",
  type: "document",
  fields: [
    defineField({
      name: "title",
      type: "string",
      description: "e.g. “Summer social” or “Cougars Kumite: Winter”.",
      validation: (r) => r.required(),
    }),
    slugField(),
    defineField({
      name: "type",
      type: "string",
      description: "“Cougars Kumite” events also appear on the Kumite page and its poster.",
      options: {
        list: [
          { title: "Cougars Kumite", value: "kumite" },
          { title: "Tournament", value: "tournament" },
          { title: "Social", value: "social" },
          { title: "Special training", value: "training" },
        ],
        layout: "radio",
      },
      initialValue: "social",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "startsAt",
      title: "Starts",
      type: "datetime",
      description: "London time.",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "endsAt",
      title: "Ends",
      type: "datetime",
      description: "Optional. The event stays under “Coming up” until it ends.",
      validation: (r) =>
        r.custom((end, ctx) => {
          const start = (ctx.document as { startsAt?: string })?.startsAt;
          return !end || !start || end > start ? true : "Must be after the start";
        }),
    }),
    defineField({
      name: "location",
      type: "string",
      description: "Where it happens. A venue name is enough.",
      initialValue: "Battersea Sports Centre",
    }),
    defineField({
      name: "summary",
      title: "Short summary",
      type: "text",
      rows: 2,
      description: "One or two sentences, shown in event lists. 200 characters at most.",
      validation: (r) => r.max(200),
    }),
    imageField("cover", "Main image", { description: "Optional. Shown at the top of the event's page." }),
    bodyField,
    defineField({
      name: "ctaLabel",
      title: "Button text",
      type: "string",
      description: "Optional, e.g. “Sign up”. Needs a button link too.",
    }),
    defineField({
      name: "ctaUrl",
      title: "Button link",
      type: "url",
      description: "Where the button goes, e.g. a Google Form.",
      validation: (r) => r.uri({ allowRelative: true }),
    }),
  ],
  orderings: [{ title: "Date", name: "startsAt", by: [{ field: "startsAt", direction: "desc" }] }],
  preview: {
    select: { title: "title", startsAt: "startsAt", media: "cover", type: "type" },
    prepare: ({ title, startsAt, media, type }) => ({
      title,
      media,
      subtitle: `${type === "kumite" ? "🥋 Kumite · " : ""}${startsAt ? new Date(startsAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "No date"}`,
    }),
  },
});
