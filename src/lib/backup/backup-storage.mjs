// Where database backups live: the private R2 bucket (R2_PRIVATE_BUCKET_NAME) when
// STORAGE_BACKEND=r2, otherwise storage/private/<key> on local disk (same layout as
// the local private driver in src/lib/storage/local-driver.ts).
//
// Has its own small SigV4 signer because backups need ListObjectsV2 (a signed query
// string), which scripts/lib/r2-client.mjs and src/lib/storage/r2-driver.ts do not do.
import { createHash, createHmac } from "node:crypto";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * @typedef {Record<string, string | undefined>} Env
 * @typedef {{ key: string, size: number, lastModified: Date | null }} BackupObject
 * @typedef {{
 *   kind: "r2" | "local",
 *   location: string,
 *   put(key: string, body: Buffer): Promise<void>,
 *   get(key: string): Promise<Buffer | null>,
 *   head(key: string): Promise<number | null>,
 *   list(prefix: string): Promise<BackupObject[]>,
 *   delete(key: string): Promise<void>,
 * }} BackupStorage
 */

function requireEnv(env, name) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required config for backups: ${name}`);
  }
  return value;
}

/** Validates a backup key so it cannot escape the storage root. */
export function assertSafeKey(key) {
  if (
    typeof key !== "string" ||
    !key ||
    key.startsWith("/") ||
    key.includes("\\") ||
    key.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error(`Invalid backup key: ${key}`);
  }
  return key;
}

/**
 * @param {Env} [env]
 * @param {string} [projectRoot]
 * @returns {BackupStorage}
 */
export function getBackupStorage(env = process.env, projectRoot = process.cwd()) {
  if (env.STORAGE_BACKEND === "r2") {
    return createR2BackupStorage(env);
  }
  return createLocalBackupStorage(path.join(/*turbopackIgnore: true*/ projectRoot, "storage", "private"));
}

// ---------------------------------------------------------------- local

/** @returns {BackupStorage} */
export function createLocalBackupStorage(root) {
  const resolve = (key) => path.join(root, ...assertSafeKey(key).split("/"));

  return {
    kind: "local",
    location: root,
    async put(key, body) {
      const target = resolve(key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, body);
    },
    async get(key) {
      try {
        return await readFile(resolve(key));
      } catch (error) {
        if (error?.code === "ENOENT") return null;
        throw error;
      }
    },
    async head(key) {
      try {
        return (await stat(resolve(key))).size;
      } catch (error) {
        if (error?.code === "ENOENT") return null;
        throw error;
      }
    },
    async list(prefix) {
      const directory = path.join(root, ...prefix.replace(/\/+$/, "").split("/").filter(Boolean));
      let entries;
      try {
        entries = await readdir(directory, { withFileTypes: true });
      } catch (error) {
        if (error?.code === "ENOENT") return [];
        throw error;
      }
      const base = prefix.endsWith("/") ? prefix : `${prefix}/`;
      const objects = [];
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const info = await stat(path.join(directory, entry.name));
        objects.push({ key: `${base}${entry.name}`, size: info.size, lastModified: info.mtime });
      }
      return objects.sort((left, right) => left.key.localeCompare(right.key));
    },
    async delete(key) {
      await rm(resolve(key), { force: true });
    },
  };
}

// ---------------------------------------------------------------- R2

const sha256Hex = (input) => createHash("sha256").update(input).digest("hex");
const hmac = (key, value) => createHmac("sha256", key).update(value).digest();
// RFC 3986 encoding as SigV4 expects (encodeURIComponent leaves !'()* alone).
const uriEncode = (value) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

/**
 * @param {Env} [env]
 * @returns {BackupStorage}
 */
export function createR2BackupStorage(env = process.env) {
  const accountId = requireEnv(env, "R2_ACCOUNT_ID");
  const endpoint = requireEnv(env, "R2_ENDPOINT");
  if (!new URL(endpoint).host.includes(accountId)) {
    throw new Error("R2_ENDPOINT does not match R2_ACCOUNT_ID.");
  }
  const bucket = requireEnv(env, "R2_PRIVATE_BUCKET_NAME");
  if (bucket === env.R2_BUCKET_NAME?.trim()) {
    throw new Error("R2_PRIVATE_BUCKET_NAME must differ from R2_BUCKET_NAME; backups never go to the public bucket.");
  }
  const config = {
    endpoint,
    bucket,
    accessKeyId: requireEnv(env, "R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv(env, "R2_SECRET_ACCESS_KEY"),
  };

  const request = (method, key, { query = {}, body, headers } = {}) =>
    sendSignedRequest(config, { method, key, query, body, headers });

  return {
    kind: "r2",
    location: `r2://${bucket}`,
    async put(key, body) {
      const response = await request("PUT", assertSafeKey(key), {
        body,
        headers: { "content-type": "application/gzip" },
      });
      if (!response.ok) {
        throw new Error(`R2 backup upload failed for ${key}: ${response.status} ${response.statusText} ${await response.text()}`);
      }
    },
    async get(key) {
      const response = await request("GET", assertSafeKey(key));
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`R2 backup download failed for ${key}: ${response.status} ${response.statusText}`);
      }
      return Buffer.from(await response.arrayBuffer());
    },
    async head(key) {
      const response = await request("HEAD", assertSafeKey(key));
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`R2 backup HEAD failed for ${key}: ${response.status} ${response.statusText}`);
      }
      return Number(response.headers.get("content-length") ?? 0);
    },
    async list(prefix) {
      const objects = [];
      let continuationToken;
      do {
        const query = { "list-type": "2", prefix };
        if (continuationToken) query["continuation-token"] = continuationToken;
        const response = await request("GET", "", { query });
        const xml = await response.text();
        if (!response.ok) {
          throw new Error(`R2 backup list failed: ${response.status} ${response.statusText} ${xml}`);
        }
        const page = parseListObjectsXml(xml);
        objects.push(...page.objects);
        continuationToken = page.isTruncated ? page.nextContinuationToken : undefined;
      } while (continuationToken);
      return objects.sort((left, right) => left.key.localeCompare(right.key));
    },
    async delete(key) {
      const response = await request("DELETE", assertSafeKey(key));
      if (!response.ok && response.status !== 404) {
        throw new Error(`R2 backup delete failed for ${key}: ${response.status} ${response.statusText}`);
      }
    },
  };
}

