import "server-only";

import { headers } from "next/headers";

import { hashCommentIdentity } from "@/lib/comments/identity-hash";

export async function getVisitorHash() {
  const headerStore = await headers();
  const secret =
    process.env.COMMENT_IDENTITY_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "local-dev-comment-identity-secret-change-me";

  return hashCommentIdentity({
    forwardedFor: headerStore.get("x-forwarded-for") ?? "",
    realIp: headerStore.get("x-real-ip") ?? "",
    userAgent: headerStore.get("user-agent") ?? "",
    secret,
  });
}
