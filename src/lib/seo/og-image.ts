import { readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;
export const OG_IMAGE_CONTENT_TYPE = "image/jpeg";

const FALLBACK_BACKGROUND = { r: 28, g: 25, b: 23 };
const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

type ImageSourceOptions = {
  publicDir?: string;
  allowedRemoteHosts?: string[];
};

function getAllowedRemoteHosts() {
  const base = process.env.R2_PUBLIC_BASE_URL?.trim();

  if (!base) {
    return [];
  }

  try {
    return [new URL(base).host];
  } catch {
    return [];
  }
}

/**
 * Resolves a stored photo URL to something we can read on the server.
 * Only local files under /public and the configured R2 public host are allowed,
 * so a bad URL in the data store cannot turn this into an open fetch proxy.
 */
export function resolveImageSource(
  imageUrl: string,
  { publicDir = path.join(process.cwd(), "public"), allowedRemoteHosts = getAllowedRemoteHosts() }: ImageSourceOptions = {},
): { kind: "file"; filePath: string } | { kind: "remote"; url: string } | null {
  const trimmed = imageUrl.trim();

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return allowedRemoteHosts.includes(url.host) ? { kind: "remote", url: url.toString() } : null;
    } catch {
      return null;
    }
  }

  if (!trimmed.startsWith("/")) {
    return null;
  }

  let pathname: string;

  try {
    pathname = decodeURIComponent(trimmed.split(/[?#]/)[0]);
  } catch {
    return null;
  }

  const resolvedPublicDir = path.resolve(publicDir);
  const filePath = path.resolve(resolvedPublicDir, `.${pathname}`);

  if (!filePath.startsWith(resolvedPublicDir + path.sep)) {
    return null;
  }

  return { kind: "file", filePath };
}

async function loadImageBuffer(imageUrl: string) {
  const source = resolveImageSource(imageUrl);

  if (!source) {
    return null;
  }

  try {
    if (source.kind === "file") {
      return await readFile(source.filePath);
    }

    const response = await fetch(source.url, { signal: AbortSignal.timeout(8000) });

    if (!response.ok) {
      return null;
    }

    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

function fallbackImage() {
  return sharp({
    create: {
      ...OG_IMAGE_SIZE,
      channels: 3,
      background: FALLBACK_BACKGROUND,
    },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
}

/**
 * Builds a 1200×630 JPEG share preview from a stored photo.
 * JPEG (not WebP) because some link-preview crawlers, notably LINE, do not render WebP.
 */
export async function renderOgImage(imageUrl: string | null | undefined) {
  const input = imageUrl ? await loadImageBuffer(imageUrl) : null;
  let body: Buffer;

  try {
    body = input
      ? await sharp(input)
          .rotate()
          .resize({ ...OG_IMAGE_SIZE, fit: "cover", position: sharp.strategy.attention })
          .jpeg({ quality: 82, mozjpeg: true })
          .toBuffer()
      : await fallbackImage();
  } catch {
    body = await fallbackImage();
  }

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": OG_IMAGE_CONTENT_TYPE,
      "Cache-Control": CACHE_CONTROL,
    },
  });
}
