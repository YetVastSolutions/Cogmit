// src/yappout/core/seekController.ts
// Helper types and utilities for seek operations

export interface SeekRequest {
  segmentIndex: number;
  sessionId: number;
  wordIndex?: number;
}

