import type { PhotoRecord } from "@/types/photo";

/** Limits for the admin-editable text fields of a photo. */
export const PHOTO_TEXT_LIMITS = {
  title: 120,
  description: 1000,
  location: 120,
} as const;

/** Most photos one save request may touch. */
export const PHOTO_TEXT_MAX_BATCH = 500;

export type PhotoTextField = keyof typeof PHOTO_TEXT_LIMITS;

export const PHOTO_TEXT_FIELDS: PhotoTextField[] = ["title", "description", "location"];

/** Editable text as the form shows it: missing values are empty strings. */
export type PhotoTextValues = Record<PhotoTextField, string>;

/**
 * A change to one photo. Only the fields present are written.
 * `description` / `location` set to null clear the value; `title` can never be cleared.
 */
export type PhotoTextPatch = {
  id: number;
  title?: string;
  description?: string | null;
  location?: string | null;
};

const FIELD_LABELS: Record<PhotoTextField, string> = {
  title: "標題",
  description: "描述",
  location: "地點",
};

export function getPhotoTextValues(
  photo: Pick<PhotoRecord, "title" | "description" | "location">,
): PhotoTextValues {
  return {
    title: photo.title ?? "",
    description: photo.description ?? "",
    location: photo.location ?? "",
  };
}

/** Counts code points so an emoji or CJK character counts as one. */
export function countPhotoTextLength(value: string) {
  return Array.from(value).length;
}

function normalizeFieldValue(field: PhotoTextField, value: string) {
  const trimmed = value.trim();

  // Titles and locations are single-line; collapse any pasted line breaks.
  return field === "description" ? trimmed : trimmed.replace(/\s+/g, " ");
}

/**
 * Returns only the fields whose normalized value differs from the original,
 * or null when nothing changed. Empty description/location become null (clear).
 */
export function diffPhotoText(
  id: number,
  original: PhotoTextValues,
  draft: PhotoTextValues,
): PhotoTextPatch | null {
  const patch: PhotoTextPatch = { id };
  let changed = false;

  for (const field of PHOTO_TEXT_FIELDS) {
    const before = normalizeFieldValue(field, original[field] ?? "");
    const after = normalizeFieldValue(field, draft[field] ?? "");

    if (before === after) {
      continue;
    }

    changed = true;

    if (field === "title") {
      patch.title = after;
    } else {
      patch[field] = after === "" ? null : after;
    }
  }

  return changed ? patch : null;
}

/** Builds the save payload for every photo with a real change. */
export function collectPhotoTextPatches(
  originals: Map<number, PhotoTextValues>,
  drafts: Map<number, PhotoTextValues>,
): PhotoTextPatch[] {
  const patches: PhotoTextPatch[] = [];

  for (const [id, draft] of drafts) {
    const original = originals.get(id);

    if (!original) {
      continue;
    }

    const patch = diffPhotoText(id, original, draft);

    if (patch) {
      patches.push(patch);
    }
  }

  return patches;
}

/** Per-field problems with a draft, for showing next to the inputs. */
export function getPhotoTextFieldErrors(values: PhotoTextValues) {
  const errors: Partial<Record<PhotoTextField, string>> = {};

  for (const field of PHOTO_TEXT_FIELDS) {
    const value = normalizeFieldValue(field, values[field] ?? "");

    if (field === "title" && value === "") {
      errors.title = "標題不能是空的。";
    } else if (countPhotoTextLength(value) > PHOTO_TEXT_LIMITS[field]) {
      errors[field] = `最多 ${PHOTO_TEXT_LIMITS[field]} 個字。`;
    }
  }

  return errors;
}

export type PhotoTextValidation =
  | { ok: true; patches: PhotoTextPatch[] }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validates untrusted input from the client: an array of patches.
 * Trims every value, rejects empty titles, enforces the length limits and
 * drops unknown keys. Returns the normalized patches.
 */
export function validatePhotoTextPatches(input: unknown): PhotoTextValidation {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, error: "沒有要儲存的修改。" };
  }

  if (input.length > PHOTO_TEXT_MAX_BATCH) {
    return { ok: false, error: `一次最多儲存 ${PHOTO_TEXT_MAX_BATCH} 張照片的修改。` };
  }

  const seen = new Set<number>();
  const patches: PhotoTextPatch[] = [];

  for (const item of input) {
    if (!isRecord(item)) {
      return { ok: false, error: "修改內容格式不正確，請重新整理後再試一次。" };
    }

    const id = item.id;

    if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
      return { ok: false, error: "照片編號不正確，請重新整理後再試一次。" };
    }

    if (seen.has(id)) {
      return { ok: false, error: "同一張照片出現了兩次，請重新整理後再試一次。" };
    }

    seen.add(id);

    const patch: PhotoTextPatch = { id };
    let hasField = false;

    for (const field of PHOTO_TEXT_FIELDS) {
      if (!(field in item) || item[field] === undefined) {
        continue;
      }

      const raw = item[field];

      if (raw === null && field !== "title") {
        patch[field] = null;
        hasField = true;
        continue;
      }

      if (typeof raw !== "string") {
        return { ok: false, error: `${FIELD_LABELS[field]}格式不正確。` };
      }

      const value = normalizeFieldValue(field, raw);

      if (field === "title" && value === "") {
        return { ok: false, error: "標題不能是空的。" };
      }

      if (countPhotoTextLength(value) > PHOTO_TEXT_LIMITS[field]) {
        return {
          ok: false,
          error: `${FIELD_LABELS[field]}最多 ${PHOTO_TEXT_LIMITS[field]} 個字。`,
        };
      }

      if (field === "title") {
        patch.title = value;
      } else {
        patch[field] = value === "" ? null : value;
      }

      hasField = true;
    }

    if (hasField) {
      patches.push(patch);
    }
  }

  if (patches.length === 0) {
    return { ok: false, error: "沒有要儲存的修改。" };
  }

  return { ok: true, patches };
}

