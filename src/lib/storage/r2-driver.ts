import { createHash, createHmac } from "node:crypto";

import { UploadStorageError } from "@/lib/security/errors";
import type { StorageDriver } from "@/lib/storage/types";

const R2_REGION = "auto";
const R2_SERVICE = "s3";

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicBaseUrl: string;
  endpoint: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required R2 config: ${name}`);
  }

  return value;
}

function getR2Config(): R2Config {
  const accountId = getRequiredEnv("R2_ACCOUNT_ID");
  const endpoint = getRequiredEnv("R2_ENDPOINT");
  const endpointHost = new URL(endpoint).host;

  if (!endpointHost.includes(accountId)) {
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

function sha256Hex(input: string | Buffer) {
  return createHash("sha256").update(input).digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function getSigningKey(secretAccessKey: string, dateStamp: string) {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, R2_REGION);
  const kService = hmac(kRegion, R2_SERVICE);
  return hmac(kService, "aws4_request");
}

function formatAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function encodeKeyPath(key: string) {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildPublicUrl(publicBaseUrl: string, key: string) {
  return `${publicBaseUrl}/${key.replace(/^\/+/, "")}`;
}

/** Sends an AWS SigV4-signed request for one object in the configured bucket. */
async function sendSignedObjectRequest(
  config: R2Config,
  {
    method,
    key,
    body,
    extraHeaders = {},
  }: {
    method: "PUT" | "DELETE";
    key: string;
    body?: Buffer;
    extraHeaders?: Record<string, string>;
  },
) {
  const now = new Date();
  const amzDate = formatAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const endpointUrl = new URL(config.endpoint);
  const canonicalUri = `/${config.bucketName}/${encodeKeyPath(key.replace(/^\/+/, ""))}`;
  const payloadHash = sha256Hex(body ?? "");
  const headers = new Map<string, string>([
    ["host", endpointUrl.host],
    ["x-amz-content-sha256", payloadHash],
    ["x-amz-date", amzDate],
  ]);

  for (const [header, value] of Object.entries(extraHeaders)) {
    headers.set(header.toLowerCase(), value);
  }

  const signedHeaders = [...headers.keys()].sort().join(";");
  const canonicalHeaders = [...headers.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([header, value]) => `${header}:${value.trim()}\n`)
    .join("");

  const canonicalRequest = [
    method,
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${R2_REGION}/${R2_SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signature = createHmac("sha256", getSigningKey(config.secretAccessKey, dateStamp))
    .update(stringToSign)
    .digest("hex");
  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(", ");

  const requestHeaders = new Headers();
  for (const [header, value] of headers.entries()) {
    requestHeaders.set(header, value);
  }
  requestHeaders.set("Authorization", authorization);

  return fetch(new URL(canonicalUri, endpointUrl), {
    method,
    headers: requestHeaders,
    body: body ? new Uint8Array(body) : undefined,
  });
}

export const r2StorageDriver: StorageDriver = {
  async putObject({ key, body, contentType, cacheControl }) {
    const config = getR2Config();
    const response = await sendSignedObjectRequest(config, {
      method: "PUT",
      key,
      body,
      extraHeaders: {
        "content-type": contentType,
        ...(cacheControl ? { "cache-control": cacheControl } : {}),
      },
    });

    if (!response.ok) {
      throw new UploadStorageError(
        `R2 upload failed with ${response.status} ${response.statusText}.`,
      );
    }

    return {
      key,
      url: buildPublicUrl(config.publicBaseUrl, key),
    };
  },
  async deleteObject(key) {
    const config = getR2Config();
    const response = await sendSignedObjectRequest(config, { method: "DELETE", key });

    // S3/R2 return 204 for deletes, including keys that never existed.
    if (!response.ok && response.status !== 404) {
      throw new Error(`R2 delete failed for ${key} with ${response.status} ${response.statusText}.`);
    }
  },
};
