const DEFAULT_SITE_URL = "http://localhost:3000";

type SiteUrlEnv = Partial<Record<"SITE_URL" | "RAILWAY_PUBLIC_DOMAIN", string>> &
  Record<string, string | undefined>;

function parseOrigin(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

/**
 * Public origin used for canonical URLs, Open Graph URLs, robots.txt and sitemap.xml.
 * Order: SITE_URL → Railway public domain → localhost.
 */
export function resolveSiteUrl(env: SiteUrlEnv = process.env): URL {
  const origin =
    parseOrigin(env.SITE_URL) ?? parseOrigin(env.RAILWAY_PUBLIC_DOMAIN) ?? DEFAULT_SITE_URL;

  return new URL(origin);
}

export function toAbsoluteUrl(pathOrUrl: string, siteUrl: URL = resolveSiteUrl()) {
  return new URL(pathOrUrl, siteUrl).toString();
}
