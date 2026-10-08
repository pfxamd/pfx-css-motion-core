# Changelog

## [1.0.0] — 2026-10-08

First stable public release of PFx CSS Motion Core.

### Features
- Schema v1 motion documents with strict validation.
- Timing sampling, deterministic easing functions, keyframe offset normalization.
- Numeric and premultiplied-alpha color interpolation.
- Sequential and overlapping motion timelines.
- Pure clock-driven playback state machine (no implicit timers).
- Deterministic CSS `@keyframes` and animation rule compiler.
- Optional native Web Animations browser adapter with pause, play, seek, reverse, speed controls and cleanup.
- Browser timeline for controlling multiple native effects at a shared position.

### Quality and compatibility
- API contract checks and package integrity auditing; no runtime dependencies.
- Node.js 20, 22 and 24 in CI.
- Native timing and preview checks in Firefox and Playwright WebKit.
- Separate actual Safari browser verification on macOS via SafariDriver.
- Known Safari `getComputedTiming()` endpoint differences remain documented in [browser conformance](docs/browser-conformance.md), and tracked as [issue #2](https://github.com/pfxamd/pfx-css-motion-core/issues/2). CSS output rendering tests pass in the tested cases.

### Intended limitations
- ESM-only package, requiring Node.js 20+ for Node consumers.
- Browser Adapter requires native `Element.animate()`; no DOM or timer polyfill.
- Pure CSS compiler rejects `endDelay` and unsupported per-keyframe additive compositions rather than silently changing behavior.
- Do not assume support for every CSS property or easing syntax.
- No TypeScript declaration files shipped for v1.0.0.
- Not published to npm automatically by GitHub release workflow.
