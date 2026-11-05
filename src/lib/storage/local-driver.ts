import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StorageDriver } from "@/lib/storage/types";
import { joinPublicPath } from "@/lib/storage/url";

const LOCAL_UPLOAD_ROOT = path.join(process.cwd(), "public");
const LOCAL_DELETABLE_ROOT = path.join(LOCAL_UPLOAD_ROOT, "uploads");

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
