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

export type PhotoReturnState = {
  album: string;
  view: AlbumViewMode;
};

/** `/albums/<slug>?view=<mode>&photo=<id>` — where "← Back" on a photo page goes. */
export function buildAlbumReturnHref(
  albumSlug: string,
  view: AlbumViewMode,
  photoId?: number | null,
) {
  const query = buildAlbumViewQuery("", view, photoId);
  return `/albums/${encodeURIComponent(albumSlug)}?${query}`;
}

/**
 * Photo detail URL. With a return state it carries returnAlbum / returnView and
 * sets returnPhoto to this photo, so "← Back" lands on the last photo viewed.
 */
export function buildPhotoDetailHref(
  photo: { source: string; id: number },
  returnState?: PhotoReturnState | null,
) {
  const path = `/photos/${encodeURIComponent(photo.source)}/${photo.id}`;

  if (!returnState?.album) {
    return path;
  }

  const params = new URLSearchParams({
    returnAlbum: returnState.album,
    returnView: returnState.view,
    returnPhoto: String(photo.id),
  });

  return `${path}?${params.toString()}`;
}
