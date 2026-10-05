import { defineField, defineType } from "sanity";
import { imageField } from "./shared";

export const sponsor = defineType({
  name: "sponsor",
  title: "Sponsor",
  type: "document",
  fields: [
    defineField({ name: "name", type: "string", validation: (r) => r.required() }),
    defineField({ name: "url", title: "Website", type: "url" }),
    imageField("logo", "Logo"),
    defineField({
      name: "orderRank",
      title: "Order",
      type: "number",
      description: "Lower numbers show first.",
      initialValue: 10,
    }),
  ],
  preview: { select: { title: "name", media: "logo" } },
});
