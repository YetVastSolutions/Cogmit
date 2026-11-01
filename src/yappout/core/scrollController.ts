// src/yappout/core/scrollController.ts
// Scrolls the active word into view within the scroll container

/**
 * Scrolls the word (identified by its Range) into view within the given scroll container.
 * Adds a margin buffer so the word is not at the very edge.
 */
export function scrollWordIntoView(wordRange: Range, scrollContainer: HTMLElement): void {
  const wordRect = wordRange.getBoundingClientRect();
  const containerRect = scrollContainer.getBoundingClientRect();

  const wordTop = wordRect.top - containerRect.top + scrollContainer.scrollTop;
  const wordBottom = wordTop + wordRect.height;

  const visTop = scrollContainer.scrollTop;
  const visBottom = visTop + scrollContainer.clientHeight;

  const margin = 80; // px buffer zone

  if (wordTop - margin < visTop) {
    // Need to scroll up
    scrollContainer.scrollTo({ top: Math.max(0, wordTop - margin), behavior: 'smooth' });
  } else if (wordBottom + margin > visBottom) {
    // Need to scroll down
    scrollContainer.scrollTo({
      top: wordBottom + margin - scrollContainer.clientHeight,
      behavior: 'smooth',
    });
  }
  // else: word is already visible, no scroll needed
}

