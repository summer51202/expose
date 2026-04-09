import "server-only";

import { headers } from "next/headers";

import { hashLimiterIdentity } from "@/lib/security/rate-limit";

function getFirstForwardedAddress(value: string | null) {
  return value?.split(",")[0]?.trim() ?? "";
}

export async function getRequestIdentityParts() {
  const headerStore = await headers();
  const forwardedFor = getFirstForwardedAddress(headerStore.get("x-forwarded-for"));
  const realIp = headerStore.get("x-real-ip")?.trim() ?? "";
  const userAgent = headerStore.get("user-agent")?.trim() ?? "";

  return {
    forwardedFor,
    realIp,
    userAgent,
  };
}

export async function getHashedRequestFingerprint() {
  const { forwardedFor, realIp, userAgent } = await getRequestIdentityParts();
  return hashLimiterIdentity(`${forwardedFor}|${realIp}|${userAgent}`);
}
