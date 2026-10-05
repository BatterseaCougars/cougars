import { defineField, defineType } from "sanity";
import { bodyField, imageField, slugField } from "./shared";

export const post = defineType({
  name: "post",
  title: "News post",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    slugField(),
    defineField({
      name: "publishedAt",
      title: "Date",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
      validation: (r) => r.required(),
    }),
    defineField({ name: "excerpt", title: "Summary", type: "text", rows: 2, validation: (r) => r.max(200) }),
    imageField("cover", "Main image"),
    bodyField,
  ],
  orderings: [{ title: "Newest", name: "publishedAt", by: [{ field: "publishedAt", direction: "desc" }] }],
  preview: { select: { title: "title", subtitle: "publishedAt", media: "cover" } },
});
