"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/auth/session";
import { mapUploadErrorToMessage } from "@/lib/security/errors";
import {
  uploadPhotos,
  type UploadSummary,
} from "@/lib/uploads/upload-service-secure";

export type UploadFormState = {
  error?: string;
  success?: string;
  resetKey?: string;
};

function buildUploadSuccessMessage(result: UploadSummary) {
  return `上傳完成，已新增 ${result.uploadedCount} 張照片。已選照片清單已清空，可以繼續選下一批。`;
}

export async function uploadPhotosAction(
  _prevState: UploadFormState,
  formData: FormData,
): Promise<UploadFormState> {
  await requireAdminSession();

  const files = formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File);
  const rawAlbumId = String(formData.get("albumId") || "").trim();

  try {
    const result = await uploadPhotos({
      files,
      albumId: Number(rawAlbumId),
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/upload");

    return {
      success: buildUploadSuccessMessage(result),
      resetKey: `${Date.now()}`,
    };
  } catch (error) {
    return {
      error: mapUploadErrorToMessage(error),
    };
  }
}
