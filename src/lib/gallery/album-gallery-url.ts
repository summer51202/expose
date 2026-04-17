export type AlbumViewMode = "grid" | "gallery";

export function resolveAlbumViewMode(value: string | null): AlbumViewMode {
  return value === "gallery" ? "gallery" : "grid";
}

export function resolvePhotoIdParam(value: string | null) {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function buildAlbumViewQuery(
  currentQuery: string,
  mode: AlbumViewMode,
  photoId?: number | null,
) {
  const params = new URLSearchParams(currentQuery);
  params.set("view", mode);

  if (photoId && Number.isInteger(photoId) && photoId > 0) {
    params.set("photo", String(photoId));
  } else {
    params.delete("photo");
  }

  return params.toString();
}

export function shouldReplaceAlbumViewQuery(
  currentQuery: string,
  mode: AlbumViewMode,
  photoId?: number | null,
) {
  return buildAlbumViewQuery(currentQuery, mode, photoId) !== currentQuery;
}
