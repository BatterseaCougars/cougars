import { defineField, defineArrayMember, type StringRule, type UrlRule } from "sanity";

/** Alt text is required once there is a photo: an empty image stays optional. */
export const altRule = (r: StringRule) =>
  r.custom((alt: string | undefined, ctx) =>
    (ctx.parent as { asset?: unknown } | undefined)?.asset && !alt?.trim()
      ? "Describe the photo in a few words, for people using screen readers"
      : true,
  );

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
        validation: altRule,
      }),
    ],
    ...extra,
  });

export const slugField = (source = "title") =>
  defineField({
    name: "slug",
    title: "Web address",
    type: "slug",
    description: "The end of the page's web address. Click “Generate” to make it from the title.",
    options: { source, maxLength: 80 },
    validation: (r) => r.required(),
  });

const YOUTUBE_RE = /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//;
export const youtubeUrlRule = (r: UrlRule) =>
  r
    .required()
    .custom((v?: string) => (!v || YOUTUBE_RE.test(v) ? true : "Paste a YouTube link (youtube.com or youtu.be)"));

/** Rich text used for event descriptions. */
export const bodyField = defineField({
  name: "body",
  title: "Text",
  type: "array",
  description: "The full write-up on the event's own page. You can add headings, photos and YouTube videos.",
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
        defineField({
          name: "alt",
          title: "Describe the photo",
          type: "string",
          description: "One short sentence for people using screen readers.",
          validation: altRule,
        }),
        defineField({
          name: "caption",
          title: "Caption",
          type: "string",
          description: "Optional. Shown under the photo.",
        }),
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
