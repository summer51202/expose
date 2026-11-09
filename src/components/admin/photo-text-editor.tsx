"use client";

import { useMemo, useState, useTransition } from "react";

import { savePhotoTextAction } from "@/app/admin/photo-actions";
import { PhotoTextFields } from "@/components/admin/photo-text-fields";
import { useUnsavedChangesWarning } from "@/components/admin/use-unsaved-changes-warning";
import { Button } from "@/components/ui/button";
import {
  diffPhotoText,
  getPhotoTextFieldErrors,
  getPhotoTextValues,
  type PhotoTextField,
} from "@/lib/photos/photo-text";
import type { PhotoRecord } from "@/types/photo";

type PhotoTextEditorProps = {
  photo: PhotoRecord;
  onClose: () => void;
  onSaved: (message: string) => void;
};

/** Inline editor for one photo's title, description and location. */
export function PhotoTextEditor({ photo, onClose, onSaved }: PhotoTextEditorProps) {
  const original = useMemo(() => getPhotoTextValues(photo), [photo]);
  const [values, setValues] = useState(original);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const patch = diffPhotoText(photo.id, original, values);
  const errors = getPhotoTextFieldErrors(values);
  const hasErrors = Object.keys(errors).length > 0;

  useUnsavedChangesWarning(patch !== null);

  function handleChange(field: PhotoTextField, value: string) {
    setError("");
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleCancel() {
    if (patch && !window.confirm("放棄這張照片尚未儲存的修改？")) {
      return;
    }

    onClose();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!patch) {
      onClose();
      return;
    }

    if (hasErrors) {
      return;
    }

    startTransition(async () => {
      const result = await savePhotoTextAction([patch]);

      if (result.ok) {
        onSaved(result.message);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-lg border border-line bg-stone-50/80 p-3"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          handleCancel();
        }
      }}
    >
      <PhotoTextFields
        idPrefix={`photo-${photo.id}-text`}
        values={values}
        original={original}
        errors={errors}
        onChange={handleChange}
      />
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending || hasErrors || patch === null}>
          {pending ? "儲存中..." : "儲存"}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={handleCancel}>
          取消
        </Button>
        {patch === null ? <span className="text-xs text-stone-500">尚未修改</span> : null}
      </div>
    </form>
  );
}
