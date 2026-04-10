"use server";

export {
  uploadPhotosAction,
  type UploadFormState,
} from "@/app/admin/upload-actions-secure";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/auth/session";
import { getUploadBatchError } from "@/lib/uploads/upload-batch";
import { getUploadSelectionError } from "@/lib/uploads/upload-selection";
import { uploadPhotos } from "@/lib/uploads/upload-service";

type LegacyUploadFormState = {
  error?: string;
  success?: string;
};

function getUploadErrorMessage(error: string): string {
  switch (error) {
    case "Please choose an album before uploading photos.":
      return "請先選擇要上傳到哪一本相簿。";
    case "Please choose at least one photo.":
      return "請至少選擇一張照片。";
    case "File type is not supported.":
      return "有檔案格式不支援，目前只接受 JPG、PNG、WebP、AVIF。";
    case "A file is larger than the per-file upload limit.":
      return "單張照片超過 20MB，請先縮小後再上傳。";
    case "Too many files were selected for one upload batch.":
      return "單次最多可上傳 12 張照片，請分批處理。";
    case "The selected batch is larger than the total upload size limit.":
      return "本次上傳總大小超過 40MB，請分批處理。";
    default:
      return error;
  }
}

async function legacyUploadPhotosAction(
  _prevState: LegacyUploadFormState,
  formData: FormData,
): Promise<LegacyUploadFormState> {
  await requireAdminSession();

  const files = formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File);
  const validFiles = files.filter((file) => file.size > 0);
  const rawAlbumId = String(formData.get("albumId") || "").trim();
  const selectionError = getUploadSelectionError({
    albumId: rawAlbumId,
    fileCount: validFiles.length,
  });
  const batchError = getUploadBatchError(
    validFiles.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    })),
  );

  if (selectionError) {
    return {
      error: getUploadErrorMessage(selectionError),
    };
  }

  if (batchError) {
    return {
      error: getUploadErrorMessage(batchError),
    };
  }

  try {
    const result = await uploadPhotos({
      files,
      albumId: Number(rawAlbumId),
    });

    revalidatePath("/");
    revalidatePath("/admin");

    return {
      success: `已完成上傳，共新增 ${result.uploadedCount} 張照片。`,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? getUploadErrorMessage(error.message) : "上傳失敗，請稍後再試。",
    };
  }
}

void legacyUploadPhotosAction;
