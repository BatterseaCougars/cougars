import { defineField, defineType } from "sanity";
import { imageField } from "./shared";

// One player on the official team roster (Team page). Only the name is required: fill in as much or as little as you like.
export const player = defineType({
  name: "player",
  title: "Player",
  type: "document",
  fields: [
    defineField({ name: "name", type: "string", description: "Their real name.", validation: (r) => r.required() }),
    defineField({ name: "nickname", type: "string", description: "Shown big on the front of the card." }),
    defineField({ name: "number", title: "Shirt number", type: "number", description: "Optional." }),
    defineField({
      name: "position",
      type: "string",
      description: "Optional.",
      options: { list: ["Forward", "Defence", "Goalie", "Wherever"], layout: "radio" },
    }),
    defineField({
      name: "shoots",
      type: "string",
      description: "Optional. Which side they hold the stick.",
      options: { list: ["Left", "Right"], layout: "radio" },
    }),
    defineField({ name: "since", title: "Cougar since (year)", type: "number", description: "The year they joined." }),
    defineField({ name: "knownFor", title: "Known for", type: "string", description: "On the back of the card." }),
    defineField({ name: "weakness", type: "string", description: "On the back of the card. Keep it friendly." }),
    defineField({ name: "quote", type: "string", description: "On the back of the card." }),
    imageField("photo", "Photo", { description: "Optional. A head-and-shoulders shot works best." }),
    defineField({
      name: "orderRank",
      title: "Order",
      type: "number",
      description: "Lower numbers show first. The first five appear on the homepage.",
      initialValue: 10,
    }),
  ],
  preview: { select: { title: "name", subtitle: "nickname", media: "photo" } },
});
