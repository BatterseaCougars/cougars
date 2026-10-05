import { defineField, defineType } from "sanity";
import { imageField } from "./shared";

// One player on the official team roster (Team page). Only the name is required: fill in as much or as little as you like.
export const player = defineType({
  name: "player",
  title: "Player",
  type: "document",
  fields: [
    defineField({ name: "name", type: "string", validation: (r) => r.required() }),
    defineField({ name: "nickname", type: "string", description: "Shown big on the front of the card." }),
    defineField({ name: "number", title: "Shirt number", type: "number" }),
    defineField({
      name: "position",
      type: "string",
      options: { list: ["Forward", "Defence", "Goalie", "Wherever"], layout: "radio" },
    }),
    defineField({ name: "shoots", type: "string", options: { list: ["Left", "Right"], layout: "radio" } }),
    defineField({ name: "since", title: "Cougar since (year)", type: "number" }),
    defineField({ name: "knownFor", title: "Known for", type: "string" }),
    defineField({ name: "weakness", type: "string" }),
    defineField({ name: "quote", type: "string" }),
    imageField("photo", "Photo"),
    defineField({
      name: "orderRank",
      title: "Order",
      type: "number",
      description: "Lower numbers show first.",
      initialValue: 10,
    }),
  ],
  preview: { select: { title: "name", subtitle: "nickname", media: "photo" } },
});
