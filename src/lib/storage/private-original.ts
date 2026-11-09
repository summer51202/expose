/**
 * Photo originals live in private storage (R2 bucket `R2_PRIVATE_BUCKET_NAME`, or
 * `storage/private/` locally) and have no public URL. The DB column `originalUrl` is
 * required, so it holds this marker instead of a URL: `private:<key>`. Records whose
 * `originalUrl` is still a real URL are legacy uploads whose original is in public storage.
 *
 * Keep the prefix in sync with PRIVATE_ORIGINAL_URL_PREFIX in scripts/lib/private-originals.mjs.
 */
export const PRIVATE_ORIGINAL_URL_PREFIX = "private:";

function normalizeKey(key: string) {
  return key.replace(/\\/g, "/").replace(/^\/+/, "");
}

export function toPrivateOriginalUrl(key: string) {
  const normalized = normalizeKey(key);

  if (!normalized) {
    throw new Error("A private original needs a storage key.");
  }

  return `${PRIVATE_ORIGINAL_URL_PREFIX}${normalized}`;
}

export function isPrivateOriginalUrl(url: string | null | undefined): boolean {
  return typeof url === "string" && url.startsWith(PRIVATE_ORIGINAL_URL_PREFIX);
}

/** Storage key from a `private:<key>` marker, or null for anything else. */
export function privateKeyFromOriginalUrl(url: string | null | undefined): string | null {
  if (!isPrivateOriginalUrl(url)) {
    return null;
  }

  const key = normalizeKey((url as string).slice(PRIVATE_ORIGINAL_URL_PREFIX.length));
  return key || null;
}
