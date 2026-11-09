"use server";

import { revalidatePath } from "next/cache";

import { getAlbumOptions } from "@/lib/albums/queries";
import { requireAdminSession } from "@/lib/auth/session";
import { getPhotoDeleteError } from "@/lib/photos/photo-delete";
import { deletePhotoFiles } from "@/lib/photos/photo-file-cleanup";
import {
  getPhotoTextValues,
  validatePhotoTextPatches,
  type PhotoTextValues,
} from "@/lib/photos/photo-text";
import { getPhotoRepository, type PhotoAlbumAssignment } from "@/lib/photos/repository";
import type { PhotoRecord } from "@/types/photo";

export type PhotoMoveState = {
  error?: string;
  success?: string;
  resetKey?: string;
};

export type PhotoDeleteState = {
  error?: string;
  success?: string;
  resetKey?: string;
};

export type PhotoFeaturedState = {
  error?: string;
  success?: string;
};

export type PhotoTextSaveResult =
  | {
      ok: true;
      message: string;
      /** Saved values per photo id, as stored. */
      saved: { id: number; values: PhotoTextValues }[];
    }
  | { ok: false; error: string };

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

function revalidateDeletedPhotoPaths(photos: PhotoRecord[]) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/photos");
  revalidatePath("/admin/albums");

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

async function resolveDeleteInput(photoIds: number[]) {
  const validationError = getPhotoDeleteError(photoIds);

  if (validationError) {
    return {
      error: "請先選擇要刪除的照片。",
    };
  }

  const photos = await getPhotoRepository().listUploadedPhotos();
  const deletingPhotos = getMovingPhotos(photos, photoIds);

  if (deletingPhotos.length !== photoIds.length) {
    return {
      error: "有照片不存在，請重新整理後再試一次。",
    };
  }

  return {
    deletingPhotos,
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

export async function deletePhotoAction(
  photoId: number,
  _prevState: PhotoDeleteState,
): Promise<PhotoDeleteState> {
  await requireAdminSession();

  const resolved = await resolveDeleteInput([photoId]);

  if ("error" in resolved) {
    return {
      error: resolved.error,
    };
  }

  try {
    const deletedPhoto = await getPhotoRepository().deletePhoto(photoId);
    await deletePhotoFiles(deletedPhoto ? [deletedPhoto] : []);
    revalidateDeletedPhotoPaths(resolved.deletingPhotos);

    return {
      success: "照片已刪除。",
      resetKey: `${Date.now()}`,
    };
  } catch {
    return {
      error: "刪除照片失敗，請稍後再試一次。",
    };
  }
}

export async function deleteSelectedPhotosAction(
  _prevState: PhotoDeleteState,
  formData: FormData,
): Promise<PhotoDeleteState> {
  await requireAdminSession();

  const photoIds = parsePhotoIds(formData);
  const resolved = await resolveDeleteInput(photoIds);

  if ("error" in resolved) {
    return {
      error: resolved.error,
    };
  }

  try {
    const deletedPhotos = await getPhotoRepository().deletePhotos(photoIds);
    await deletePhotoFiles(deletedPhotos);
    revalidateDeletedPhotoPaths(resolved.deletingPhotos);

    return {
      success: `已刪除 ${resolved.deletingPhotos.length} 張照片。`,
      resetKey: `${Date.now()}`,
    };
  } catch {
    return {
      error: "批次刪除照片失敗，請稍後再試一次。",
    };
  }
}

export async function setPhotoFeaturedAction(
  photoId: number,
  _prevState: PhotoFeaturedState,
  formData: FormData,
): Promise<PhotoFeaturedState> {
  await requireAdminSession();

  const value = String(formData.get("featured") ?? "");

  if (!Number.isSafeInteger(photoId) || photoId <= 0 || (value !== "true" && value !== "false")) {
    return {
      error: "精選設定無效，請重新整理後再試一次。",
    };
  }

  const featured = value === "true";

  try {
    const photo = await getPhotoRepository().setPhotoFeatured(photoId, featured);

    if (!photo) {
      return {
        error: "照片不存在，請重新整理後再試一次。",
      };
    }

    revalidatePath("/");
    revalidatePath("/about");
    revalidatePath("/admin/photos");

    return {
      success: featured ? "已設為精選。" : "已取消精選。",
    };
  } catch {
    return {
      error: "更新精選失敗，請稍後再試一次。",
    };
  }
}

function revalidatePhotoTextPaths(photos: PhotoRecord[]) {
  // Titles show up on the home page, About (featured), album pages, photo pages,
  // their OG images and the sitemap.
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/photos");

  const albumSlugs = new Set<string>();

  for (const photo of photos) {
    if (photo.albumSlug) {
      albumSlugs.add(photo.albumSlug);
    }

    // "layout" also covers the photo's nested opengraph-image route.
    revalidatePath(`/photos/uploaded/${photo.id}`, "layout");
  }

  for (const slug of albumSlugs) {
    revalidatePath(`/albums/${slug}`);
  }
}

/**
 * Saves title / description / location for one or more photos. The client sends
 * only the fields that changed; anything else is left as it is.
 */
export async function savePhotoTextAction(input: unknown): Promise<PhotoTextSaveResult> {
  await requireAdminSession();

  const validation = validatePhotoTextPatches(input);

  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const { patches } = validation;
  const repository = getPhotoRepository();

  try {
    const photos = await repository.listUploadedPhotos();
    const existingIds = new Set(photos.map((photo) => photo.id));

    if (patches.some((patch) => !existingIds.has(patch.id))) {
      return { ok: false, error: "有照片不存在，請重新整理後再試一次。" };
    }

    const updated = await repository.updatePhotoText(patches);
    revalidatePhotoTextPaths(updated);

    return {
      ok: true,
      message:
        updated.length === 1 ? "已儲存照片文字。" : `已儲存 ${updated.length} 張照片的修改。`,
      saved: updated.map((photo) => ({ id: photo.id, values: getPhotoTextValues(photo) })),
    };
  } catch {
    return { ok: false, error: "儲存失敗，請稍後再試一次。" };
  }
}
