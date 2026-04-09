import "server-only";

import { getDataFilePath, readJsonArrayFile, writeJsonFile } from "@/lib/data/json-store";
import type { CommentRecord } from "@/types/comment";

const manifestPath = getDataFilePath("comments.json");

async function readManifest(): Promise<CommentRecord[]> {
  return readJsonArrayFile<CommentRecord>(manifestPath);
}

async function writeManifest(records: CommentRecord[]) {
  await writeJsonFile(manifestPath, records);
}

export async function listManifestComments() {
  const records = await readManifest();
  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function appendManifestComment(record: CommentRecord) {
  const current = await readManifest();
  await writeManifest([record, ...current]);
}

export async function deleteManifestComment(commentId: number) {
  const current = await readManifest();
  await writeManifest(current.filter((comment) => comment.id !== commentId));
}
