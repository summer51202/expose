import { getDataFilePath, readJsonArrayFile, writeJsonFile } from "@/lib/data/json-store";
import type { PhotoRecord } from "@/types/photo";

const manifestPath = getDataFilePath("photos.json");

async function readManifest(): Promise<PhotoRecord[]> {
  return readJsonArrayFile<PhotoRecord>(manifestPath);
}

async function writeManifest(records: PhotoRecord[]) {
  await writeJsonFile(manifestPath, records);
}

export async function listManifestPhotos() {
  const records = await readManifest();
  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveManifestPhotos(records: PhotoRecord[]) {
  const current = await readManifest();
  await writeManifest([...records, ...current]);
}

export async function replaceManifestPhotos(records: PhotoRecord[]) {
  await writeManifest(records);
}
