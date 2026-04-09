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

export const r2StorageDriver: StorageDriver = {
  async putObject({ key, body, contentType, cacheControl }) {
    const config = getR2Config();
    const now = new Date();
    const amzDate = formatAmzDate(now);
    const dateStamp = amzDate.slice(0, 8);
    const endpointUrl = new URL(config.endpoint);
    const canonicalUri = `/${config.bucketName}/${encodeKeyPath(key.replace(/^\/+/, ""))}`;
    const payloadHash = sha256Hex(body);
    const host = endpointUrl.host;
    const headers = new Map<string, string>([
      ["content-type", contentType],
      ["host", host],
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

    const canonicalRequest = [
      "PUT",
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

    const response = await fetch(new URL(canonicalUri, endpointUrl), {
      method: "PUT",
      headers: requestHeaders,
      body: new Uint8Array(body),
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
};
