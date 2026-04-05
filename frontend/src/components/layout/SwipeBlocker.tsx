"use client";

import { useEffect } from "react";

/**
 * Blocks horizontal swipe-back / swipe-forward browser navigation
 * (macOS trackpad gesture in Chrome / Edge).
 */
export default function SwipeBlocker() {
  useEffect(() => {
    // Block horizontal wheel events (two-finger swipe on trackpad)
    const handleWheel = (e: WheelEvent) => {
      // Only intercept horizontal scrolls that would trigger back/forward
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 10) {
        e.preventDefault();
      }
    };

    // Block touch-based swipe (iOS Safari / touch devices)
    let startX = 0;
    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
    };
    const handleTouchMove = (e: TouchEvent) => {
      const deltaX = e.touches[0].clientX - startX;
      // If starting from edge and swiping inward, block it
      if (
        (startX < 30 && deltaX > 0) ||
        (startX > window.innerWidth - 30 && deltaX < 0)
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener("wheel", handleWheel);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  return null;
}
