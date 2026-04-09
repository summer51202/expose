import "server-only";

import { timingSafeEqual } from "node:crypto";

import { getAuthConfig } from "@/lib/auth/config";

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyAdminCredentials(input: {
  username: string;
  password: string;
}) {
  const config = getAuthConfig();

  return (
    safeCompare(input.username, config.username) &&
    safeCompare(input.password, config.password)
  );
}
