"use client";

import { cn } from "@/lib/utils";
import {
  countPhotoTextLength,
  PHOTO_TEXT_LIMITS,
  type PhotoTextField,
  type PhotoTextValues,
} from "@/lib/photos/photo-text";

const inputClassName =
  "w-full rounded-lg border bg-white px-3 py-2 text-base text-stone-900 outline-none transition focus:border-stone-500 sm:text-sm";

type PhotoTextFieldsProps = {
  idPrefix: string;
  values: PhotoTextValues;
  original: PhotoTextValues;
  errors: Partial<Record<PhotoTextField, string>>;
  onChange: (field: PhotoTextField, value: string) => void;
  /** Tighter layout for the batch list. */
  compact?: boolean;
};

const LABELS: Record<PhotoTextField, string> = {
  title: "標題",
  description: "描述",
  location: "地點",
};

const PLACEHOLDERS: Record<PhotoTextField, string> = {
  title: "例如：清晨的淺草寺",
  description: "拍攝的故事、氣氛或想讓人看到的細節（選填）",
  location: "例如：東京・淺草（選填）",
};

function FieldLabel({
  htmlFor,
  field,
  value,
  changed,
}: {
  htmlFor: string;
  field: PhotoTextField;
  value: string;
  changed: boolean;
}) {
  const length = countPhotoTextLength(value.trim());
  const limit = PHOTO_TEXT_LIMITS[field];

  return (
    <div className="flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="text-xs font-medium text-stone-600">
        {LABELS[field]}
        {changed ? <span className="ml-1 text-amber-700">・已修改</span> : null}
      </label>
      <span className={cn("text-xs tabular-nums", length > limit ? "text-rose-700" : "text-stone-400")}>
        {length}/{limit}
      </span>
    </div>
  );
}

export function PhotoTextFields({
  idPrefix,
  values,
  original,
  errors,
  onChange,
  compact = false,
}: PhotoTextFieldsProps) {
  function fieldClassName(field: PhotoTextField) {
    return cn(
      inputClassName,
      errors[field]
        ? "border-rose-300"
        : values[field] !== original[field]
          ? "border-amber-300 bg-amber-50/40"
          : "border-line",
    );
  }

  function renderError(field: PhotoTextField) {
    return errors[field] ? (
      <p id={`${idPrefix}-${field}-error`} className="text-xs text-rose-700">
        {errors[field]}
      </p>
    ) : null;
  }

  return (
    <div className={cn("grid gap-3", compact ? "md:grid-cols-2" : null)}>
      {(["title", "location"] as const).map((field) => (
        <div key={field} className="grid gap-1">
          <FieldLabel
            htmlFor={`${idPrefix}-${field}`}
            field={field}
            value={values[field]}
            changed={values[field] !== original[field]}
          />
          <input
            id={`${idPrefix}-${field}`}
            type="text"
            value={values[field]}
            placeholder={PLACEHOLDERS[field]}
            required={field === "title"}
            aria-invalid={errors[field] ? true : undefined}
            aria-describedby={errors[field] ? `${idPrefix}-${field}-error` : undefined}
            className={fieldClassName(field)}
            onChange={(event) => onChange(field, event.currentTarget.value)}
          />
          {renderError(field)}
        </div>
      ))}
      <div className={cn("grid gap-1", compact ? "md:col-span-2" : null)}>
        <FieldLabel
          htmlFor={`${idPrefix}-description`}
          field="description"
          value={values.description}
          changed={values.description !== original.description}
        />
        <textarea
          id={`${idPrefix}-description`}
          value={values.description}
          placeholder={PLACEHOLDERS.description}
          rows={compact ? 2 : 3}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={errors.description ? `${idPrefix}-description-error` : undefined}
          className={cn(fieldClassName("description"), "resize-y")}
          onChange={(event) => onChange("description", event.currentTarget.value)}
        />
        {renderError("description")}
      </div>
    </div>
  );
}
