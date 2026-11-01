// src/yappout/core/speedController.ts
// Speed cycle configuration for Yappout

// Cycle: 1x → 1.5x → 2x → 0.5x → 0.75x → 1x
export const SPEED_CYCLE = [1, 1.5, 2, 0.5, 0.75] as const;
export const SPEED_LABELS = ['1×', '1.5×', '2×', '0.5×', '0.75×'] as const;
export const DEFAULT_SPEED_IDX = 0; // index 0 = 1x

export type SpeedValue = (typeof SPEED_CYCLE)[number];

export function getSpeedLabel(cycleIdx: number): string {
  return SPEED_LABELS[cycleIdx % SPEED_CYCLE.length];
}

export function getSpeed(cycleIdx: number): number {
  return SPEED_CYCLE[cycleIdx % SPEED_CYCLE.length];
}

export function nextSpeedIdx(cycleIdx: number): number {
  return (cycleIdx + 1) % SPEED_CYCLE.length;
}

