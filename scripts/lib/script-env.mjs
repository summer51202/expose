import { readFileSync } from "node:fs";
import path from "node:path";

/** Loads .env into process.env without overriding variables already set by the shell. */
export function loadEnvFile(projectRoot = process.cwd()) {
  try {
    const content = readFileSync(path.join(projectRoot, ".env"), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) {
        continue;
      }

      const [, key, rawValue] = match;
      const value = rawValue.replace(/^"/, "").replace(/"$/, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore missing .env in environments that inject vars another way.
  }
}
