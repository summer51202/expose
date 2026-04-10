import test from "node:test";
import assert from "node:assert/strict";

import {
  canSubmitPhotoAlbumChange,
  getPhotoAlbumChangeError,
} from "./photo-album-change";

test("getPhotoAlbumChangeError returns an error when no photo is selected", () => {
  assert.equal(
    getPhotoAlbumChangeError({
      photoId: null,
      albumId: "12",
    }),
    "Please choose a photo to move.",
  );
});

test("getPhotoAlbumChangeError returns an error when no destination album is selected", () => {
  assert.equal(
    getPhotoAlbumChangeError({
      photoId: 10,
      albumId: "",
    }),
    "Please choose a destination album.",
  );
});

test("getPhotoAlbumChangeError returns null when both photo and album are present", () => {
  assert.equal(
    getPhotoAlbumChangeError({
      photoId: 10,
      albumId: "12",
    }),
    null,
  );
});

test("canSubmitPhotoAlbumChange only returns true when both photo and album are present", () => {
  assert.equal(
    canSubmitPhotoAlbumChange({
      photoId: null,
      albumId: "12",
    }),
    false,
  );

  assert.equal(
    canSubmitPhotoAlbumChange({
      photoId: 10,
      albumId: "",
    }),
    false,
  );

  assert.equal(
    canSubmitPhotoAlbumChange({
      photoId: 10,
      albumId: "12",
    }),
    true,
  );
});
