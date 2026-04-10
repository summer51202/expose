import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const projectRoot = process.cwd();

function loadEnvFile() {
  try {
    const envPath = path.join(projectRoot, ".env");
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) {
        continue;
      }

      const [, key, rawValue] = match;
      const value = rawValue.replace(/^"/, "").replace(/"$/, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore missing .env in environments that inject vars another way.
  }
}

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required R2 config: ${name}`);
  }
  return value;
}

function getR2Config() {
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

function sha256Hex(input) {
  return createHash("sha256").update(input).digest("hex");
}

function hmac(key, value) {
  return createHmac("sha256", key).update(value).digest();
}

function getSigningKey(secretAccessKey, dateStamp) {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, "auto");
  const kService = hmac(kRegion, "s3");
  return hmac(kService, "aws4_request");
}

function formatAmzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function encodeKeyPath(key) {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildPublicUrl(publicBaseUrl, key) {
  return `${publicBaseUrl}/${key.replace(/^\/+/, "")}`;
}

async function putObject(config, { key, body, contentType, cacheControl }) {
  const now = new Date();
  const amzDate = formatAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const endpointUrl = new URL(config.endpoint);
  const normalizedKey = key.replace(/^\/+/, "");
  const canonicalUri = `/${config.bucketName}/${encodeKeyPath(normalizedKey)}`;
  const payloadHash = sha256Hex(body);
  const host = endpointUrl.host;
  const headers = new Map([
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

  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
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
    throw new Error(
      `R2 upload failed for ${normalizedKey} with ${response.status} ${response.statusText}: ${await response.text()}`,
    );
  }

  return {
    key: normalizedKey,
    url: buildPublicUrl(config.publicBaseUrl, normalizedKey),
  };
}

function getLocalAbsolutePath(urlOrKey) {
  const normalized = urlOrKey.replace(/^\/+/, "");
  return path.join(projectRoot, "public", normalized);
}

async function migratePhoto(config, photo) {
  const uploads = [
    {
      field: "original",
      currentUrl: photo.originalUrl,
      currentKey: photo.originalKey ?? photo.originalUrl,
      contentType: "image/webp",
    },
    {
      field: "medium",
      currentUrl: photo.mediumUrl,
      currentKey: photo.mediumKey ?? photo.mediumUrl,
      contentType: "image/webp",
    },
    {
      field: "thumbnail",
      currentUrl: photo.thumbnailUrl,
      currentKey: photo.thumbnailKey ?? photo.thumbnailUrl,
      contentType: "image/webp",
    },
  ];

  const migrated = {};

  for (const asset of uploads) {
    const sourceKey = asset.currentKey ?? asset.currentUrl;
    const absolutePath = getLocalAbsolutePath(sourceKey);
    const body = await readFile(absolutePath);
    const normalizedKey = sourceKey.replace(/^\/+/, "");

    migrated[asset.field] = await putObject(config, {
      key: normalizedKey,
      body,
      contentType: asset.contentType,
      cacheControl: "public, max-age=31536000, immutable",
    });
  }

  await prisma.photo.update({
    where: { id: photo.id },
    data: {
      originalUrl: migrated.original.url,
      originalKey: migrated.original.key,
      mediumUrl: migrated.medium.url,
      mediumKey: migrated.medium.key,
      thumbnailUrl: migrated.thumbnail.url,
      thumbnailKey: migrated.thumbnail.key,
      storageProvider: "r2",
    },
  });

  return {
    id: photo.id.toString(),
    originalUrl: migrated.original.url,
    mediumUrl: migrated.medium.url,
    thumbnailUrl: migrated.thumbnail.url,
  };
}

async function main() {
  loadEnvFile();
  const config = getR2Config();
  const localPhotos = await prisma.photo.findMany({
    where: {
      storageProvider: "local",
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (localPhotos.length === 0) {
    console.log("No local photos found. Nothing to migrate.");
    return;
  }

  console.log(`Found ${localPhotos.length} local photos to migrate.`);
  const migrated = [];

  for (const photo of localPhotos) {
    const result = await migratePhoto(config, photo);
    migrated.push(result);
    console.log(`Migrated photo ${result.id}`);
  }

  console.log("R2 migration completed.");
  console.log(JSON.stringify(migrated.slice(-3), null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
