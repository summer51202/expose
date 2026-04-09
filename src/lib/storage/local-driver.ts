import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StorageDriver } from "@/lib/storage/types";
import { joinPublicPath } from "@/lib/storage/url";

const LOCAL_UPLOAD_ROOT = path.join(process.cwd(), "public");

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
};
