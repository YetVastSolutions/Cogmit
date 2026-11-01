'use client';
// src/yappout/components/YappoutSpeed.tsx
// Speed cycle button for Yappout

import { Button } from '@/components/ui/button';

interface YappoutSpeedProps {
  speedLabel: string;
  onCycle: () => void;
  compact?: boolean;
}

export function YappoutSpeed({ speedLabel, onCycle, compact = false }: YappoutSpeedProps) {
  if (compact) {
    return (
      <Button
        variant="outline"
        onClick={onCycle}
        className="yappout-speed-btn shrink-0 h-10 w-10 px-0 flex-none"
        aria-label={`Speed: ${speedLabel}. Click to cycle.`}
        title={`Speed: ${speedLabel}. Click to cycle.`}
      >
        <span className="text-xs font-medium">{speedLabel}</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={onCycle}
      className="yappout-speed-btn shrink-0 h-10 w-full md:w-auto px-4 flex-none"
      aria-label={`Speed: ${speedLabel}. Click to cycle.`}
      title={`Speed: ${speedLabel}. Click to cycle.`}
    >
      <span className="whitespace-nowrap text-sm font-medium">{speedLabel}</span>
    </Button>
  );
}

