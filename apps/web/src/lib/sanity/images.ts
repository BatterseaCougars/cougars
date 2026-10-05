import { createImageUrlBuilder } from "@sanity/image-url";
import { SANITY_DATASET, SANITY_PROJECT_ID } from "astro:env/server";
import type { SanityImage } from "./types";

const builder = SANITY_PROJECT_ID
  ? createImageUrlBuilder({ projectId: SANITY_PROJECT_ID, dataset: SANITY_DATASET })
  : null;

/** Sanity CDN URL honouring the editor's crop and hotspot. */
export function imageUrl(image: SanityImage | null | undefined, width: number, height?: number): string | null {
  if (!builder || !image?.asset) return null;
  let b = builder.image(image).width(width).auto("format").quality(80);
  if (height) b = b.height(height).fit("crop");
  return b.url();
}

/** `srcset` for responsive images at the given widths. */
export function imageSrcSet(image: SanityImage | null | undefined, widths: number[], aspect?: number): string {
  return widths
    .map((w) => {
      const url = imageUrl(image, w, aspect ? Math.round(w / aspect) : undefined);
      return url ? `${url} ${w}w` : null;
    })
    .filter(Boolean)
    .join(", ");
}

/** CSS object-position from the editor's hotspot, so crops keep faces in frame. */
export function objectPosition(image: SanityImage | null | undefined): string {
  const h = image?.hotspot;
  return h ? `${Math.round(h.x * 100)}% ${Math.round(h.y * 100)}%` : "50% 50%";
}
