import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import type { PhotoRecord } from "@/types/photo";

// The repository imports "server-only" (provided by Next.js at build time, not
// installed as a package), and the JSON store resolves data/ from the working
// directory. So the real JSON repository runs in a child process inside a
// temporary directory, with "server-only" stubbed by a resolve hook.
function serverOnlyStubHook(stubUrl: string) {
  return `data:text/javascript,${encodeURIComponent(`
    import { registerHooks } from "node:module";
    registerHooks({
      resolve(specifier, context, nextResolve) {
        if (specifier === "server-only") {
          return { url: ${JSON.stringify(stubUrl)}, format: "commonjs", shortCircuit: true };
        }
        return nextResolve(specifier, context);
      },
    });
  `)}`;
}
const projectRoot = process.cwd();
const tsxLoaderUrl = pathToFileURL(path.join(projectRoot, "node_modules/tsx/dist/loader.mjs")).href;
const repositoryUrl = pathToFileURL(path.join(projectRoot, "src/lib/photos/repository.ts")).href;

function photo(id: number, overrides: Partial<PhotoRecord> = {}): PhotoRecord {
  return {
    id,
    title: `IMG ${id}`,
    createdAt: new Date(Date.UTC(2026, 0, id)).toISOString(),
    width: 3000,
    height: 2000,
    originalUrl: `private:uploads/${id}-original.webp`,
    mediumUrl: `/uploads/${id}-medium.webp`,
    thumbnailUrl: `/uploads/${id}-thumb.webp`,
    albumId: 10,
    albumName: "Tokyo",
    albumSlug: "tokyo",
    source: "uploaded",
    ...overrides,
  };
}

test("JSON photo repository updatePhotoText writes only the patched photos", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "expose-photo-text-"));

  try {
    mkdirSync(path.join(dir, "data"));
    const before = [
      photo(1, { description: "keep", location: "Asakusa" }),
      photo(2),
      photo(3, { location: "Shibuya" }),
      photo(4),
      photo(5),
    ];
    writeFileSync(path.join(dir, "data", "photos.json"), JSON.stringify(before, null, 2));
    const stubPath = path.join(dir, "server-only-stub.cjs");
    writeFileSync(stubPath, "");

    const script = `
      const mod = await import(${JSON.stringify(repositoryUrl)});
      const { getPhotoRepository } = mod.getPhotoRepository ? mod : mod.default;
      const updated = await getPhotoRepository().updatePhotoText([
        { id: 1, title: "淺草寺的早晨" },
        { id: 3, location: null, description: "Crossing at night" },
        { id: 4, title: "Tokyo Tower" },
        { id: 404, title: "missing" },
      ]);
      process.stdout.write(JSON.stringify(updated.map((p) => p.id)));
    `;
    const output = execFileSync(
      process.execPath,
      ["--import", serverOnlyStubHook(pathToFileURL(stubPath).href), "--import", tsxLoaderUrl, "--input-type=module", "-e", script],
      {
        cwd: dir,
        env: {
          ...process.env,
          DATA_BACKEND: "json",
          TSX_TSCONFIG_PATH: path.join(projectRoot, "tsconfig.json"),
        },
        encoding: "utf8",
      },
    );

    assert.deepEqual(JSON.parse(output), [1, 3, 4]);

    const after = JSON.parse(readFileSync(path.join(dir, "data", "photos.json"), "utf8")) as PhotoRecord[];
    const byId = new Map(after.map((record) => [record.id, record]));

    assert.equal(after.length, 5);
    assert.deepEqual(byId.get(1), { ...before[0], title: "淺草寺的早晨" });
    assert.deepEqual(byId.get(2), before[1]);
    const { location: _removed, ...photo3WithoutLocation } = before[2];
    void _removed;
    assert.deepEqual(byId.get(3), { ...photo3WithoutLocation, description: "Crossing at night" });
    assert.deepEqual(byId.get(4), { ...before[3], title: "Tokyo Tower" });
    assert.deepEqual(byId.get(5), before[4]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
