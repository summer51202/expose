import { NextResponse } from "next/server";

import { decodeFeedCursor, parseLimitParam } from "@/lib/photos/photo-feed";
import { getPhotoFeedBatch } from "@/lib/photos/queries";

// Reads the data store on every request.
export const dynamic = "force-dynamic";

/**
 * GET /api/photos?cursor=<opaque>&limit=<1-48>
 *
 * Next batch of the home photo wall, newest first. Returns slim grid payloads
 * (see `toGridPhoto`): no original URL, EXIF or description.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawCursor = searchParams.get("cursor");
  const cursor = rawCursor === null || rawCursor === "" ? null : decodeFeedCursor(rawCursor);

  if (rawCursor && !cursor) {
    return NextResponse.json({ error: "Invalid cursor." }, { status: 400 });
  }

  const batch = await getPhotoFeedBatch({
    cursor,
    limit: parseLimitParam(searchParams.get("limit")),
  });

  return NextResponse.json(batch, {
    headers: { "Cache-Control": "no-store" },
  });
}
