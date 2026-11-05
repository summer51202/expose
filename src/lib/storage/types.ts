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
