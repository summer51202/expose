import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");

function stripBom(content: string) {
  return content.replace(/^\uFEFF/, "");
}

export function getDataFilePath(fileName: string) {
  return path.join(dataDir, fileName);
}

export async function ensureJsonArrayFile(filePath: string) {
  await mkdir(path.dirname(filePath), { recursive: true });

  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, "[]", "utf8");
  }
}

export async function readJsonArrayFile<T>(filePath: string): Promise<T[]> {
  await ensureJsonArrayFile(filePath);
  const content = await readFile(filePath, "utf8");
  const parsed = JSON.parse(stripBom(content)) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected ${filePath} to contain a JSON array.`);
  }

  return parsed as T[];
}

export async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}
