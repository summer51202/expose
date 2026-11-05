import "server-only";

import { localStorageDriver } from "@/lib/storage/local-driver";
import { r2StorageDriver } from "@/lib/storage/r2-driver";
import type { StorageDriver } from "@/lib/storage/types";

export type StorageBackend = "local" | "r2";

export function getStorageBackend(): StorageBackend {
  return process.env.STORAGE_BACKEND === "r2" ? "r2" : "local";
}

export function getStorageDriverFor(backend: StorageBackend): StorageDriver {
  return backend === "r2" ? r2StorageDriver : localStorageDriver;
}

export function getStorageDriver(): StorageDriver {
  return getStorageDriverFor(getStorageBackend());
}
