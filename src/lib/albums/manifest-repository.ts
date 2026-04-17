import { getDataFilePath, readJsonArrayFile, writeJsonFile } from "@/lib/data/json-store";
import type { AlbumRecord } from "@/types/album";

const manifestPath = getDataFilePath("albums.json");

async function readAlbumManifest(): Promise<AlbumRecord[]> {
  return readJsonArrayFile<AlbumRecord>(manifestPath);
}

async function writeAlbumManifest(records: AlbumRecord[]) {
  await writeJsonFile(manifestPath, records);
}

export async function listManifestAlbums() {
  const records = await readAlbumManifest();
  return records.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "zh-Hant"));
}

export async function createManifestAlbum(record: AlbumRecord) {
  const current = await readAlbumManifest();
  await writeAlbumManifest([...current, record]);
}

export async function updateManifestAlbum(
  albumId: number,
  updater: (record: AlbumRecord) => AlbumRecord,
) {
  const current = await readAlbumManifest();
  const next = current.map((record) => (record.id === albumId ? updater(record) : record));

  await writeAlbumManifest(next);
}

export async function deleteManifestAlbum(albumId: number) {
  const current = await readAlbumManifest();
  await writeAlbumManifest(current.filter((record) => record.id !== albumId));
}