/** Returns a copy of the record with the patch applied; cleared fields are removed. */
export function applyPhotoTextPatch<T extends PhotoRecord>(record: T, patch: PhotoTextPatch): T {
  const next: T = { ...record };

  if (patch.title !== undefined) {
    next.title = patch.title;
  }

  for (const field of ["description", "location"] as const) {
    const value = patch[field];

    if (value === undefined) {
      continue;
    }

    if (value === null) {
      delete next[field];
    } else {
      next[field] = value;
    }
  }

  return next;
}

/**
 * Applies patches to a list of records (the JSON manifest). Records without a
 * patch are returned untouched. `updated` lists the patched records in patch order.
 */
export function applyPhotoTextPatches<T extends PhotoRecord>(records: T[], patches: PhotoTextPatch[]) {
  const patchById = new Map(patches.map((patch) => [patch.id, patch]));
  const updatedById = new Map<number, T>();

  const nextRecords = records.map((record) => {
    const patch = patchById.get(record.id);

    if (!patch) {
      return record;
    }

    const updated = applyPhotoTextPatch(record, patch);
    updatedById.set(record.id, updated);
    return updated;
  });

  const updated = patches
    .map((patch) => updatedById.get(patch.id))
    .filter((record): record is T => record !== undefined);

  return { records: nextRecords, updated };
}

/** Prisma `data` for a patch: only the fields present, with null clearing optional ones. */
export function toPhotoTextUpdateData(patch: PhotoTextPatch) {
  const data: { title?: string; description?: string | null; location?: string | null } = {};

  if (patch.title !== undefined) {
    data.title = patch.title;
  }

  if (patch.description !== undefined) {
    data.description = patch.description;
  }

  if (patch.location !== undefined) {
    data.location = patch.location;
  }

  return data;
}

export type PhotoTextFilter = {
  /** "all", "unassigned", or an album id as a string (the select's value). */
  album: string;
  filenameOnly: boolean;
};

/** Photos the batch editor lists for a filter. Uses the saved title, not drafts. */
export function filterPhotosForTextEdit<T extends Pick<PhotoRecord, "albumId" | "title">>(
  photos: T[],
  filter: PhotoTextFilter,
) {
  return photos.filter((photo) => {
    if (filter.album === "unassigned" && photo.albumId) {
      return false;
    }

    if (filter.album !== "all" && filter.album !== "unassigned" && photo.albumId !== Number(filter.album)) {
      return false;
    }

    return !filter.filenameOnly || looksLikeFilenameTitle(photo.title);
  });
}

const IMAGE_EXTENSION = /\.(jpe?g|png|webp|avif|gif|heic|heif|tiff?|bmp|dng|raw|cr2|cr3|nef|arw|orf|rw2|raf)$/i;
const STOCK_SITE = /\b(pexels|unsplash|pixabay|shutterstock|istock|adobestock|freepik)\b/i;
// Camera, phone and export prefixes followed by a number: "IMG 1234", "DSC_0042", "PXL 20240101".
const CAMERA_PREFIX =
  /^_?(img|dsc|dscf|dscn|dji|gopr|pxl|mvimg|vid|pano|screenshot|screen shot|frame|photo|image|untitled|scan)[\s_-]*\d/i;
const LONG_DIGITS = /\d{5,}/;
// Hash- or id-like token: 12+ letters and digits with at least one of each.
const HASH_TOKEN = /(?=[a-z0-9]*\d)(?=[a-z0-9]*[a-z])[a-z0-9]{12,}/i;

/**
 * True when a title still looks like the upload's file name rather than
 * words a person wrote. Upload turns "IMG_1234.jpg" into "IMG 1234", so both
 * forms are covered.
 */
export function looksLikeFilenameTitle(title: string | undefined | null) {
  const value = (title ?? "").trim();

  if (value === "") {
    return true;
  }

  return (
    IMAGE_EXTENSION.test(value) ||
    STOCK_SITE.test(value) ||
    CAMERA_PREFIX.test(value) ||
    LONG_DIGITS.test(value) ||
    HASH_TOKEN.test(value)
  );
}
