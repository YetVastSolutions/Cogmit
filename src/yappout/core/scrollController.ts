// src/yappout/core/scrollController.ts
// Scrolls the active segment into view within the scroll container

/**
 * Scrolls the segment (identified by its Range) into view within the given scroll container.
 * Adds a margin buffer so the segment is not at the very edge.
 */
export function scrollSegmentIntoView(segmentRange: Range, scrollContainer: HTMLElement): void {
  const segmentRect = segmentRange.getBoundingClientRect();
  const containerRect = scrollContainer.getBoundingClientRect();

  const segmentTop = segmentRect.top - containerRect.top + scrollContainer.scrollTop;
  const segmentBottom = segmentTop + segmentRect.height;

  const visTop = scrollContainer.scrollTop;
  const visBottom = visTop + scrollContainer.clientHeight;

  const margin = 80; // px buffer zone

  if (segmentTop - margin < visTop) {
    // Need to scroll up
    scrollContainer.scrollTo({ top: Math.max(0, segmentTop - margin), behavior: 'smooth' });
  } else if (segmentBottom + margin > visBottom) {
    // Need to scroll down
    scrollContainer.scrollTo({
      top: segmentBottom + margin - scrollContainer.clientHeight,
      behavior: 'smooth',
    });
  }
  // else: segment is already visible, no scroll needed
}

export const scrollWordIntoView = scrollSegmentIntoView;

