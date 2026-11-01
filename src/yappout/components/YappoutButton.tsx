'use client';
// src/yappout/components/YappoutButton.tsx
// Play/Stop toggle button for Yappout

import { Volume2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlaybackState } from '../hooks/useYappout';

interface YappoutButtonProps {
  playbackState: PlaybackState;
  onPlay: () => void;
  onStop: () => void;
  compact?: boolean;
}

export function YappoutButton({
  playbackState,
  onPlay,
  onStop,
  compact = false,
}: YappoutButtonProps) {
  const isPlaying = playbackState === 'playing';

  if (compact) {
    return (
      <Button
        variant="outline"
        onClick={isPlaying ? onStop : onPlay}
        className="shrink-0 h-10 w-10 px-0 flex-none"
        aria-label={isPlaying ? 'Stop YappOut' : 'Play YappOut'}
        title={isPlaying ? 'Stop YappOut' : 'Play YappOut'}
      >
        {isPlaying ? (
          <Square className="w-4 h-4 shrink-0" />
        ) : (
          <Volume2 className="w-4 h-4 shrink-0" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={isPlaying ? onStop : onPlay}
      className="shrink-0 h-10 w-full md:w-auto px-4 flex-none"
      aria-label={isPlaying ? 'Stop YappOut' : 'Play YappOut'}
      title={isPlaying ? 'Stop YappOut' : 'Play YappOut'}
    >
      <span className="whitespace-nowrap">{isPlaying ? 'Stop' : 'YappOut'}</span>
      {isPlaying ? (
        <Square className="w-4 h-4 ml-2 shrink-0" />
      ) : (
        <Volume2 className="w-4 h-4 ml-2 shrink-0" />
      )}
    </Button>
  );
}

