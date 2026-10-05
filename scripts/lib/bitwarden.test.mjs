import { describe, expect, it } from "vitest";
import { projectFor } from "./bitwarden.mjs";

describe("projectFor", () => {
  it("puts production values in cougars", () => {
    expect(projectFor("CLOUDFLARE_API_TOKEN__PRODUCTION")).toBe("cougars");
  });

  it("puts dev and shared values in cougars-dev", () => {
    expect(projectFor("CLOUDFLARE_API_TOKEN__DEV")).toBe("cougars-dev");
    expect(projectFor("SANITY_API_TOKEN")).toBe("cougars-dev");
  });

  it("rejects unknown environments and bad names", () => {
    expect(() => projectFor("CLOUDFLARE_API_TOKEN__PROD")).toThrow(/__PRODUCTION, __DEV/);
    expect(() => projectFor("cloudflare-token")).toThrow(/UPPER_SNAKE_CASE/);
  });
});
