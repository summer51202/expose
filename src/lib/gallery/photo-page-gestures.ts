export const SWIPE_THRESHOLD_PX = 50;

export type SwipeDirection = "previous" | "next" | null;

/**
 * Finger moved left (dx < 0) → next photo, right → previous.
 * Only counts when the horizontal travel passes the threshold and beats the
 * vertical travel, so normal vertical scrolling never switches photos.
 */
export function resolveSwipeDirection(
  dx: number,
  dy: number,
  threshold = SWIPE_THRESHOLD_PX,
): SwipeDirection {
  if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) {
    return null;
  }

  return dx < 0 ? "next" : "previous";
}

type KeyEventLike = {
  defaultPrevented?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  isComposing?: boolean;
  target?: unknown;
};

function isEditableTarget(target: unknown) {
  if (!target || typeof target !== "object") {
    return false;
  }

  const element = target as { tagName?: unknown; isContentEditable?: unknown };
  const tagName = typeof element.tagName === "string" ? element.tagName.toUpperCase() : "";

  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    element.isContentEditable === true
  );
}

/**
 * Photo page shortcuts stay out of the way of typing (comment form), IME
 * composition, and browser/OS shortcuts such as Alt+← (history back).
 */
export function shouldIgnorePhotoNavigationKey(event: KeyEventLike) {
  return Boolean(
    event.defaultPrevented ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      isEditableTarget(event.target),
  );
}
