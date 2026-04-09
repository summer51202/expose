"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/auth/session";
import { uploadPhotos } from "@/lib/uploads/upload-service";

export type UploadFormState = {
  error?: string;
  success?: string;
};

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
      success: `上傳完成，共處理 ${result.uploadedCount} 張照片，並自動產生中圖與縮圖。`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "上傳時發生未知錯誤。",
    };
  }
}
