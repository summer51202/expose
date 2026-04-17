import { NextResponse } from "next/server";

import { getAnalyticsTimezone } from "@/lib/analytics/date";
import { parseAnalyticsPageViewRequest } from "@/lib/analytics/page-view-request";
import { getAnalyticsRepository } from "@/lib/analytics/repository";
import { trackAnalyticsPageView } from "@/lib/analytics/tracker";
import { getAdminSession } from "@/lib/auth/session";
import { getOrCreateVisitorId } from "@/lib/likes/identity";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid analytics payload." }, { status: 400 });
  }

  const input = parseAnalyticsPageViewRequest(body);
  if (!input) {
    return NextResponse.json({ error: "Invalid analytics payload." }, { status: 400 });
  }

  await trackAnalyticsPageView(input, {
    now: new Date(),
    timezone: getAnalyticsTimezone(),
    repository: getAnalyticsRepository(),
    getVisitorId: getOrCreateVisitorId,
    getAdminSession,
  });

  return NextResponse.json({ ok: true });
}
