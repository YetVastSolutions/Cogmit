'use client';
// src/yappout/components/YappoutHighlight.tsx
// Fixed-position highlight overlay that covers the active word

import { useEffect, useState, RefObject } from 'react';

interface YappoutHighlightProps {
  activeRange: Range | null;
  scrollContainerRef: RefObject<HTMLElement | null>;
}

export function YappoutHighlight({ activeRange, scrollContainerRef }: YappoutHighlightProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!activeRange || !container) {
      return;
    }

    function update() {
      if (!activeRange) return;
      const r = activeRange.getBoundingClientRect();
      setRect(r);
    }

    update();

    container.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });

    return () => {
      container.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [activeRange, scrollContainerRef]);

  if (!activeRange || !rect || rect.width === 0 || rect.height === 0) return null;

  return (
    <div
      className="yappout-highlight-overlay"
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 9000,
        left: rect.left - 2,
        top: rect.top - 2,
        width: rect.width + 4,
        height: rect.height + 4,
        outline: '2px solid #FFFF11',
        outlineOffset: '1px',
        boxShadow: '0 0 0 4px #4B0084',
        borderRadius: '2px',
        transition: 'left 0.05s, top 0.05s, width 0.05s, height 0.05s',
      }}
      aria-hidden="true"
    />
  );
}
