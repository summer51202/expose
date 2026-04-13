"use server";

import { revalidatePath } from "next/cache";

import { getAlbumOptions } from "@/lib/albums/queries";
import { requireAdminSession } from "@/lib/auth/session";
import { getPhotoRepository, type PhotoAlbumAssignment } from "@/lib/photos/repository";
import type { PhotoRecord } from "@/types/photo";

export type PhotoMoveState = {
  error?: string;
  success?: string;
  resetKey?: string;
};

function parseAlbumId(formData: FormData) {
  const albumId = Number(String(formData.get("albumId") || "").trim());

  return Number.isInteger(albumId) && albumId > 0 ? albumId : null;
}

function parsePhotoIds(formData: FormData) {
  return Array.from(
    new Set(
      formData
        .getAll("photoIds")
        .map((value) => Number(String(value).trim()))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  );
}

async function getAlbumAssignment(albumId: number): Promise<PhotoAlbumAssignment | null> {
  const album = (await getAlbumOptions()).find((item) => item.id === albumId);

  if (!album) {
    return null;
  }

  return {
    albumId: album.id,
    albumName: album.name,
    albumSlug: album.slug,
  };
}

function getMovingPhotos(photos: PhotoRecord[], photoIds: number[]) {
  const selectedIds = new Set(photoIds);
  return photos.filter((photo) => selectedIds.has(photo.id));
}

function revalidatePhotoMovePaths(photos: PhotoRecord[], assignment: PhotoAlbumAssignment) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/photos");
  revalidatePath("/admin/albums");
  revalidatePath(`/albums/${assignment.albumSlug}`);

  for (const photo of photos) {
    if (photo.albumSlug) {
      revalidatePath(`/albums/${photo.albumSlug}`);
    }

    revalidatePath(`/photos/uploaded/${photo.id}`);
  }
}

async function resolveMoveInput(photoIds: number[], albumId: number | null) {
  if (photoIds.length === 0) {
    return {
      error: "請先選擇要移動的照片。",
    };
  }

  if (!albumId) {
    return {
      error: "請選擇要移動到哪一本相簿。",
    };
  }

  const [assignment, photos] = await Promise.all([
    getAlbumAssignment(albumId),
    getPhotoRepository().listUploadedPhotos(),
  ]);

  if (!assignment) {
    return {
      error: "找不到指定的相簿，請重新整理後再試一次。",
    };
  }

  const movingPhotos = getMovingPhotos(photos, photoIds);
  if (movingPhotos.length !== photoIds.length) {
    return {
      error: "有照片不存在，請重新整理後再試一次。",
    };
  }

  return {
    assignment,
    movingPhotos,
  };
}

export async function movePhotoToAlbumAction(
  photoId: number,
  _prevState: PhotoMoveState,
  formData: FormData,
): Promise<PhotoMoveState> {
  await requireAdminSession();

  const albumId = parseAlbumId(formData);
  const resolved = await resolveMoveInput([photoId], albumId);

  if ("error" in resolved) {
    return {
      error: resolved.error,
    };
  }

  try {
    await getPhotoRepository().movePhotoToAlbum(photoId, resolved.assignment);
    revalidatePhotoMovePaths(resolved.movingPhotos, resolved.assignment);

    return {
      success: `照片已移動到「${resolved.assignment.albumName}」。`,
      resetKey: `${Date.now()}`,
    };
  } catch {
    return {
      error: "移動照片失敗，請稍後再試一次。",
    };
  }
}

export async function moveSelectedPhotosToAlbumAction(
  _prevState: PhotoMoveState,
  formData: FormData,
): Promise<PhotoMoveState> {
  await requireAdminSession();

  const photoIds = parsePhotoIds(formData);
  const albumId = parseAlbumId(formData);
  const resolved = await resolveMoveInput(photoIds, albumId);

  if ("error" in resolved) {
    return {
      error: resolved.error,
    };
  }

  try {
    await getPhotoRepository().movePhotosToAlbum(photoIds, resolved.assignment);
    revalidatePhotoMovePaths(resolved.movingPhotos, resolved.assignment);

    return {
      success: `已移動 ${photoIds.length} 張照片到「${resolved.assignment.albumName}」。`,
      resetKey: `${Date.now()}`,
    };
  } catch {
    return {
      error: "批次移動照片失敗，請稍後再試一次。",
    };
  }
}
