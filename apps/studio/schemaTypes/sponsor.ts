import { defineField, defineType } from "sanity";
import { imageField } from "./shared";

export const sponsor = defineType({
  name: "sponsor",
  title: "Sponsor",
  type: "document",
  fields: [
    defineField({
      name: "name",
      type: "string",
      description: "Shown if there is no logo.",
      validation: (r) => r.required(),
    }),
    defineField({ name: "url", title: "Website", type: "url", description: "Optional. Where the logo links to." }),
    imageField("logo", "Logo", { description: "Shown in the footer. A PNG with a transparent background works best." }),
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
