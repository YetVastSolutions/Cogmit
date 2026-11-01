# Yappout

Yappout is the text-to-speech and synchronized-reading module for Cogmit.

## Features

- **Word-by-word TTS** using the Web Speech API (`SpeechSynthesisUtterance`)
- **Synchronized word highlighting** via DOM Range overlay (no mutation of rendered HTML)
- **Scroll-to-active-word** keeps the current word visible while reading
- **Speed cycling**: 1× → 1.5× → 2× → 0.5× → 0.75× → 1×
- **Seek by double-click / double-tap**: double-click any word to jump to it
- **Session-based playback** guards against stale callbacks across stops/seeks

## Architecture

```
src/yappout/
├── core/
│   ├── readingSequence.ts    — Builds ordered WordToken array from title + body
│   ├── playbackController.ts — Word-by-word speech with session guard
│   ├── wordTracker.ts        — DOM Range builder via TreeWalker
│   ├── seekController.ts     — Seek types/utilities
│   ├── speedController.ts    — Speed cycle constants
│   └── scrollController.ts   — Scroll active word into view
│
├── adapters/
│   ├── speechSynthesisAdapter.ts — Web Speech API wrapper
│   └── cogmitContentAdapter.ts   — Content extraction helper
│
├── components/
│   ├── YappoutButton.tsx    — Play/Stop toggle
│   ├── YappoutSpeed.tsx     — Speed cycle button
│   ├── YappoutWord.tsx      — Word span (for React-rendered title)
│   └── YappoutHighlight.tsx — Fixed-position highlight overlay
│
├── hooks/
│   └── useYappout.ts        — Central React hook
│
├── styles/
│   └── yappout.css          — Scoped .yappout-* CSS
│
├── utils/
│   ├── textNormalizer.ts    — Markdown stripping + tokenization
│   └── doubleTapDetector.ts — Cross-platform double-tap detection
│
└── index.ts                 — Public exports
```

## Integration

Yappout integrates into `ViewCog.tsx` (cogmit mode):

1. `useYappout` hook manages all state and playback
2. `YappoutButton` replaces the disabled placeholder in `rightItems`
3. `YappoutSpeed` appears in place of the Like button during playback
4. `YappoutHighlight` renders a fixed-position overlay over the active word
5. `scrollContainerRef` is passed through `CogWorkspaceShell` for auto-scroll

## Limitations

- TTS quality depends on the browser's built-in speech synthesis voices
- Word boundary detection relies on `SpeechSynthesisUtterance.onend` (one utterance per word), which is accurate but adds slight gaps between words
- The DOM word map is rebuilt on content changes with a 150ms debounce
- Double-tap seeking requires `caretRangeFromPoint` / `caretPositionFromPoint` browser support

