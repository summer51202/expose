import { createHmac } from "node:crypto";

type HashCommentIdentityInput = {
  forwardedFor: string;
  realIp: string;
  userAgent: string;
  secret: string;
};

function normalizeForwardedFor(value: string) {
  return value.split(",")[0]?.trim() ?? "";
}

export function hashCommentIdentity({
  forwardedFor,
  realIp,
  userAgent,
  secret,
}: HashCommentIdentityInput) {
  const normalizedForwardedFor = normalizeForwardedFor(forwardedFor);
  const fingerprint = `${normalizedForwardedFor}|${realIp.trim()}|${userAgent.trim()}`;

  return createHmac("sha256", secret)
    .update(fingerprint || "anonymous")
    .digest("hex");
}
