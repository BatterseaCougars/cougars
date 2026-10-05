import type { APIRoute, GetStaticPaths } from "astro";
import { getEventPages } from "../../lib/sanity/content";
import { toIcs } from "../../lib/ics";
import type { ClubEvent } from "../../lib/sanity/types";

export const getStaticPaths = (async () =>
  (await getEventPages()).map((event) => ({
    params: { slug: event.slug },
    props: { event },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props, site }) => {
  const event = props.event as ClubEvent;
  const url = new URL(`/events/${event.slug}/`, site).href;
  return new Response(
    toIcs({
      uid: `${event.slug}@batterseacougars`,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      location: event.location,
      description: event.summary,
      url,
    }),
    { headers: { "Content-Type": "text/calendar; charset=utf-8" } },
  );
};
