import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * siteConfig.photographerName from src/config/site.ts, which scripts cannot import.
 * A test checks this returns the same value as the app's siteConfig.
 * @param {string} source contents of src/config/site.ts
 */
export function parsePhotographerName(source) {
  const match = source.match(/\bphotographerName:\s*(["'])(.*?)\1/);
  if (!match?.[2]) {
    throw new Error("Could not find siteConfig.photographerName in src/config/site.ts.");
  }
  return match[2];
}

export function readPhotographerName(projectRoot = process.cwd()) {
  return parsePhotographerName(readFileSync(path.join(projectRoot, "src", "config", "site.ts"), "utf8"));
}
