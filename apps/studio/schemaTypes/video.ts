import { defineField, defineType } from "sanity";
import { youtubeUrlRule } from "./shared";

export const video = defineType({
  name: "video",
  title: "Video",
  type: "document",
  description: "Upload to YouTube first, then paste the link here.",
  fields: [
    defineField({ name: "title", type: "string", initialValue: "Friday training", validation: (r) => r.required() }),
    defineField({
      name: "youtubeUrl",
      title: "YouTube link",
      type: "url",
      description: "Copy the link from YouTube's Share button.",
      validation: youtubeUrlRule,
    }),
    defineField({
      name: "recordedOn",
      title: "Date",
      type: "date",
      initialValue: () => new Date().toISOString().slice(0, 10),
      validation: (r) => r.required(),
    }),
    defineField({ name: "description", type: "text", rows: 3 }),
  ],
  orderings: [{ title: "Newest", name: "recordedOn", by: [{ field: "recordedOn", direction: "desc" }] }],
  preview: { select: { title: "title", subtitle: "recordedOn" } },
});
