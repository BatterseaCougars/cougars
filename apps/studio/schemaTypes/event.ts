import { defineField, defineType } from "sanity";
import { bodyField, imageField, slugField } from "./shared";

export const event = defineType({
  name: "event",
  title: "Event",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    slugField(),
    defineField({
      name: "type",
      type: "string",
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
    defineField({ name: "startsAt", title: "Starts", type: "datetime", validation: (r) => r.required() }),
    defineField({
      name: "endsAt",
      title: "Ends",
      type: "datetime",
      validation: (r) =>
        r.custom((end, ctx) => {
          const start = (ctx.document as { startsAt?: string })?.startsAt;
          return !end || !start || end > start ? true : "Must be after the start";
        }),
    }),
    defineField({ name: "location", type: "string", initialValue: "Battersea Sports Centre" }),
    defineField({ name: "summary", title: "Short summary", type: "text", rows: 2, validation: (r) => r.max(200) }),
    imageField("cover", "Main image"),
    bodyField,
    defineField({ name: "ctaLabel", title: "Button text", type: "string", description: "e.g. “Sign up”. Optional." }),
    defineField({
      name: "ctaUrl",
      title: "Button link",
      type: "url",
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
