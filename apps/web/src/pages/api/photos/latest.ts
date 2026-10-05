import type { APIRoute } from "astro";
import { imageSrcSet, imageUrl } from "../../../lib/sanity/images";
import { CACHE_CONTROL, UNAVAILABLE_CACHE_CONTROL, latestPhotos } from "../../../lib/server/photos";
import { photosConfig } from "../../../lib/server/sanity-env";

export const prerender = false;

/** A photo as the home page strip draws it: image URLs are built here, so the browser needs no Sanity code. */
export interface StripPhoto {
  src: string;
  srcset: string;
  full: string;
  alt: string;
  caption: string;
}

// The home page is prerendered with the photos from its last build; its script swaps in these, so a newly
// published album shows on the home page too (ADR 0016).
export const GET: APIRoute = async () => {
  const { data, unavailable } = await latestPhotos(photosConfig());
  const photos: StripPhoto[] = data.flatMap((p) => {
    const src = imageUrl(p, 600);
    const full = imageUrl(p, 2000);
    if (!src || !full) return [];
    return [{ src, full, srcset: imageSrcSet(p, [400, 600, 900]), alt: p.alt ?? "", caption: p.caption ?? "" }];
  });
  return Response.json(
    { photos, unavailable },
    {
      status: unavailable ? 503 : 200,
      headers: { "Cache-Control": unavailable ? UNAVAILABLE_CACHE_CONTROL : CACHE_CONTROL },
    },
  );
};
