import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveAppOrigin, qrTargetUrl } from "@/server/services/qr.service";

/**
 * A printed QR code is permanent. Once stickers are on doors, a wrong origin cannot be fixed
 * without reprinting and re-sticking every one of them, so the origin logic is worth pinning down
 * more tightly than most.
 */
describe("resolveAppOrigin", () => {
  const saved = {
    APP_URL: process.env.APP_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  };

  beforeEach(() => {
    delete process.env.APP_URL;
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("upgrades a plain http origin to https", () => {
    // The reported bug: an http sticker makes every phone show "not secure".
    process.env.APP_URL = "http://dormmate.vercel.app";
    expect(resolveAppOrigin()).toBe("https://dormmate.vercel.app");
  });

  it("adds a scheme when APP_URL is a bare hostname", () => {
    process.env.APP_URL = "dormmate.vercel.app";
    expect(resolveAppOrigin()).toBe("https://dormmate.vercel.app");
  });

  it("strips a trailing slash", () => {
    process.env.APP_URL = "https://dormmate.vercel.app/";
    expect(resolveAppOrigin()).toBe("https://dormmate.vercel.app");
  });

  it("leaves localhost on http so development still works", () => {
    process.env.APP_URL = "http://localhost:3000";
    expect(resolveAppOrigin()).toBe("http://localhost:3000");
  });

  it("falls back to the Vercel deployment host when APP_URL is unset", () => {
    // Without this, a forgotten APP_URL bakes localhost into every printed sticker.
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "dormmate.vercel.app";
    expect(resolveAppOrigin()).toBe("https://dormmate.vercel.app");
  });

  it("prefers APP_URL over the Vercel host", () => {
    process.env.APP_URL = "https://dormmate.example.org";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "dormmate.vercel.app";
    expect(resolveAppOrigin()).toBe("https://dormmate.example.org");
  });

  it("builds a scannable absolute URL for a token", () => {
    process.env.APP_URL = "dormmate.vercel.app";
    expect(qrTargetUrl("abc123")).toBe("https://dormmate.vercel.app/r/abc123");
  });
});
