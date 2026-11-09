export type StoredObject = {
  key: string;
  url: string;
};

export interface StorageDriver {
  putObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
    cacheControl?: string;
  }): Promise<StoredObject>;
  /** Removes an object. Resolves without error when the object does not exist. */
  deleteObject(key: string): Promise<void>;
}

/**
 * Storage for objects that must never be reachable from the internet (photo originals).
 * There is no URL: only server code can read them back, by key.
 */
export interface PrivateStorageDriver {
  putObject(input: { key: string; body: Buffer; contentType: string }): Promise<{ key: string }>;
  /** The object's bytes, or null when it does not exist. */
  getObject(key: string): Promise<Buffer | null>;
  /** Removes an object. Resolves without error when the object does not exist. */
  deleteObject(key: string): Promise<void>;
}
