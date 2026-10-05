import { defineArrayMember, defineField, defineType } from "sanity";
import { imageField, slugField } from "./shared";

export const album = defineType({
  name: "album",
  title: "Photo album",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    slugField(),
    defineField({
      name: "date",
      type: "date",
      initialValue: () => new Date().toISOString().slice(0, 10),
      validation: (r) => r.required(),
    }),
    defineField({
      name: "photos",
      type: "array",
      description: "Drag a batch of photos straight onto this box to upload them all at once.",
      options: { layout: "grid" },
      of: [
        defineArrayMember({
          type: "image",
          options: { hotspot: true },
          fields: [
            { name: "caption", title: "Caption", type: "string" },
            { name: "alt", title: "Describe the photo", type: "string" },
          ],
        }),
      ],
      validation: (r) => r.min(1),
    }),
    imageField("cover", "Cover photo", { description: "Optional. Defaults to the first photo." }),
  ],
  orderings: [{ title: "Newest", name: "date", by: [{ field: "date", direction: "desc" }] }],
  preview: {
    select: { title: "title", date: "date", media: "photos.0" },
    prepare: ({ title, date, media }) => ({ title, subtitle: date, media }),
  },
});
