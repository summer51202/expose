import type { SocialLink } from "@/config/site";

/** Only http(s) links with a non-empty URL are shown; anything else is dropped. */
export function getVisibleSocialLinks(links: readonly SocialLink[]): SocialLink[] {
  return links.filter((link) => isSafeHttpUrl(link.url));
}

export function isSafeHttpUrl(value: string | undefined | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return false;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Loose shape check so a typo does not produce a broken `mailto:` link. */
export function isUsableEmail(value: string | undefined | null) {
  const trimmed = value?.trim();
  return Boolean(trimmed && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(trimmed));
}

export function buildMailtoHref(email: string) {
  return `mailto:${email.trim()}`;
}

/**
 * Featured photos for /about: configured ids in the configured order (unknown ids skipped),
 * otherwise the first `limit` photos of the list (already newest first).
 */
export function selectFeaturedPhotos<T extends { id: number }>(
  photos: readonly T[],
  featuredIds: readonly number[],
  limit = 6,
): T[] {
  if (featuredIds.length > 0) {
    const byId = new Map(photos.map((photo) => [photo.id, photo]));
    const picked: T[] = [];
    const seen = new Set<number>();

    for (const id of featuredIds) {
      const photo = byId.get(id);

      if (photo && !seen.has(id)) {
        picked.push(photo);
        seen.add(id);
      }
    }

    return picked.slice(0, limit);
  }

  return photos.slice(0, limit);
}

type PersonJsonLdInput = {
  name: string;
  url: string;
  description?: string;
  image?: string;
  email?: string;
  sameAs: string[];
};

export function buildPersonJsonLd({ name, url, description, image, email, sameAs }: PersonJsonLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url,
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    ...(email ? { email: buildMailtoHref(email) } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

/**
 * JSON.stringify does not escape `<`, so a value containing `</script>` could break out
 * of the tag. Escaping `<` (per the Next.js JSON-LD guide) plus U+2028/9 keeps it inert.
 */
const LINE_SEPARATOR = new RegExp(String.fromCharCode(0x2028), "g");
const PARAGRAPH_SEPARATOR = new RegExp(String.fromCharCode(0x2029), "g");

export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(LINE_SEPARATOR, "\\u2028")
    .replace(PARAGRAPH_SEPARATOR, "\\u2029");
}
