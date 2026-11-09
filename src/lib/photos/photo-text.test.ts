import assert from "node:assert/strict";
import test from "node:test";

import {
  applyPhotoTextPatches,
  collectPhotoTextPatches,
  diffPhotoText,
  filterPhotosForTextEdit,
  getPhotoTextFieldErrors,
  getPhotoTextValues,
  looksLikeFilenameTitle,
  PHOTO_TEXT_MAX_BATCH,
  toPhotoTextUpdateData,
  validatePhotoTextPatches,
} from "./photo-text";
import type { PhotoRecord } from "@/types/photo";

function makePhoto(overrides: Partial<PhotoRecord> = {}): PhotoRecord {
  return {
    id: 1,
    title: "IMG 1234",
    createdAt: "2026-01-01T00:00:00.000Z",
    width: 3000,
    height: 2000,
    originalUrl: "private:uploads/a-original.webp",
    mediumUrl: "/uploads/a-medium.webp",
    thumbnailUrl: "/uploads/a-thumb.webp",
    source: "uploaded",
    ...overrides,
  };
}

// --- looksLikeFilenameTitle -------------------------------------------------

test("looksLikeFilenameTitle flags file-name style titles", () => {
  for (const title of [
    "IMG_1234.JPG",
    "IMG 1234",
    "img-0001",
    "DSC 0042",
    "DSCF1234",
    "_DSC0042",
    "PXL 20240315 123456789",
    "pexels will chen 246349093 36684605",
    "Photo by Someone on Unsplash",
    "frame 000068",
    "20240315 123456",
    "a1b2c3d4e5f6g7h8",
    "sunset.webp",
    "",
    "   ",
  ]) {
    assert.equal(looksLikeFilenameTitle(title), true, title);
  }
});

test("looksLikeFilenameTitle keeps human titles", () => {
  for (const title of [
    "清晨的淺草寺",
    "東京 2025",
    "Harbor at dusk",
    "2025 滑雪的東京",
    "Kyoto in 1998",
    "Imagine the sea",
    "Photography walk",
    "Route 66",
  ]) {
    assert.equal(looksLikeFilenameTitle(title), false, title);
  }
});

// --- diff -------------------------------------------------------------------

test("diffPhotoText returns null when nothing changed, ignoring surrounding spaces", () => {
  const original = { title: "Harbor", description: "", location: "Keelung" };

  assert.equal(diffPhotoText(1, original, { ...original }), null);
  assert.equal(diffPhotoText(1, original, { ...original, title: "  Harbor  " }), null);
});

test("diffPhotoText sends only the fields that changed", () => {
  const original = { title: "IMG 1234", description: "old", location: "Keelung" };

  assert.deepEqual(diffPhotoText(7, original, { ...original, title: " 基隆港 " }), {
    id: 7,
    title: "基隆港",
  });
  assert.deepEqual(diffPhotoText(7, original, { ...original, location: "Taipei" }), {
    id: 7,
    location: "Taipei",
  });
});

test("diffPhotoText turns an emptied optional field into null (clear)", () => {
  const original = { title: "Harbor", description: "old", location: "Keelung" };

  assert.deepEqual(diffPhotoText(3, original, { ...original, description: "  ", location: "" }), {
    id: 3,
    description: null,
    location: null,
  });
});

test("collectPhotoTextPatches skips untouched drafts and unknown photos", () => {
  const originals = new Map([
    [1, { title: "IMG 1", description: "", location: "" }],
    [2, { title: "IMG 2", description: "", location: "" }],
    [3, { title: "IMG 3", description: "", location: "" }],
  ]);
  const drafts = new Map([
    [1, { title: "Morning", description: "", location: "" }],
    [2, { title: "IMG 2", description: "", location: "" }],
    [99, { title: "Ghost", description: "", location: "" }],
  ]);

  assert.deepEqual(collectPhotoTextPatches(originals, drafts), [{ id: 1, title: "Morning" }]);
});

// --- validation -------------------------------------------------------------

test("validatePhotoTextPatches trims values and drops unknown keys", () => {
  const result = validatePhotoTextPatches([
    { id: 1, title: "  Harbor\nat dusk ", location: " Keelung ", featured: true },
    { id: 2, description: "  line one\nline two  " },
  ]);

  assert.deepEqual(result, {
    ok: true,
    patches: [
      { id: 1, title: "Harbor at dusk", location: "Keelung" },
      { id: 2, description: "line one\nline two" },
    ],
  });
});

test("validatePhotoTextPatches rejects an empty title", () => {
  const result = validatePhotoTextPatches([{ id: 1, title: "   " }]);
  assert.equal(result.ok, false);

  const nullTitle = validatePhotoTextPatches([{ id: 1, title: null }]);
  assert.equal(nullTitle.ok, false);
});

