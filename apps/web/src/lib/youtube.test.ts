import { describe, expect, it } from "vitest";
import { youtubeId } from "./youtube";

describe("youtubeId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=42", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ&feature=share", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/live/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    [" https://youtu.be/dQw4w9WgXcQ ", "dQw4w9WgXcQ"],
  ])("%s", (url, id) => expect(youtubeId(url)).toBe(id));

  it.each(["", "not a url", "https://vimeo.com/123", "https://youtube.com/watch?v=short"])("rejects %s", (url) =>
    expect(youtubeId(url)).toBeNull(),
  );
});
