type PhotoAlbumChangeInput = {
  photoId: number | null;
  albumId: string;
};

export function getPhotoAlbumChangeError({
  photoId,
  albumId,
}: PhotoAlbumChangeInput): string | null {
  if (photoId == null) {
    return "Please choose a photo to move.";
  }

  if (!albumId.trim()) {
    return "Please choose a destination album.";
  }

  return null;
}

export function canSubmitPhotoAlbumChange(input: PhotoAlbumChangeInput): boolean {
  return getPhotoAlbumChangeError(input) === null;
}
