import { defineField, defineArrayMember, type UrlRule } from "sanity";

/** Image with crop/hotspot and a required description for screen readers. */
export const imageField = (name: string, title: string, extra: Record<string, unknown> = {}) =>
  defineField({
    name,
    title,
    type: "image",
    options: { hotspot: true },
    fields: [
      defineField({
        name: "alt",
        title: "Describe the photo",
        type: "string",
        description: "One short sentence for people using screen readers, e.g. “Cougars celebrating a goal”.",
      }),
    ],
    ...extra,
  });

export const slugField = (source = "title") =>
  defineField({
    name: "slug",
    title: "Web address",
    type: "slug",
    description: "Click “Generate” to make this from the title.",
    options: { source, maxLength: 80 },
    validation: (r) => r.required(),
  });

const YOUTUBE_RE = /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//;
export const youtubeUrlRule = (r: UrlRule) =>
  r
    .required()
    .custom((v?: string) => (!v || YOUTUBE_RE.test(v) ? true : "Paste a YouTube link (youtube.com or youtu.be)"));

/** Rich text used for news posts and event descriptions. */
export const bodyField = defineField({
  name: "body",
  title: "Text",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "Normal", value: "normal" },
        { title: "Heading", value: "h2" },
        { title: "Subheading", value: "h3" },
        { title: "Quote", value: "blockquote" },
      ],
    }),
    defineArrayMember({
      type: "image",
      options: { hotspot: true },
      fields: [
        { name: "alt", title: "Describe the photo", type: "string" },
        { name: "caption", title: "Caption", type: "string" },
      ],
    }),
    defineArrayMember({
      name: "youtube",
      title: "YouTube video",
      type: "object",
      fields: [defineField({ name: "url", title: "YouTube link", type: "url", validation: youtubeUrlRule })],
      preview: { select: { title: "url" }, prepare: ({ title }) => ({ title: "YouTube video", subtitle: title }) },
    }),
  ],
});
