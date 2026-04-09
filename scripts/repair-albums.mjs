import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data");
const albumsPath = path.join(dataDir, "albums.json");
const photosPath = path.join(dataDir, "photos.json");

function stripBom(content) {
  return content.replace(/^\uFEFF/, "");
}

function createAlbumSlug(name, fallbackId) {
  const baseSlug = String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return baseSlug || `album-${String(fallbackId).toLowerCase()}`;
}

async function readJsonArray(filePath) {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(stripBom(raw));
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function main() {
  const [albums, photos] = await Promise.all([
    readJsonArray(albumsPath),
    readJsonArray(photosPath),
  ]);

  const usedSlugs = new Set();
  const slugMap = new Map();

  const repairedAlbums = albums.map((album) => {
    const baseSlug = createAlbumSlug(album.name, album.id);
    let slug = baseSlug;
    let suffix = 2;

    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    usedSlugs.add(slug);
    slugMap.set(album.id, slug);
    return { ...album, slug };
  });

  const repairedPhotos = photos.map((photo) => {
    if (photo.albumId == null) {
      return photo;
    }

    const album = repairedAlbums.find((item) => item.id === photo.albumId);
    if (!album) {
      return {
        ...photo,
        albumId: null,
        albumName: undefined,
        albumSlug: undefined,
      };
    }

    return {
      ...photo,
      albumName: album.name,
      albumSlug: slugMap.get(album.id),
    };
  });

  await Promise.all([
    writeFile(albumsPath, JSON.stringify(repairedAlbums, null, 2), "utf8"),
    writeFile(photosPath, JSON.stringify(repairedPhotos, null, 2), "utf8"),
  ]);

  console.log(
    `Repaired ${repairedAlbums.length} albums and synchronized ${repairedPhotos.filter((photo) => photo.albumId != null).length} album-linked photos.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
