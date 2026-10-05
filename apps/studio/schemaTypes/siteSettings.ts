import { defineArrayMember, defineField, defineType } from "sanity";
import { imageField } from "./shared";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Club details & homepage",
  type: "document",
  groups: [
    { name: "home", title: "Homepage", default: true },
    { name: "training", title: "Training" },
    { name: "kumite", title: "Kumite" },
    { name: "contact", title: "Contact & social" },
  ],
  fields: [
    defineField({
      name: "heroHeadline",
      title: "Big headline",
      type: "string",
      group: "home",
      validation: (r) => r.required().max(60),
    }),
    defineField({ name: "heroSubheading", title: "Text under the headline", type: "text", rows: 2, group: "home" }),
    imageField("heroImage", "Background photo", {
      group: "home",
      description: "Optional. A wide action shot works best. Leave empty to use the carbon-fibre background.",
    }),
    defineField({ name: "aboutHeading", title: "About: heading", type: "string", group: "home" }),
    defineField({
      name: "aboutBody",
      title: "About: text",
      type: "text",
      rows: 8,
      group: "home",
      description: "Leave a blank line between paragraphs.",
    }),
    defineField({ name: "founded", title: "Year founded", type: "number", group: "home", initialValue: 1996 }),

    defineField({
      name: "training",
      title: "Training sessions",
      type: "array",
      group: "training",
      of: [
        defineArrayMember({
          type: "object",
          name: "slot",
          fields: [
            defineField({ name: "title", title: "Name", type: "string", initialValue: "Unified session" }),
            defineField({
              name: "day",
              type: "string",
              options: { list: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
            }),
            defineField({ name: "start", title: "Starts (24h, e.g. 19:30)", type: "string" }),
            defineField({ name: "end", title: "Ends (24h, e.g. 21:30)", type: "string" }),
            defineField({ name: "description", type: "text", rows: 3 }),
          ],
          preview: {
            select: { title: "title", day: "day", start: "start", end: "end" },
            prepare: ({ title, day, start, end }) => ({ title, subtitle: `${day ?? ""} ${start ?? ""}–${end ?? ""}` }),
          },
        }),
      ],
    }),
    defineField({ name: "kitNotes", title: "What to bring / kit", type: "text", rows: 3, group: "training" }),
    defineField({
      name: "feesText",
      title: "Fees",
      type: "text",
      rows: 2,
      group: "training",
      description: "Optional, e.g. “£10 per session, first session free”.",
    }),
    defineField({
      name: "venue",
      type: "object",
      group: "training",
      fields: [
        defineField({ name: "name", type: "string" }),
        defineField({ name: "address", type: "string" }),
        defineField({ name: "mapUrl", title: "Google Maps link", type: "url" }),
      ],
    }),

    defineField({
      name: "kumite",
      title: "Cougars Kumite",
      type: "object",
      group: "kumite",
      description:
        "Shown on the Kumite page and the homepage. Kumite dates are added as Events with type “Cougars Kumite”.",
      fields: [
        defineField({ name: "intro", title: "Introduction", type: "text", rows: 4 }),
        defineField({
          name: "format",
          title: "How it works",
          type: "array",
          of: [defineArrayMember({ type: "string" })],
          description: "One short line per point.",
        }),
        defineField({
          name: "awards",
          type: "array",
          of: [defineArrayMember({ type: "string" })],
          description: "e.g. Champions, Top scorer, Most assists.",
        }),
      ],
    }),

    defineField({ name: "contactEmail", title: "Contact email", type: "string", group: "contact" }),
    defineField({
      name: "socials",
      title: "Social media links",
      type: "object",
      group: "contact",
      fields: [
        defineField({ name: "instagram", type: "url" }),
        defineField({ name: "facebook", title: "Facebook", type: "url" }),
        defineField({ name: "youtube", title: "YouTube channel", type: "url" }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: "Club details & homepage" }) },
});
