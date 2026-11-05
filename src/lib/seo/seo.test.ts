import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  buildAlbumDescription,
  buildAlbumPath,
  buildPhotoDescription,
  pickAlbumCoverPhoto,
  truncateDescription,
} from "./metadata";
import { resolveImageSource } from "./og-image";
import { resolveSiteUrl, toAbsoluteUrl } from "./site-url";

test("resolveSiteUrl prefers SITE_URL, then Railway domain, then localhost", () => {
  assert.equal(
    resolveSiteUrl({ SITE_URL: "https://photo.example.com/some/path", RAILWAY_PUBLIC_DOMAIN: "x.up.railway.app" }).origin,
    "https://photo.example.com",
  );
  assert.equal(resolveSiteUrl({ RAILWAY_PUBLIC_DOMAIN: "expose.up.railway.app" }).origin, "https://expose.up.railway.app");
  assert.equal(resolveSiteUrl({ SITE_URL: "  " }).origin, "http://localhost:3000");
  assert.equal(resolveSiteUrl({ SITE_URL: "http://[bad" }).origin, "http://localhost:3000");
});

test("toAbsoluteUrl keeps absolute URLs and resolves relative paths", () => {
  const siteUrl = new URL("https://photo.example.com");
  assert.equal(toAbsoluteUrl("/albums/tokyo", siteUrl), "https://photo.example.com/albums/tokyo");
  assert.equal(toAbsoluteUrl("https://cdn.example.com/a.webp", siteUrl), "https://cdn.example.com/a.webp");
});

test("truncateDescription collapses whitespace and adds an ellipsis", () => {
  assert.equal(truncateDescription("  a\n\n b  "), "a b");
  const result = truncateDescription("x".repeat(200), 20);
  assert.equal(result.length, 20);
  assert.ok(result.endsWith("…"));
});

test("buildPhotoDescription uses the custom description or a generated fallback", () => {
  assert.equal(buildPhotoDescription({ title: "T", description: " Custom " }), "Custom");
  assert.match(
    buildPhotoDescription({ title: "Harbor", albumName: "Keelung", location: "Taiwan" }),
    /^Harbor — photo by .+\. Keelung · Taiwan$/,
  );
});

test("buildAlbumDescription falls back to the photo count", () => {
  assert.match(buildAlbumDescription({ name: "Tokyo" }, 12), /^Tokyo — 12 photos by /);
});

test("buildAlbumPath encodes the slug", () => {
  assert.equal(buildAlbumPath({ slug: "東京 2026" }), "/albums/%E6%9D%B1%E4%BA%AC%202026");
});

test("pickAlbumCoverPhoto prefers the configured cover, then the first photo", () => {
  const photos = [{ id: 1 }, { id: 2 }];
  assert.deepEqual(pickAlbumCoverPhoto({ coverPhotoId: 2 }, photos), { id: 2 });
  assert.deepEqual(pickAlbumCoverPhoto({ coverPhotoId: 99 }, photos), { id: 1 });
  assert.equal(pickAlbumCoverPhoto({ coverPhotoId: null }, []), null);
});

test("resolveImageSource allows public files and the R2 host only", () => {
  const publicDir = path.resolve("/srv/app/public");
  const options = { publicDir, allowedRemoteHosts: ["pub-123.r2.dev"] };

  assert.deepEqual(resolveImageSource("/uploads/medium/a.webp", options), {
    kind: "file",
    filePath: path.join(publicDir, "uploads", "medium", "a.webp"),
  });
  assert.deepEqual(resolveImageSource("https://pub-123.r2.dev/medium/a.webp", options), {
    kind: "remote",
    url: "https://pub-123.r2.dev/medium/a.webp",
  });
  assert.equal(resolveImageSource("https://evil.example.com/a.webp", options), null);
  assert.equal(resolveImageSource("http://169.254.169.254/latest", options), null);
  assert.equal(resolveImageSource("/../../etc/passwd", options), null);
  assert.equal(resolveImageSource("/%2e%2e/%2e%2e/etc/passwd", options), null);
  assert.equal(resolveImageSource("relative/a.webp", options), null);
  assert.equal(resolveImageSource("", options), null);
});
