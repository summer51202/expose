"use server";

import { revalidatePath } from "next/cache";

import { getAlbumRepository } from "@/lib/albums/repository";
import { createUniqueAlbumSlug } from "@/lib/albums/slug";
import { requireAdminSession } from "@/lib/auth/session";
import { getPhotoRepository } from "@/lib/photos/repository";
import type { AlbumRecord } from "@/types/album";

export type AlbumFormState = {
  error?: string;
  success?: string;
};

export async function createAlbumAction(
  _prevState: AlbumFormState,
  formData: FormData,
): Promise<AlbumFormState> {
  await requireAdminSession();

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!name) {
    return {
      error: "請輸入相簿名稱。",
    };
  }

  const albumRepository = getAlbumRepository();
  const existingAlbums = await albumRepository.listAlbums();
  const recordId = Date.now();
  const slug = createUniqueAlbumSlug(
    name,
    recordId,
    new Set(existingAlbums.map((album) => album.slug)),
  );

  const record: AlbumRecord = {
    id: recordId,
    name,
    slug,
    description,
    coverPhotoId: null,
    sortOrder: existingAlbums.length,
    createdAt: new Date().toISOString(),
  };

  await albumRepository.createAlbum(record);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/albums");
  revalidatePath(`/albums/${record.slug}`);

  return {
    success: `相簿「${record.name}」已建立完成。`,
  };
}

export async function updateAlbumAction(
  albumId: number,
  _prevState: AlbumFormState,
  formData: FormData,
): Promise<AlbumFormState> {
  await requireAdminSession();

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!name) {
    return {
      error: "請輸入相簿名稱。",
    };
  }

  const albumRepository = getAlbumRepository();
  const photoRepository = getPhotoRepository();
  const existingAlbums = await albumRepository.listAlbums();
  const targetAlbum = existingAlbums.find((album) => album.id === albumId);

  if (!targetAlbum) {
    return {
      error: "找不到這本相簿，請重新整理後再試一次。",
    };
  }

  const nextSlug = createUniqueAlbumSlug(
    name,
    albumId,
    new Set(existingAlbums.filter((album) => album.id !== albumId).map((album) => album.slug)),
  );

  await albumRepository.updateAlbum(albumId, (record) => ({
    ...record,
    name,
    description,
    slug: nextSlug,
  }));

  await photoRepository.renameAlbumReferences(albumId, name, nextSlug);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/albums");
  revalidatePath(`/albums/${targetAlbum.slug}`);
  revalidatePath(`/albums/${nextSlug}`);

  return {
    success: `相簿已更新為「${name}」。`,
  };
}
