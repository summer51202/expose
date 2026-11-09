"use client";

import { useEffect } from "react";

export const UNSAVED_CHANGES_MESSAGE = "有尚未儲存的修改，確定要離開嗎？";

function isPlainLeftClick(event: MouseEvent) {
  return (
    event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
  );
}

/**
 * While `dirty` is true, warns before the page unloads (reload, close, external
 * link) and before in-app link navigation, which `beforeunload` does not see.
 */
export function useUnsavedChangesWarning(dirty: boolean, message = UNSAVED_CHANGES_MESSAGE) {
  useEffect(() => {
    if (!dirty) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      // Older browsers need returnValue set to show the prompt.
      event.returnValue = "";
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || !isPlainLeftClick(event)) {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest("a[href]");

      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const url = new URL(anchor.href, window.location.href);

      // Other origins unload the page, so beforeunload already asks.
      if (url.origin !== window.location.origin) {
        return;
      }

      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    // Capture phase runs before Next.js Link's own click handler.
    document.addEventListener("click", handleClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, [dirty, message]);
}
