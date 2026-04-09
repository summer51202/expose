import exifr from "exifr";

type ExifValue = string | number | boolean | null;

export type ExifRecord = Record<string, ExifValue>;

export type ExifDisplayField = {
  label: string;
  value: string;
};

function toFixedIfNeeded(value: number, digits = 1) {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

function formatExposureTime(value: number) {
  if (value >= 1) {
    return `${toFixedIfNeeded(value, 1)} 秒`;
  }

  const reciprocal = Math.round(1 / value);
  return `1/${reciprocal} 秒`;
}

function formatExifDate(value: ExifValue) {
  if (!value) {
    return undefined;
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("zh-TW");
}

function pickString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function pickNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export async function extractExifData(buffer: Buffer): Promise<ExifRecord | null> {
  const parsed = await exifr.parse(buffer, [
    "Make",
    "Model",
    "LensModel",
    "FocalLength",
    "FNumber",
    "ExposureTime",
    "ISO",
    "DateTimeOriginal",
    "CreateDate",
  ]);

  if (!parsed) {
    return null;
  }

  const cameraMake = pickString(parsed.Make);
  const cameraModel = pickString(parsed.Model);
  const lensModel = pickString(parsed.LensModel);
  const focalLength = pickNumber(parsed.FocalLength);
  const aperture = pickNumber(parsed.FNumber);
  const exposureTime = pickNumber(parsed.ExposureTime);
  const iso = pickNumber(parsed.ISO);
  const takenAt = parsed.DateTimeOriginal ?? parsed.CreateDate ?? null;

  const record: ExifRecord = {
    cameraMake: cameraMake ?? null,
    cameraModel: cameraModel ?? null,
    lensModel: lensModel ?? null,
    focalLength: focalLength ?? null,
    aperture: aperture ?? null,
    exposureTime: exposureTime ?? null,
    iso: iso ?? null,
    takenAt: takenAt ? new Date(takenAt).toISOString() : null,
  };

  const hasAnyValue = Object.values(record).some((value) => value !== null);
  return hasAnyValue ? record : null;
}

export function getExifDisplayFields(exifData?: ExifRecord | null): ExifDisplayField[] {
  if (!exifData) {
    return [];
  }

  const fields: Array<ExifDisplayField | null> = [
    exifData.cameraModel
      ? {
          label: "相機",
          value: [exifData.cameraMake, exifData.cameraModel].filter(Boolean).join(" "),
        }
      : null,
    exifData.lensModel
      ? {
          label: "鏡頭",
          value: String(exifData.lensModel),
        }
      : null,
    typeof exifData.focalLength === "number"
      ? {
          label: "焦段",
          value: `${toFixedIfNeeded(exifData.focalLength)} mm`,
        }
      : null,
    typeof exifData.aperture === "number"
      ? {
          label: "光圈",
          value: `f/${toFixedIfNeeded(exifData.aperture)}`,
        }
      : null,
    typeof exifData.exposureTime === "number"
      ? {
          label: "快門",
          value: formatExposureTime(exifData.exposureTime),
        }
      : null,
    typeof exifData.iso === "number"
      ? {
          label: "ISO",
          value: String(exifData.iso),
        }
      : null,
    exifData.takenAt
      ? {
          label: "拍攝時間",
          value: formatExifDate(exifData.takenAt) ?? String(exifData.takenAt),
        }
      : null,
  ];

  return fields.filter((field): field is ExifDisplayField => field !== null);
}
