'use client';
// src/yappout/components/YappoutWord.tsx
// Word span wrapper with active highlight and double-tap support

interface YappoutWordProps {
  text: string;
  isActive: boolean;
  onDoubleClick?: () => void;
}

export function YappoutWord({ text, isActive, onDoubleClick }: YappoutWordProps) {
  return (
    <span
      className={`yappout-word${isActive ? ' yappout-word-active' : ''}`}
      onDoubleClick={onDoubleClick}
    >
      {text}
    </span>
  );
}

