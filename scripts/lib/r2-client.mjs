// Minimal SigV4 client for Cloudflare R2, mirroring src/lib/storage/r2-driver.ts
// for standalone Node scripts that cannot import the app's TypeScript modules.
import { createHash, createHmac } from "node:crypto";

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required R2 config: ${name}`);
  }
  return value;
}

export function getR2Config() {
  const accountId = getRequiredEnv("R2_ACCOUNT_ID");
  const endpoint = getRequiredEnv("R2_ENDPOINT");

  if (!new URL(endpoint).host.includes(accountId)) {
    throw new Error("R2_ENDPOINT does not match R2_ACCOUNT_ID.");
  }

  return {
    accountId,
    accessKeyId: getRequiredEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: getRequiredEnv("R2_SECRET_ACCESS_KEY"),
    bucketName: getRequiredEnv("R2_BUCKET_NAME"),
    publicBaseUrl: getRequiredEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, ""),
    endpoint,
  };
}

const sha256Hex = (input) => createHash("sha256").update(input).digest("hex");
const hmac = (key, value) => createHmac("sha256", key).update(value).digest();

function getSigningKey(secretAccessKey, dateStamp) {
  return hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), "auto"), "s3"), "aws4_request");
}

const encodeKeyPath = (key) => key.split("/").map((s) => encodeURIComponent(s)).join("/");

export function buildR2PublicUrl(config, key) {
  return `${config.publicBaseUrl}/${key.replace(/^\/+/, "")}`;
}

export async function putR2Object(config, { key, body, contentType, cacheControl }) {
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const endpointUrl = new URL(config.endpoint);
  const normalizedKey = key.replace(/^\/+/, "");
  const canonicalUri = `/${config.bucketName}/${encodeKeyPath(normalizedKey)}`;
  const payloadHash = sha256Hex(body);
  const headers = new Map([
    ["content-type", contentType],
    ["host", endpointUrl.host],
    ["x-amz-content-sha256", payloadHash],
    ["x-amz-date", amzDate],
  ]);

  if (cacheControl) {
    headers.set("cache-control", cacheControl);
  }

  const signedHeaders = [...headers.keys()].sort().join(";");
  const canonicalHeaders = [...headers.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([header, value]) => `${header}:${value.trim()}\n`)
    .join("");
  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256Hex(canonicalRequest)].join("\n");
  const signature = createHmac("sha256", getSigningKey(config.secretAccessKey, dateStamp))
    .update(stringToSign)
    .digest("hex");

  const requestHeaders = new Headers();
  for (const [header, value] of headers.entries()) {
    requestHeaders.set(header, value);
  }
  requestHeaders.set(
    "Authorization",
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  );

  const response = await fetch(new URL(canonicalUri, endpointUrl), {
    method: "PUT",
    headers: requestHeaders,
    body: new Uint8Array(body),
  });

  if (!response.ok) {
    throw new Error(
      `R2 upload failed for ${normalizedKey} with ${response.status} ${response.statusText}: ${await response.text()}`,
    );
  }

  return { key: normalizedKey, url: buildR2PublicUrl(config, normalizedKey) };
}
