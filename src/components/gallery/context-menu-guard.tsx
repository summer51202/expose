"use client";

import type { CSSProperties, ReactNode } from "react";

type ContextMenuGuardProps = {
  enabled: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

/**
 * Wrapper that can block the right-click menu. Lives in a Client Component so
 * Server Components (e.g. PhotoStage on the photo page) can use it without passing
 * an event handler across the server/client boundary.
 */
export function ContextMenuGuard({ enabled, className, style, children }: ContextMenuGuardProps) {
  return (
    <div
      className={className}
      style={style}
      onContextMenu={enabled ? (event) => event.preventDefault() : undefined}
    >
      {children}
    </div>
  );
}
