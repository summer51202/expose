"use client";

import type { CSSProperties, DragEvent, MouseEvent, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ImageGuardProps = {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

function preventDefault(event: MouseEvent | DragEvent) {
  event.preventDefault();
}

/**
 * The one place public photos get their download deterrents:
 * - blocks the right-click menu (and Android's long-press menu, which fires `contextmenu`),
 * - blocks dragging the image out of the page,
 * - adds the `image-guard` class (globals.css) for iOS long-press and selection.
 *
 * It only covers its own subtree, so text around the photo stays selectable, and
 * clicks, middle-clicks, touch and keyboard navigation pass through untouched.
 * Deterrent only: screenshots and devtools still work.
 *
 * A Client Component so Server Components (e.g. PhotoStage) can use it without
 * passing an event handler across the server/client boundary.
 */
export function ImageGuard({ className, style, children }: ImageGuardProps) {
  return (
    <div
      className={cn("image-guard", className)}
      style={style}
      onContextMenu={preventDefault}
      onDragStart={preventDefault}
    >
      {children}
    </div>
  );
}
