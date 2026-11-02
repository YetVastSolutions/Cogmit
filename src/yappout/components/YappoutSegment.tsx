'use client';
// src/yappout/components/YappoutSegment.tsx
// Segment span wrapper with active highlight and double-tap support

interface YappoutSegmentProps {
  text: string;
  isActive: boolean;
  onDoubleClick?: () => void;
}

export function YappoutSegment({ text, isActive, onDoubleClick }: YappoutSegmentProps) {
  return (
    <span
      className={`yappout-segment${isActive ? ' yappout-segment-active' : ''}`}
      onDoubleClick={onDoubleClick}
    >
      {text}
    </span>
  );
}

