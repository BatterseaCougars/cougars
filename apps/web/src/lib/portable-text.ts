import { toHTML, escapeHTML, type PortableTextComponents } from "@portabletext/to-html";
import type { PortableTextBlock } from "@portabletext/types";
import { imageSrcSet, imageUrl } from "./sanity/images";
import { youtubeId, embedUrl } from "./youtube";

const components: Partial<PortableTextComponents> = {
  types: {
    image: ({ value }) => {
      const src = imageUrl(value, 1200);
      if (!src) return "";
      const alt = escapeHTML(value.alt ?? "");
      const caption = value.caption ? `<figcaption class="muted">${escapeHTML(value.caption)}</figcaption>` : "";
      return `<figure><img src="${src}" srcset="${imageSrcSet(value, [480, 800, 1200])}" sizes="(max-width: 42rem) 100vw, 42rem" alt="${alt}" loading="lazy" />${caption}</figure>`;
    },
    youtube: ({ value }) => {
      const id = youtubeId(value.url ?? "");
      if (!id) return "";
      return `<div class="pt-video"><iframe src="${embedUrl(id).replace("autoplay=1&", "")}" title="YouTube video" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
    },
  },
  marks: {
    link: ({ children, value }) => {
      const href = escapeHTML(value?.href ?? "#");
      const external = /^https?:/.test(href);
      return `<a href="${href}"${external ? ' rel="noopener" target="_blank"' : ""}>${children}</a>`;
    },
  },
};

export const renderPortableText = (blocks: PortableTextBlock[] | null | undefined) =>
  blocks?.length ? toHTML(blocks, { components }) : "";
