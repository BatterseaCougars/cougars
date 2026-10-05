// All GROQ lives here. Keep projections explicit so the shape matches types.ts.

// Club facts: one singleton each, found by its fixed _id (apps/studio/structure.ts).
export const CLUB = /* groq */ `*[_id == "club"][0]{founded, contactEmail, socials, youtubeChannelId, heroImage}`;
export const FRIDAYS = /* groq */ `*[_id == "fridays"][0]{
  training[]{title, day, start, end, description}, venue{name, address, mapUrl}, kitNotes, firstSessionKit, feesText
}`;
export const PUB = /* groq */ `*[_id == "pub"][0]{name, about, mapUrl}`;
export const TEAM = /* groq */ `*[_id == "team"][0]{intro, league, photo}`;
export const KUMITE = /* groq */ `*[_id == "kumite"][0]{intro, format, awards}`;

export const KUMITE_RESULTS = /* groq */ `*[_type == "kumiteResult" && defined(season)] | order(date desc){
  season, date, champions, topScorer, "event": event->{title, "slug": slug.current}
}`;

// Overrides for channel videos, and videos that aren't on the channel. Merged and sorted in lib/youtube.ts.
export const VIDEOS = /* groq */ `*[_type == "video" && defined(youtubeUrl)]{
  _id, _createdAt, youtubeUrl, title, recordedOn, description, hidden, pinned
}`;

const EVENT_FIELDS = `title, "slug": slug.current, type, startsAt, endsAt, location, summary, cover, ctaLabel, ctaUrl`;
export const EVENTS = /* groq */ `*[_type == "event" && defined(slug.current)] | order(startsAt asc){${EVENT_FIELDS}}`;
export const EVENT_PAGES = /* groq */ `*[_type == "event" && defined(slug.current)]{${EVENT_FIELDS}, body}`;

export const ALBUMS = /* groq */ `*[_type == "album" && defined(slug.current)] | order(date desc){
  title, "slug": slug.current, date, "cover": coalesce(cover, photos[0]), photos[]{..., caption}
}`;

export const SPONSORS = /* groq */ `*[_type == "sponsor"] | order(orderRank asc){name, url, logo}`;

export const PLAYERS = /* groq */ `*[_type == "player"] | order(orderRank asc, name asc){
  _id, name, nickname, number, position, shoots, since, knownFor, weakness, quote, photo
}`;
