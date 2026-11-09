import assert from "node:assert/strict";
import test from "node:test";

import { PrivateStorageConfigError, mapUploadErrorToMessage } from "@/lib/security/errors";

import { resolvePrivateBucketName } from "./r2-driver";
import { getR2PrivateBucketName } from "../../../scripts/lib/private-originals.mjs";

test("resolvePrivateBucketName returns the private bucket", () => {
  assert.equal(
    resolvePrivateBucketName({ R2_BUCKET_NAME: "expose", R2_PRIVATE_BUCKET_NAME: " expose-private " }),
    "expose-private",
  );
});

test("resolvePrivateBucketName refuses to run without a private bucket", () => {
  for (const env of [{ R2_BUCKET_NAME: "expose" }, { R2_BUCKET_NAME: "expose", R2_PRIVATE_BUCKET_NAME: "  " }]) {
    assert.throws(() => resolvePrivateBucketName(env), PrivateStorageConfigError);
  }
});

test("resolvePrivateBucketName refuses the public bucket as the private one", () => {
  assert.throws(
    () => resolvePrivateBucketName({ R2_BUCKET_NAME: "expose", R2_PRIVATE_BUCKET_NAME: "expose" }),
    PrivateStorageConfigError,
  );
});

test("a missing private bucket shows the admin a specific upload error", () => {
  assert.match(mapUploadErrorToMessage(new PrivateStorageConfigError()), /R2_PRIVATE_BUCKET_NAME/);
});

test("scripts apply the same private bucket rules", () => {
  assert.equal(
    getR2PrivateBucketName({ R2_BUCKET_NAME: "expose", R2_PRIVATE_BUCKET_NAME: "expose-private" }),
    "expose-private",
  );
  assert.throws(() => getR2PrivateBucketName({ R2_BUCKET_NAME: "expose" }), /R2_PRIVATE_BUCKET_NAME/);
  assert.throws(
    () => getR2PrivateBucketName({ R2_BUCKET_NAME: "expose", R2_PRIVATE_BUCKET_NAME: "expose" }),
    /must differ/,
  );
});
