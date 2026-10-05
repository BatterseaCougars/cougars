// All GROQ lives here. Keep projections explicit so the shape matches types.ts.

export const SETTINGS = /* groq */ `*[_id == "siteSettings"][0]{
  heroHeadline, heroSubheading, heroImage, aboutHeading, aboutBody, founded,
  training[]{title, day, start, end, description}, kitNotes, feesText,
  venue{name, address, mapUrl}, contactEmail, socials
}`;

const POST_FIELDS = `title, "slug": slug.current, publishedAt, excerpt, cover`;
export const POSTS = /* groq */ `*[_type == "post" && defined(slug.current)] | order(publishedAt desc){${POST_FIELDS}}`;
export const POST_PAGES = /* groq */ `*[_type == "post" && defined(slug.current)]{${POST_FIELDS}, body}`;

export const VIDEOS = /* groq */ `*[_type == "video" && defined(youtubeUrl)] | order(recordedOn desc){
  _id, title, recordedOn, youtubeUrl, description
}`;

const EVENT_FIELDS = `title, "slug": slug.current, type, startsAt, endsAt, location, summary, cover, ctaLabel, ctaUrl`;
export const EVENTS = /* groq */ `*[_type == "event" && defined(slug.current)] | order(startsAt asc){${EVENT_FIELDS}}`;
export const EVENT_PAGES = /* groq */ `*[_type == "event" && defined(slug.current)]{${EVENT_FIELDS}, body}`;

export const ALBUMS = /* groq */ `*[_type == "album" && defined(slug.current)] | order(date desc){
  title, "slug": slug.current, date, "cover": coalesce(cover, photos[0]), photos[]{..., caption}
}`;

export const SPONSORS = /* groq */ `*[_type == "sponsor"] | order(orderRank asc){name, url, logo}`;
