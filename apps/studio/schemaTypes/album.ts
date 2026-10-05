import { defineArrayMember, defineField, defineType } from "sanity";
import { imageField, slugField } from "./shared";

// Albums go live on the website a few minutes after Publish, with no rebuild (web ADR 0016).
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
      description: "When the photos were taken. Albums are listed newest first.",
      initialValue: () => new Date().toISOString().slice(0, 10),
      validation: (r) => r.required(),
    }),
    imageField("cover", "Cover photo", {
      description:
        "The picture shown for this album on the Photos page. Leave it empty to use the first photo in the album.",
    }),
    defineField({
      name: "photos",
      type: "array",
      description:
        "Drag a batch of photos straight onto this box to upload them all at once. Phone photos are fine. " +
        "Then click each one and give it a caption or a description.",
      options: { layout: "grid" },
      of: [
        defineArrayMember({
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({
              name: "caption",
              title: "Caption",
              type: "string",
              description: "Shown under the photo, e.g. “Kumite final, Autumn 2026”.",
            }),
            defineField({
              name: "alt",
              title: "Describe the photo",
              type: "string",
              description:
                "For people using screen readers, e.g. “Cougars celebrating a goal”. " +
                "Optional if there's a caption: the caption is used instead.",
            }),
          ],
          // Every photo needs words for people who can't see it. A short caption is enough.
          validation: (r) =>
            r.custom((photo?: { asset?: unknown; caption?: string; alt?: string }) =>
              !photo?.asset || photo.caption?.trim() || photo.alt?.trim()
                ? true
                : "Click the photo and add a caption or a description",
            ),
        }),
      ],
      validation: (r) => r.min(1),
    }),
  ],
  orderings: [{ title: "Newest", name: "date", by: [{ field: "date", direction: "desc" }] }],
  preview: {
    select: { title: "title", date: "date", cover: "cover", first: "photos.0" },
    prepare: ({ title, date, cover, first }) => ({ title, subtitle: date, media: cover?.asset ? cover : first }),
  },
});
