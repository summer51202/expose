export function getPhotoDeleteError(photoIds: number[]): string | null {
  return photoIds.length === 0 ? "Please choose at least one photo to delete." : null;
}
