// Where something is held (ADR 0030). A place the club goes again and again is a saved venue: a name, an address
// and its map link, set once and picked, so moving it fixes every event that uses it. A one-off (a social) needn't
// make one: it has its own name and the map link pasted for it. Nothing set: its series' place, if it has one.

/** A saved venue. */
export interface Venue {
  id: number;
  name: string;
  address: string;
  /** Pasted from Google Maps (Share → Copy link); empty: a map search for the name and address. */
  mapUrl: string;
  /** Offered when picking; an old one stays on the events that have it. */
  active: boolean;
}

/** What something stores about where it is: a saved venue, or a name and map link of its own. */
export interface OwnPlace {
  venueId: number | null;
  name: string;
  mapUrl: string;
}

/** Where it really is. */
export interface Place {
  name: string;
  address: string;
  /** Always a link that opens the map. */
  mapUrl: string;
}

/** Google Maps' search link: works on any phone, no key. */
export const mapSearch = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

/** Its saved venue, else the name and link it has, else the fallback (its series'); null when nothing says. */
export function placeOf(own: OwnPlace, venues: readonly Venue[], fallback: Place | null = null): Place | null {
  const venue = own.venueId == null ? undefined : venues.find((v) => v.id === own.venueId);
  if (venue) return toPlace(venue.name, venue.address, venue.mapUrl);
  const name = own.name.trim();
  if (name || own.mapUrl) return toPlace(name || "On the map", "", own.mapUrl);
  return fallback;
}

const toPlace = (name: string, address: string, mapUrl: string): Place => ({
  name,
  address,
  mapUrl: mapUrl || mapSearch([name, address].filter(Boolean).join(", ")),
});

/** A pasted map link, tidied: "" for none, null if it isn't a web link (so never javascript: in an href). */
export function cleanMapUrl(value: string): string | null {
  const v = value.trim();
  if (!v) return "";
  try {
    const url = new URL(v);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}
