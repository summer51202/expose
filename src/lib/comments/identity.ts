import "server-only";

import { createHash } from "node:crypto";

import { headers } from "next/headers";

export async function getVisitorHash() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for") ?? "";
  const realIp = headerStore.get("x-real-ip") ?? "";
  const userAgent = headerStore.get("user-agent") ?? "";
  const fingerprint = `${forwardedFor}|${realIp}|${userAgent}`;

  return createHash("sha256").update(fingerprint || "anonymous").digest("hex");
}
