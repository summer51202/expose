import "server-only";

import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";

const VISITOR_COOKIE = "expose_visitor_id";
const VISITOR_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 365;

export async function getVisitorId() {
  const cookieStore = await cookies();
  return cookieStore.get(VISITOR_COOKIE)?.value ?? null;
}

export async function getOrCreateVisitorId() {
  const cookieStore = await cookies();
  const existingVisitorId = cookieStore.get(VISITOR_COOKIE)?.value;

  if (existingVisitorId) {
    return existingVisitorId;
  }

  const visitorId = randomUUID();
  cookieStore.set(VISITOR_COOKIE, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VISITOR_COOKIE_TTL_SECONDS,
  });

  return visitorId;
}
