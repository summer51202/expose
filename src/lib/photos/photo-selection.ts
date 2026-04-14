export function removePhotoIdsFromSelection(
  selectedPhotoIds: number[],
  photoIdsToRemove: number[],
) {
  const removedIds = new Set(photoIdsToRemove);
  const nextSelectedPhotoIds = selectedPhotoIds.filter((photoId) => !removedIds.has(photoId));

  return nextSelectedPhotoIds.length === selectedPhotoIds.length
    ? selectedPhotoIds
    : nextSelectedPhotoIds;
}
