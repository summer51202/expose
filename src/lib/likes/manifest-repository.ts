import "server-only";

import { getDataFilePath, readJsonArrayFile, writeJsonFile } from "@/lib/data/json-store";
import type { PhotoLikeRecord } from "@/types/like";

const manifestPath = getDataFilePath("likes.json");

async function readManifest(): Promise<PhotoLikeRecord[]> {
  return readJsonArrayFile<PhotoLikeRecord>(manifestPath);
}

async function writeManifest(records: PhotoLikeRecord[]) {
  await writeJsonFile(manifestPath, records);
}

export async function listManifestLikes() {
  const records = await readManifest();
  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function appendManifestLike(record: PhotoLikeRecord) {
  const current = await readManifest();
  await writeManifest([record, ...current]);
}

export async function replaceManifestLikes(records: PhotoLikeRecord[]) {
  await writeManifest(records);
}
