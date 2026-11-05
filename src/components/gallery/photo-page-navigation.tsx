"use client";

import { useEffect, useRef, type ReactNode, type TouchEvent } from "react";
import { useRouter } from "next/navigation";

import { resolveSwipeDirection, shouldIgnorePhotoNavigationKey } from "@/lib/gallery/photo-page-gestures";

type PhotoPageNavigationProps = {
  previousHref: string | null;
  nextHref: string | null;
  backHref: string;
  children: ReactNode;
  className?: string;
};

/**
 * Keyboard (← / → / Esc) and horizontal-swipe navigation for the photo page.
 * Wraps the photo stage; swipes are only read inside it, keys page-wide.
 */
export function PhotoPageNavigation({
  previousHref,
  nextHref,
  backHref,
  children,
  className,
}: PhotoPageNavigationProps) {
  const router = useRouter();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (nextHref) router.prefetch(nextHref);
    if (previousHref) router.prefetch(previousHref);
  }, [nextHref, previousHref, router]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (shouldIgnorePhotoNavigationKey(event)) {
        return;
      }

      if (event.key === "ArrowLeft" && previousHref) {
        event.preventDefault();
        router.push(previousHref);
      } else if (event.key === "ArrowRight" && nextHref) {
        event.preventDefault();
        router.push(nextHref);
      } else if (event.key === "Escape") {
        event.preventDefault();
        router.push(backHref);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [backHref, nextHref, previousHref, router]);

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    // Ignore pinch-zoom and other multi-finger gestures.
    touchStart.current =
      event.touches.length === 1
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
        : null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    const touch = event.changedTouches[0];

    if (!start || !touch || event.touches.length > 0) {
      return;
    }

    const direction = resolveSwipeDirection(touch.clientX - start.x, touch.clientY - start.y);

    if (direction === "previous" && previousHref) {
      router.push(previousHref);
    } else if (direction === "next" && nextHref) {
      router.push(nextHref);
    }
  }

  return (
    <div
      className={className}
      // Let the browser keep vertical scrolling and pinch-zoom; horizontal is ours.
      style={{ touchAction: "pan-y pinch-zoom" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        touchStart.current = null;
      }}
    >
      {children}
    </div>
  );
}
