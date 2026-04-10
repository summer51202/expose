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
  return `已完成上傳，共新增 ${result.uploadedCount} 張照片。`;
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

    return {
      success: buildUploadSuccessMessage(result),
    };
  } catch (error) {
    return {
      error: mapUploadErrorToMessage(error),
    };
  }
}
