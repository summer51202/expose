import type { DataBackend } from "@/lib/data/backend";
import type { CommentRecord } from "@/types/comment";

export type CommentStore = "manifest" | "prisma";

export function getCommentStoreForSource(
  dataBackend: DataBackend,
  photoSource: CommentRecord["photoSource"],
): CommentStore {
  if (dataBackend !== "prisma") {
    return "manifest";
  }

  return photoSource === "uploaded" ? "prisma" : "manifest";
}
