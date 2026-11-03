// src/yappout/utils/doubleTapDetector.ts
// Cross-platform double-tap / dblclick detection helper

import { YAPPOUT_DOUBLE_TAP_DELAY, YAPPOUT_TAP_SLOP } from '@/constants';

/**
 * Calls onDoubleTap with the event when a double-tap (touch) or dblclick is detected.
 * Returns a cleanup function.
 */
export function attachDoubleTapHandler(
  element: HTMLElement,
  onDoubleTap: (x: number, y: number) => void,
): () => void {
  let lastTapTime = 0;
  let lastTapX = 0;
  let lastTapY = 0;
  const DOUBLE_TAP_DELAY = YAPPOUT_DOUBLE_TAP_DELAY; // ms
  const TAP_SLOP = YAPPOUT_TAP_SLOP; // px

  function handleTouchEnd(e: TouchEvent) {
    const touch = e.changedTouches[0];
    if (!touch) return;

    const now = Date.now();
    const dx = Math.abs(touch.clientX - lastTapX);
    const dy = Math.abs(touch.clientY - lastTapY);

    if (now - lastTapTime < DOUBLE_TAP_DELAY && dx < TAP_SLOP && dy < TAP_SLOP) {
      e.preventDefault();
      onDoubleTap(touch.clientX, touch.clientY);
      lastTapTime = 0;
    } else {
      lastTapTime = now;
      lastTapX = touch.clientX;
      lastTapY = touch.clientY;
    }
  }

  function handleDblClick(e: MouseEvent) {
    onDoubleTap(e.clientX, e.clientY);
  }

  element.addEventListener('touchend', handleTouchEnd, { passive: false });
  element.addEventListener('dblclick', handleDblClick);

  return () => {
    element.removeEventListener('touchend', handleTouchEnd);
    element.removeEventListener('dblclick', handleDblClick);
  };
}

