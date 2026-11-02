# Yappout

Yappout is the text-to-speech and synchronized-reading module for Cogmit.

## Features

- **Continuous segment-by-segment TTS** using Web Speech API (`SpeechSynthesisUtterance`)
- **Synchronized segment highlighting** via DOM Range overlay (no mutation of rendered HTML)
- **Scroll-to-active-segment** keeps the current segment visible while reading
- **Speed cycling**: 1× → 1.5× → 2× → 0.5× → 0.75× → 1×
- **Seek by double-click / double-tap**: double-click anywhere in a segment to jump to that segment
- **Session-based playback** guards against stale callbacks across stops/seeks

## Architecture

```
src/yappout/
├── core/
│   ├── readingSequence.ts    — Builds ordered SegmentToken array from title + body
│   ├── playbackController.ts — Segment-by-segment speech with session guard
│   ├── wordTracker.ts        — DOM Range builder for segments and words via TreeWalker
│   ├── seekController.ts     — Seek types/utilities
│   ├── speedController.ts    — Speed cycle constants
│   └── scrollController.ts   — Scroll active segment into view
│
├── adapters/
│   ├── speechSynthesisAdapter.ts — Web Speech API wrapper
│   └── cogmitContentAdapter.ts   — Content extraction helper
│
├── components/
│   ├── YappoutButton.tsx    — Play/Stop toggle
│   ├── YappoutSpeed.tsx     — Speed cycle button
│   ├── YappoutWord.tsx      — Word span (for React-rendered title)
│   ├── YappoutSegment.tsx   — Segment span wrapper
│   └── YappoutHighlight.tsx — Fixed-position multi-line highlight overlay
│
├── hooks/
│   └── useYappout.ts        — Central React hook coordinating authoritative currentSegmentIndex
│
├── styles/
│   └── yappout.css          — Scoped .yappout-* CSS
│
├── utils/
│   ├── textNormalizer.ts    — Markdown stripping, tokenization & segment delimiter parsing
│   └── doubleTapDetector.ts — Cross-platform double-tap detection
│
└── index.ts                 — Public exports
```

## Integration

Yappout integrates into `ViewCog.tsx` (cogmit mode):

1. `useYappout` hook manages all state, playback, and `currentSegmentIndex`
2. `YappoutButton` replaces the disabled placeholder in `rightItems`
3. `YappoutSpeed` appears in place of the Like button during playback
4. `YappoutHighlight` renders a fixed-position overlay over the complete active segment
5. `scrollContainerRef` is passed through `CogWorkspaceShell` for auto-scroll

## Limitations

- TTS quality depends on the browser's built-in speech synthesis voices
- Continuous segment progression relies on natural clause/sentence endings (`.`, `?`, `!`, `,`, `:`, `;`, and line breaks)
- The DOM segment map is rebuilt on content changes with a 150ms debounce
- Double-tap seeking requires `caretRangeFromPoint` / `caretPositionFromPoint` browser support (with selection fallback)

