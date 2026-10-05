import type { APIRoute } from "astro";

export const prerender = false;

// Old Wix album addresses: /gallery/<album> → /photos/<album>/ (the album pages are server-rendered, ADR 0016).
export const GET: APIRoute = ({ params, redirect }) =>
  redirect(`/photos/${encodeURIComponent(params.slug ?? "")}/`, 301);
