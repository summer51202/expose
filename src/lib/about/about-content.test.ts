import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMailtoHref,
  buildPersonJsonLd,
  getVisibleSocialLinks,
  isUsableEmail,
  selectFeaturedPhotos,
  serializeJsonLd,
} from "./about-content";

test("getVisibleSocialLinks drops empty and non-http URLs", () => {
  const links = getVisibleSocialLinks([
    { platform: "instagram", label: "Instagram", url: "https://instagram.com/me" },
    { platform: "facebook", label: "Facebook", url: "" },
    { platform: "threads", label: "Threads", url: "   " },
    { platform: "threads", label: "Threads", url: "javascript:alert(1)" },
    { platform: "facebook", label: "Facebook", url: "not a url" },
  ]);

  assert.deepEqual(
    links.map((link) => link.url),
    ["https://instagram.com/me"],
  );
});

test("isUsableEmail accepts plain addresses and rejects blanks or junk", () => {
  assert.equal(isUsableEmail("me@example.com"), true);
  assert.equal(isUsableEmail(" me@example.com "), true);
  assert.equal(isUsableEmail(""), false);
  assert.equal(isUsableEmail("TODO"), false);
  assert.equal(isUsableEmail("a@b"), false);
  assert.equal(isUsableEmail('x"@y.com'), false);
  assert.equal(buildMailtoHref(" me@example.com "), "mailto:me@example.com");
});

test("selectFeaturedPhotos keeps configured order, skips unknown and duplicate ids", () => {
  const photos = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

  assert.deepEqual(
    selectFeaturedPhotos(photos, [3, 99, 1, 3]).map((photo) => photo.id),
    [3, 1],
  );
});

test("selectFeaturedPhotos falls back to the first photos and respects the limit", () => {
  const photos = Array.from({ length: 10 }, (_, index) => ({ id: index + 1 }));

  assert.deepEqual(
    selectFeaturedPhotos(photos, []).map((photo) => photo.id),
    [1, 2, 3, 4, 5, 6],
  );
  assert.equal(selectFeaturedPhotos(photos, [], 3).length, 3);
  assert.deepEqual(selectFeaturedPhotos([], []), []);
});

test("buildPersonJsonLd omits empty optional fields", () => {
  assert.deepEqual(
    buildPersonJsonLd({ name: "A", url: "https://x.test/about", sameAs: [] }),
    {
      "@context": "https://schema.org",
      "@type": "Person",
      name: "A",
      url: "https://x.test/about",
    },
  );

  const full = buildPersonJsonLd({
    name: "A",
    url: "https://x.test/about",
    image: "https://x.test/a.jpg",
    email: "a@x.test",
    sameAs: ["https://instagram.com/a"],
  });
  assert.equal(full.email, "mailto:a@x.test");
  assert.deepEqual(full.sameAs, ["https://instagram.com/a"]);
  assert.equal(full.image, "https://x.test/a.jpg");
});

test("serializeJsonLd cannot close the script tag", () => {
  const output = serializeJsonLd({ name: "</script><script>alert(1)</script>\u2028" });

  assert.equal(output.includes("<"), false);
  assert.equal(output.includes(String.fromCharCode(0x2028)), false);
  assert.deepEqual(JSON.parse(output), { name: "</script><script>alert(1)</script>\u2028" });
});
