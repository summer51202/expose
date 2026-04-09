import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data");
const albumsPath = path.join(dataDir, "albums.json");
const photosPath = path.join(dataDir, "photos.json");
const commentsPath = path.join(dataDir, "comments.json");
const likesPath = path.join(dataDir, "likes.json");

function stripBom(content) {
  return content.replace(/^\uFEFF/, "");
}

async function readJsonArray(filePath) {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(stripBom(raw));
  if (!Array.isArray(parsed)) {
    throw new Error(`${path.basename(filePath)} must be a JSON array.`);
  }
  return parsed;
}

async function readOptionalJsonArray(filePath) {
  try {
    await access(filePath);
  } catch {
    return [];
  }

  return readJsonArray(filePath);
}

function assert(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

async function main() {
  const errors = [];
  const [albums, photos, comments, likes] = await Promise.all([
    readJsonArray(albumsPath),
    readJsonArray(photosPath),
    readOptionalJsonArray(commentsPath),
    readOptionalJsonArray(likesPath),
  ]);

  const albumIds = new Set();
  const albumSlugs = new Set();
  const photoKeys = new Set();
  const likeUniqKeys = new Set();

  for (const album of albums) {
    assert(typeof album.id === "number", `Album has invalid id: ${JSON.stringify(album)}`, errors);
    assert(typeof album.slug === "string" && album.slug.length > 0, `Album ${album.id} has invalid slug.`, errors);
    assert(!albumIds.has(album.id), `Duplicate album id: ${album.id}`, errors);
    assert(!albumSlugs.has(album.slug), `Duplicate album slug: ${album.slug}`, errors);
    albumIds.add(album.id);
    albumSlugs.add(album.slug);
  }

  for (const photo of photos) {
    assert(typeof photo.id === "number", `Photo has invalid id: ${JSON.stringify(photo)}`, errors);
    assert(typeof photo.source === "string", `Photo ${photo.id} has invalid source.`, errors);
    photoKeys.add(`${photo.source}:${photo.id}`);

    if (photo.albumId != null) {
      assert(albumIds.has(photo.albumId), `Photo ${photo.id} points to missing albumId ${photo.albumId}.`, errors);
      const matchingAlbum = albums.find((album) => album.id === photo.albumId);
      if (matchingAlbum) {
        assert(
          photo.albumSlug === matchingAlbum.slug,
          `Photo ${photo.id} albumSlug mismatch. Expected ${matchingAlbum.slug}, got ${photo.albumSlug}.`,
          errors,
        );
        assert(
          photo.albumName === matchingAlbum.name,
          `Photo ${photo.id} albumName mismatch. Expected ${matchingAlbum.name}, got ${photo.albumName}.`,
          errors,
        );
      }
    }
  }

  for (const comment of comments) {
    assert(typeof comment.id === "number", `Comment has invalid id: ${JSON.stringify(comment)}`, errors);
    assert(typeof comment.photoId === "number", `Comment ${comment.id} has invalid photoId.`, errors);
    assert(
      comment.photoSource === "uploaded" || comment.photoSource === "sample",
      `Comment ${comment.id} has invalid photoSource ${comment.photoSource}.`,
      errors,
    );
    assert(typeof comment.nickname === "string" && comment.nickname.trim().length > 0, `Comment ${comment.id} has invalid nickname.`, errors);
    assert(typeof comment.content === "string" && comment.content.trim().length > 0, `Comment ${comment.id} has invalid content.`, errors);
    assert(typeof comment.ipHash === "string" && comment.ipHash.length > 0, `Comment ${comment.id} has invalid ipHash.`, errors);
    assert(
      photoKeys.has(`${comment.photoSource}:${comment.photoId}`),
      `Comment ${comment.id} points to missing photo ${comment.photoSource}:${comment.photoId}.`,
      errors,
    );
  }

  for (const like of likes) {
    assert(typeof like.id === "number", `Like has invalid id: ${JSON.stringify(like)}`, errors);
    assert(typeof like.photoId === "number", `Like ${like.id} has invalid photoId.`, errors);
    assert(
      like.photoSource === "uploaded" || like.photoSource === "sample",
      `Like ${like.id} has invalid photoSource ${like.photoSource}.`,
      errors,
    );
    assert(typeof like.visitorId === "string" && like.visitorId.length > 0, `Like ${like.id} has invalid visitorId.`, errors);
    assert(
      photoKeys.has(`${like.photoSource}:${like.photoId}`),
      `Like ${like.id} points to missing photo ${like.photoSource}:${like.photoId}.`,
      errors,
    );

    const uniqueKey = `${like.photoSource}:${like.photoId}:${like.visitorId}`;
    assert(!likeUniqKeys.has(uniqueKey), `Duplicate like detected for ${uniqueKey}.`, errors);
    likeUniqKeys.add(uniqueKey);
  }

  if (errors.length > 0) {
    console.error("Data validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Data validation passed. Albums: ${albums.length}, Photos: ${photos.length}, Comments: ${comments.length}, Likes: ${likes.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
