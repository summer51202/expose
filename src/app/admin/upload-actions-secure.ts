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
};

function buildUploadSuccessMessage(result: UploadSummary) {
  return `照片上傳完成，已新增 ${result.uploadedCount} 張相片。`;
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
      albumId: rawAlbumId ? Number(rawAlbumId) : null,
    });

    revalidatePath("/");
    revalidatePath("/admin");

    return {
      success: buildUploadSuccessMessage(result),
    };
  } catch (error) {
    return {
      error: mapUploadErrorToMessage(error),
    };
  }
}
