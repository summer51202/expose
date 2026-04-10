"use server";

import { revalidatePath } from "next/cache";

import { getAlbumOptions } from "@/lib/albums/queries";
import { requireAdminSession } from "@/lib/auth/session";
import { getPhotoAlbumChangeError } from "@/lib/photos/photo-album-change";
import { getPhotoRepository } from "@/lib/photos/repository";

export type PhotoAlbumMoveState = {
  error?: string;
  success?: string;
};

export async function movePhotoToAlbumAction(
  photoId: number,
  _prevState: PhotoAlbumMoveState,
  formData: FormData,
): Promise<PhotoAlbumMoveState> {
  await requireAdminSession();

  const rawAlbumId = String(formData.get("albumId") || "").trim();
  const validationError = getPhotoAlbumChangeError({
    photoId,
    albumId: rawAlbumId,
  });

  if (validationError) {
    return {
      error:
        validationError === "Please choose a destination album."
          ? "請先選擇要搬移到哪一本相簿。"
          : "找不到要搬移的照片。",
    };
  }

  const albumId = Number(rawAlbumId);
  const [albums, photos] = await Promise.all([
    getAlbumOptions(),
    getPhotoRepository().listUploadedPhotos(),
  ]);
  const destinationAlbum = albums.find((album) => album.id === albumId) ?? null;
  const currentPhoto = photos.find((photo) => photo.id === photoId) ?? null;

  if (!currentPhoto) {
    return {
      error: "找不到要搬移的照片。",
    };
  }

  if (!destinationAlbum) {
    return {
      error: "找不到目標相簿，請重新選擇後再試一次。",
    };
  }

  if (currentPhoto.albumId === destinationAlbum.id) {
    return {
      error: "這張照片已經在該相簿中。",
    };
  }

  await getPhotoRepository().movePhotoToAlbum({
    photoId,
    albumId: destinationAlbum.id,
    albumName: destinationAlbum.name,
    albumSlug: destinationAlbum.slug,
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/photos/uploaded/${photoId}`);

  if (currentPhoto.albumSlug) {
    revalidatePath(`/albums/${encodeURIComponent(currentPhoto.albumSlug)}`);
  }

  revalidatePath(`/albums/${encodeURIComponent(destinationAlbum.slug)}`);

  return {
    success: `已將「${currentPhoto.title}」移到「${destinationAlbum.name}」。`,
  };
}
