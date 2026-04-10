type UploadSelectionInput = {
  albumId: string;
  fileCount: number;
};

export function getUploadSelectionError({
  albumId,
  fileCount,
}: UploadSelectionInput): string | null {
  if (!albumId.trim()) {
    return "Please choose an album before uploading photos.";
  }

  if (fileCount < 1) {
    return "Please choose at least one photo.";
  }

  return null;
}

export function canSubmitUploadSelection(input: UploadSelectionInput): boolean {
  return getUploadSelectionError(input) === null;
}
