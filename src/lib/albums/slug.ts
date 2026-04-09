function slugifyAscii(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createAlbumSlug(name: string, fallbackId: number | string) {
  const baseSlug = slugifyAscii(name);
  if (baseSlug) {
    return baseSlug;
  }

  return `album-${String(fallbackId).toLowerCase()}`;
}

export function normalizeAlbumSlug(slug: string) {
  return decodeURIComponent(slug).trim().toLowerCase();
}

export function createUniqueAlbumSlug(
  name: string,
  fallbackId: number | string,
  existingSlugs: Set<string>,
) {
  const baseSlug = createAlbumSlug(name, fallbackId);
  let candidate = baseSlug;
  let suffix = 2;

  while (existingSlugs.has(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