const decodeXml = (value) =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

/** Parses an S3 ListObjectsV2 response. */
export function parseListObjectsXml(xml) {
  const objects = [];
  for (const [, body] of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
    const key = /<Key>([\s\S]*?)<\/Key>/.exec(body)?.[1];
    if (!key) continue;
    const size = Number(/<Size>(\d+)<\/Size>/.exec(body)?.[1] ?? 0);
    const modified = /<LastModified>([^<]+)<\/LastModified>/.exec(body)?.[1];
    objects.push({ key: decodeXml(key), size, lastModified: modified ? new Date(modified) : null });
  }
  const isTruncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
  const token = /<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(xml)?.[1];
  return { objects, isTruncated, nextContinuationToken: token ? decodeXml(token) : undefined };
}

async function sendSignedRequest(config, { method, key, query, body, headers: extra = {} }) {
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const endpointUrl = new URL(config.endpoint);
  const canonicalUri = key
    ? `/${config.bucket}/${key.split("/").map(uriEncode).join("/")}`
    : `/${config.bucket}`;
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((name) => `${uriEncode(name)}=${uriEncode(query[name])}`)
    .join("&");
  const payloadHash = sha256Hex(body ?? "");
  const headers = new Map([
    ["host", endpointUrl.host],
    ["x-amz-content-sha256", payloadHash],
    ["x-amz-date", amzDate],
  ]);
  for (const [name, value] of Object.entries(extra)) {
    if (value) headers.set(name.toLowerCase(), value);
  }

  const signedHeaders = [...headers.keys()].sort().join(";");
  const canonicalHeaders = [...headers.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}:${value.trim()}\n`)
    .join("");
  const canonicalRequest = [method, canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${config.secretAccessKey}`, dateStamp), "auto"), "s3"), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  const requestHeaders = new Headers();
  for (const [name, value] of headers.entries()) requestHeaders.set(name, value);
  requestHeaders.set(
    "Authorization",
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  );

  const url = new URL(canonicalUri, endpointUrl);
  url.search = canonicalQuery;
  return fetch(url, { method, headers: requestHeaders, body: body ? new Uint8Array(body) : undefined });
}
