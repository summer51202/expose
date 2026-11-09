// Shared helpers for photo originals in private storage, for standalone Node scripts.
// Mirrors src/lib/storage/private-original.ts and the private drivers in src/lib/storage/.
import path from "node:path";

// Keep in sync with PRIVATE_ORIGINAL_URL_PREFIX in src/lib/storage/private-original.ts.
export const PRIVATE_ORIGINAL_URL_PREFIX = "private:";

const normalizeKey = (key) => key.replace(/\\/g, "/").replace(/^\/+/, "");

export function toPrivateOriginalUrl(key) {
  const normalized = normalizeKey(key);
  if (!normalized) {
    throw new Error("A private original needs a storage key.");
  }
  return `${PRIVATE_ORIGINAL_URL_PREFIX}${normalized}`;
}

export function isPrivateOriginalUrl(url) {
  return typeof url === "string" && url.startsWith(PRIVATE_ORIGINAL_URL_PREFIX);
}

export function privateKeyFromOriginalUrl(url) {
  if (!isPrivateOriginalUrl(url)) {
    return null;
  }
  return normalizeKey(url.slice(PRIVATE_ORIGINAL_URL_PREFIX.length)) || null;
}

/** Same rule as resolvePrivateBucketName in src/lib/storage/r2-driver.ts. */
export function getR2PrivateBucketName(env = process.env) {
  const privateBucket = env.R2_PRIVATE_BUCKET_NAME?.trim();
  if (!privateBucket) {
    throw new Error("R2_PRIVATE_BUCKET_NAME is not set; refusing to treat the public bucket as private.");
  }
  if (privateBucket === env.R2_BUCKET_NAME?.trim()) {
    throw new Error("R2_PRIVATE_BUCKET_NAME must differ from R2_BUCKET_NAME (the public bucket).");
  }
  return privateBucket;
}

/** baseDir/<key>, refusing anything that resolves outside `allowedRoot`. */
function resolveInside(baseDir, allowedRoot, key, label) {
  const absolutePath = path.resolve(baseDir, normalizeKey(key));
  const relative = path.relative(allowedRoot, absolutePath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to touch local path outside ${label}: ${key}`);
  }
  return absolutePath;
}

/** public/<key> (keys look like uploads/x.webp), only inside public/uploads. */
export function resolvePublicLocalPath(projectRoot, key) {
  const publicRoot = path.join(projectRoot, "public");
  return resolveInside(publicRoot, path.join(publicRoot, "uploads"), key, "public/uploads");
}

/** storage/private/<key> (not served by Next). */
export function resolvePrivateLocalPath(projectRoot, key) {
  const privateRoot = path.join(projectRoot, "storage", "private");
  return resolveInside(privateRoot, privateRoot, key, "storage/private");
}
