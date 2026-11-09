import "server-only";

import { localPrivateStorageDriver, localStorageDriver } from "@/lib/storage/local-driver";
import { getR2PrivateConfig, r2PrivateStorageDriver, r2StorageDriver } from "@/lib/storage/r2-driver";
import type { PrivateStorageDriver, StorageDriver } from "@/lib/storage/types";

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

/** Private storage for photo originals (no public URL); server-only reads by key. */
export function getPrivateStorageDriverFor(backend: StorageBackend): PrivateStorageDriver {
  return backend === "r2" ? r2PrivateStorageDriver : localPrivateStorageDriver;
}

export function getPrivateStorageDriver(): PrivateStorageDriver {
  return getPrivateStorageDriverFor(getStorageBackend());
}

/**
 * Throws PrivateStorageConfigError when originals cannot be stored privately
 * (STORAGE_BACKEND=r2 without R2_PRIVATE_BUCKET_NAME). Call before writing anything.
 */
export function assertPrivateStorageReady(backend: StorageBackend = getStorageBackend()) {
  if (backend === "r2") {
    getR2PrivateConfig();
  }
}

/** Reads a photo original from private storage. Server-only; returns null when missing. */
export async function readPrivateOriginal(key: string, backend: StorageBackend = getStorageBackend()) {
  return getPrivateStorageDriverFor(backend).getObject(key);
}