test("validatePhotoTextPatches enforces the length limits in characters", () => {
  assert.equal(validatePhotoTextPatches([{ id: 1, title: "字".repeat(120) }]).ok, true);
  assert.equal(validatePhotoTextPatches([{ id: 1, title: "字".repeat(121) }]).ok, false);
  assert.equal(validatePhotoTextPatches([{ id: 1, location: "a".repeat(121) }]).ok, false);
  assert.equal(validatePhotoTextPatches([{ id: 1, description: "a".repeat(1000) }]).ok, true);
  assert.equal(validatePhotoTextPatches([{ id: 1, description: "a".repeat(1001) }]).ok, false);
  // Emoji count as one character each.
  assert.equal(validatePhotoTextPatches([{ id: 1, title: "📷".repeat(120) }]).ok, true);
});

test("validatePhotoTextPatches accepts null to clear description and location", () => {
  assert.deepEqual(validatePhotoTextPatches([{ id: 4, description: null, location: "" }]), {
    ok: true,
    patches: [{ id: 4, description: null, location: null }],
  });
});

test("validatePhotoTextPatches rejects malformed input", () => {
  for (const input of [
    null,
    "x",
    [],
    [null],
    [{ id: "1", title: "a" }],
    [{ id: 0, title: "a" }],
    [{ id: 1.5, title: "a" }],
    [{ id: 1, title: 42 }],
    [{ id: 1, title: "a" }, { id: 1, title: "b" }],
    [{ id: 1 }],
    Array.from({ length: PHOTO_TEXT_MAX_BATCH + 1 }, (_, index) => ({ id: index + 1, title: "a" })),
  ]) {
    assert.equal(validatePhotoTextPatches(input).ok, false, JSON.stringify(input)?.slice(0, 60));
  }
});

test("getPhotoTextFieldErrors reports per-field problems", () => {
  assert.deepEqual(getPhotoTextFieldErrors({ title: "ok", description: "", location: "" }), {});
  assert.deepEqual(
    Object.keys(getPhotoTextFieldErrors({ title: " ", description: "", location: "a".repeat(121) })),
    ["title", "location"],
  );
});

// --- applying patches (JSON manifest) ---------------------------------------

test("applyPhotoTextPatches updates only the patched photos and fields", () => {
  const photos = [
    makePhoto({ id: 1, title: "IMG 1", description: "keep me", location: "Tokyo" }),
    makePhoto({ id: 2, title: "IMG 2" }),
    makePhoto({ id: 3, title: "IMG 3", location: "Osaka" }),
  ];

  const { records, updated } = applyPhotoTextPatches(photos, [
    { id: 3, location: null },
    { id: 1, title: "淺草寺" },
    { id: 404, title: "Missing" },
  ]);

  assert.equal(records.length, 3);
  assert.deepEqual(getPhotoTextValues(records[0]), {
    title: "淺草寺",
    description: "keep me",
    location: "Tokyo",
  });
  assert.equal(records[1], photos[1], "untouched record keeps identity");
  assert.equal(records[2].title, "IMG 3");
  assert.equal("location" in records[2], false, "cleared field is removed");
  assert.deepEqual(
    updated.map((photo) => photo.id),
    [3, 1],
  );
  // Input is not mutated.
  assert.equal(photos[0].title, "IMG 1");
  assert.equal(photos[2].location, "Osaka");
  // Other fields are preserved.
  assert.equal(records[0].originalUrl, photos[0].originalUrl);
});

test("toPhotoTextUpdateData only includes the patched fields", () => {
  assert.deepEqual(toPhotoTextUpdateData({ id: 1, title: "A" }), { title: "A" });
  assert.deepEqual(toPhotoTextUpdateData({ id: 1, description: null, location: "B" }), {
    description: null,
    location: "B",
  });
});

// --- filter -----------------------------------------------------------------

test("filterPhotosForTextEdit filters by album and file-name titles", () => {
  const photos = [
    makePhoto({ id: 1, title: "IMG 1", albumId: 10 }),
    makePhoto({ id: 2, title: "Harbor", albumId: 10 }),
    makePhoto({ id: 3, title: "DSC 3", albumId: 20 }),
    makePhoto({ id: 4, title: "Sunset", albumId: null }),
    makePhoto({ id: 5, title: "frame 000005" }),
  ];
  const ids = (album: string, filenameOnly: boolean) =>
    filterPhotosForTextEdit(photos, { album, filenameOnly }).map((photo) => photo.id);

  assert.deepEqual(ids("all", false), [1, 2, 3, 4, 5]);
  assert.deepEqual(ids("all", true), [1, 3, 5]);
  assert.deepEqual(ids("10", false), [1, 2]);
  assert.deepEqual(ids("10", true), [1]);
  assert.deepEqual(ids("unassigned", false), [4, 5]);
  assert.deepEqual(ids("unassigned", true), [5]);
});
