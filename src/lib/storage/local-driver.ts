import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { PrivateStorageDriver, StorageDriver } from "@/lib/storage/types";
import { joinPublicPath } from "@/lib/storage/url";

const LOCAL_UPLOAD_ROOT = path.join(process.cwd(), "public");
const LOCAL_DELETABLE_ROOT = path.join(LOCAL_UPLOAD_ROOT, "uploads");
/** Outside public/, so Next never serves it. Gitignored. */
export const LOCAL_PRIVATE_ROOT = path.join(process.cwd(), "storage", "private");

/** Absolute path for a key, or null when the key escapes public/uploads. */
export function resolveDeletableLocalPath(key: string, uploadsRoot = LOCAL_DELETABLE_ROOT) {
  const relativePath = key.replace(/\\/g, "/").replace(/^\/+/, "");
  const absolutePath = path.resolve(path.dirname(uploadsRoot), relativePath);
  const relativeToRoot = path.relative(uploadsRoot, absolutePath);

  if (!relativeToRoot || relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return null;
  }

  return absolutePath;
}

export const localStorageDriver: StorageDriver = {
  async putObject({ key, body }) {
    const relativePath = key.replace(/\\/g, "/");
    const absolutePath = path.join(LOCAL_UPLOAD_ROOT, relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, body);

    return {
      key: relativePath,
      url: joinPublicPath(relativePath),
    };
  },
  async deleteObject(key) {
    const absolutePath = resolveDeletableLocalPath(key);

    if (!absolutePath) {
      throw new Error(`Refusing to delete local file outside public/uploads: ${key}`);
    }

    await rm(absolutePath, { force: true });
  },
};

function normalizePrivateKey(key: string) {
  return key.replace(/\\/g, "/").replace(/^\/+/, "");
}

/** Absolute path for a private key, or null when the key escapes storage/private. */
export function resolvePrivateLocalPath(key: string, privateRoot = LOCAL_PRIVATE_ROOT) {
  const relativePath = normalizePrivateKey(key);
  const absolutePath = path.resolve(privateRoot, relativePath);
  const relativeToRoot = path.relative(privateRoot, absolutePath);

  if (!relativeToRoot || relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return null;
  }

  return absolutePath;
}

function requirePrivateLocalPath(key: string) {
  const absolutePath = resolvePrivateLocalPath(key);

  if (!absolutePath) {
    throw new Error(`Refusing to touch local file outside storage/private: ${key}`);
  }

  return absolutePath;
}

export const localPrivateStorageDriver: PrivateStorageDriver = {
  async putObject({ key, body }) {
    const absolutePath = requirePrivateLocalPath(key);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, body);

    return { key: normalizePrivateKey(key) };
  },
  async getObject(key) {
    try {
      // Local dev only (storage/private); keep Turbopack from tracing the whole project.
      return await readFile(/*turbopackIgnore: true*/ requirePrivateLocalPath(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  },
  async deleteObject(key) {
    await rm(requirePrivateLocalPath(key), { force: true });
  },
};
