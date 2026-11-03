// src/yappout/core/speedController.ts
// Speed cycle configuration for Yappout

import { SPEED_CYCLE, SPEED_LABELS, DEFAULT_SPEED_IDX } from '../../constants/index';

// Re-export constants for backwards compatibility
export { SPEED_CYCLE, SPEED_LABELS, DEFAULT_SPEED_IDX };

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

