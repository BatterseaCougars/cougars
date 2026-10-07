import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetBreakers } from "../../../../../shared/breaker";
import { clearCache } from "./cache";
import { findAlbum, latestPhotos, listAlbums, type PhotosConfig } from "./photos";
import { demoAlbums } from "../sanity/demo";

const DEMO_ALBUMS = demoAlbums();

const config: PhotosConfig = { projectId: "abc123", dataset: "production" };
const img = (ref: string, extra: Record<string, unknown> = {}) => ({ asset: { _ref: ref }, ...extra });

/** Stub the network: Sanity answers every query with `result` (or the given status). */
function sanityReturns(result: unknown, status = 200) {
  const fetch = vi.fn(async (_url: URL, _init?: RequestInit) => Response.json({ result }, { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

beforeEach(() => {
  clearCache();
  resetBreakers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("reading Sanity", () => {
  it("asks once a minute, however many people look", async () => {
    const fetch = sanityReturns([]);
    for (let i = 0; i < 5; i++) await listAlbums(config);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("stops asking while Sanity's quota is spent, and keeps showing the last albums", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-07T12:00:00Z"));
    sanityReturns([{ title: "Kumite", slug: "kumite", date: "2026-09-12", photos: [img("image-a")] }]);
    expect((await listAlbums(config)).data).toHaveLength(1);

    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-07T12:02:00Z"));
    const spent = vi.fn(async () => Response.json({ error: "plan_limit_reached" }, { status: 402 }));
    vi.stubGlobal("fetch", spent);
    expect(await listAlbums(config)).toMatchObject({ data: [{ slug: "kumite" }], unavailable: false });
    expect(await findAlbum(config, "kumite")).toMatchObject({ unavailable: true }); // never fetched: nothing to show
    expect(spent).toHaveBeenCalledTimes(1); // paused for an hour after the first 402
  });
});

describe("listAlbums", () => {
  it("maps albums to covers with photo counts, newest first", async () => {
    sanityReturns([
      { title: "Older", slug: "older", date: "2026-05-01", photos: [img("image-a")], photoCount: 40 },
      {
        title: "Newer",
        slug: "newer",
        date: "2026-09-12",
        cover: img("image-c"),
        photos: [img("image-b")],
        photoCount: 3,
      },
    ]);
    const { data, unavailable } = await listAlbums(config);
    expect(unavailable).toBe(false);
    expect(data.map((a) => [a.slug, a.photoCount])).toEqual([
      ["newer", 3],
      ["older", 40],
    ]);
    expect(data[0].cover?.asset?._ref).toBe("image-c");
  });

  it("uses the first photo as the cover when none is chosen", async () => {
    sanityReturns([
      { title: "No cover", slug: "a", date: "2026-09-01", cover: { alt: "left over" }, photos: [img("image-first")] },
    ]);
    const { data } = await listAlbums(config);
    expect(data[0].cover?.asset?._ref).toBe("image-first");
  });

  it("skips albums without a title or web address", async () => {
    sanityReturns([{ title: "Draft", slug: null, date: "2026-09-01", photos: [] }]);
    expect((await listAlbums(config)).data).toEqual([]);
  });

  it("queries the API CDN's published content, with a token only when there is one", async () => {
    const fetch = sanityReturns([]);
    await listAlbums(config);
    clearCache();
    await listAlbums({ ...config, token: "viewer" });
    const [url, init] = fetch.mock.calls[0];
    expect(url.host).toBe("abc123.apicdn.sanity.io");
    expect(url.pathname).toBe("/v2025-01-01/data/query/production");
    expect(url.searchParams.get("perspective")).toBe("published");
    expect(init?.headers).toEqual({});
    expect(fetch.mock.calls[1][1]?.headers).toEqual({ Authorization: "Bearer viewer" });
  });

  it("returns an empty, unavailable list when Sanity fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    sanityReturns(null, 500);
    expect(await listAlbums(config)).toEqual({ data: [], unavailable: true });
  });

  it("returns an empty, unavailable list when Sanity can't be reached", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    expect(await listAlbums(config)).toEqual({ data: [], unavailable: true });
  });

  it("is empty, not unavailable, until a Sanity project is configured", async () => {
    const fetch = sanityReturns([]);
    expect(await listAlbums({ dataset: "production" })).toEqual({ data: [], unavailable: false });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows the demo albums when Sanity has none, in demo mode", async () => {
    sanityReturns([]);
    const { data, unavailable } = await listAlbums({ ...config, demo: true });
    expect(unavailable).toBe(false);
    expect(data.map((a) => a.slug)).toEqual(DEMO_ALBUMS.map((a) => a.slug));
    expect(data[0].photoCount).toBe(DEMO_ALBUMS[0].photos.length);
  });

  it("prefers real albums over the demo ones", async () => {
    sanityReturns([{ title: "Real", slug: "real", date: "2026-09-01", photos: [img("image-a")], photoCount: 1 }]);
    expect((await listAlbums({ ...config, demo: true })).data.map((a) => a.slug)).toEqual(["real"]);
  });
});

describe("findAlbum", () => {
  it("returns the album's photos, with alt text from the description or else the caption", async () => {
    const fetch = sanityReturns({
      title: "Kumite",
      slug: "kumite",
      date: "2026-09-12",
      photos: [
        img("image-a", { alt: "Goal celebration", caption: "Get in" }),
        img("image-b", { caption: " The final " }),
        { _key: "uploading" },
        img("image-c", { alt: "  " }),
      ],
    });
    const { data } = await findAlbum(config, "kumite");
    expect(data?.photos.map((p) => [p.asset?._ref, p.alt, p.caption])).toEqual([
      ["image-a", "Goal celebration", "Get in"],
      ["image-b", "The final", "The final"],
      ["image-c", "", null],
    ]);
    expect(data?.cover?.asset?._ref).toBe("image-a");
    expect(fetch.mock.calls[0][0].searchParams.get("$slug")).toBe('"kumite"');
  });

  it("returns null for an unknown web address", async () => {
    sanityReturns(null);
    expect(await findAlbum(config, "nope")).toEqual({ data: null, unavailable: false });
  });

  it("returns null and unavailable when Sanity fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    sanityReturns(null, 503);
    expect(await findAlbum(config, "kumite")).toEqual({ data: null, unavailable: true });
  });

  it("finds a demo album in demo mode, even when Sanity fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    sanityReturns(null, 500);
    const { data, unavailable } = await findAlbum({ ...config, demo: true }, DEMO_ALBUMS[1].slug);
    expect(unavailable).toBe(false);
    expect(data?.title).toBe(DEMO_ALBUMS[1].title);
    expect(data?.photos[0].alt).toBe("Sample photo 1");
  });
});

describe("latestPhotos", () => {
  it("takes photos from the newest albums first, up to the limit", async () => {
    sanityReturns([
      { title: "Old", slug: "old", date: "2026-01-01", photos: [img("image-old")] },
      { title: "New", slug: "new", date: "2026-09-01", photos: [img("image-n1"), img("image-n2")] },
    ]);
    expect((await latestPhotos(config, 2)).data.map((p) => p.asset?._ref)).toEqual(["image-n1", "image-n2"]);
    expect((await latestPhotos(config)).data.map((p) => p.asset?._ref)).toEqual(["image-n1", "image-n2", "image-old"]);
  });

  it("falls back to demo photos in demo mode", async () => {
    sanityReturns([]);
    const { data } = await latestPhotos({ ...config, demo: true }, 5);
    expect(data).toHaveLength(5);
    expect(data[0].demoUrl).toContain(DEMO_ALBUMS[0].slug);
  });
});
