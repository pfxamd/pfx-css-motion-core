# PFx CSS Motion Core

A dependency-free, original CSS motion core with pure timing, easing, keyframe normalization, property interpolation, timeline scheduling, playback control, and CSS export. The visual editor is maintained separately in [PFx CSS Motion](https://github.com/pfxamd/pfx-css-motion).

## Status

Stable v1.0.0 API candidate. Motion schema v1 and all 23 public exports are covered by a compatibility test. The pure core has no DOM requirement; the optional Browser Adapter uses native Web Animations API for preview.

## Install and tests

Node.js 20+; no runtime dependencies. GitHub Releases ship the versioned source archive. No automatic npm-registry publication.

```sh
npm run release:check
```

## Compile an animation

```js
import { createMotion, validateMotion, compileCSS } from "@pfxamd/css-motion-core";

const motion = createMotion({
  id: "fade-in",
  timing: {
    duration: 600,
    fill: "both",
    easing: "ease-in-out",
  },
  keyframes: [
    { offset: 0, opacity: 0, transform: "translateY(20px)" },
    { offset: 1, opacity: 1, transform: "translateY(0)" },
  ],
});

const result = validateMotion(motion);
if (!result.valid) throw new Error(JSON.stringify(result.errors));

const { css, className, keyframesName } = compileCSS(motion);
// Add css to a stylesheet and apply className to an element.
console.log({ css, className, keyframesName });
```

## Browser Adapter: native playback and timeline

```js
import {
  createMotion, createBrowserAnimation, createBrowserTimeline
} from "@pfxamd/css-motion-core";

const motion = createMotion({
  id: "card-entrance",
  timing: { duration: 600, fill: "both", easing: "ease-out" },
  keyframes: [
    { opacity: 0, transform: "translateY(24px)" },
    { opacity: 1, transform: "translateY(0)" }
  ]
});

// Browser-only: call after the target exists in the DOM.
// Paused by default, ideal for scrubbing a visual editor.
const controller = createBrowserAnimation(document.querySelector(".card"), motion);
controller.seek(300);       // milliseconds
controller.setRate(1.5);
controller.play();
controller.pause();
controller.reverse();
controller.dispose();       // native animation is canceled; safe to call twice

const first = document.querySelector(".first");
const second = document.querySelector(".second");
const sequence = createBrowserTimeline([
  { element: first, motion },
  { element: second, motion, at: "after" }
]);
sequence.seek(900);          // one shared global time across both effects
sequence.play();
sequence.dispose();
```

- Browser-facing exports: `toBrowserKeyframes`, `toBrowserTiming`, `createBrowserAnimation`, `createBrowserTimeline`.
- Pure conversion, no DOM access when importing; native `Element.animate()` required at invocation.
- Supports pause, play, reverse, seek, playback rate, cancellation and idempotent cleanup; native timing includes `endDelay`.
- Timeline clips may run sequentially, overlap or start at explicit nonnegative times. Every native effect receives the clip offset as an additional delay.
- No additional runtime dependencies, polling loops, stylesheet injection or parallel animation clocks.
- Invalid motions and unsupported easing are rejected before creation. Partially constructed groups are canceled if a later native creation fails.
- Not a full polyfill: property-specific CSS validation, some compositing modes and engine behavior remain browser-dependent. Seeking is in milliseconds and may be outside the effect's active range.
- The exported CSS compiler remains independent of this native browser adapter.

For the full stable contract, see [v1 API documentation](docs/API-v1.md).

## CSS compiler guarantees and boundaries

- Pure function: no DOM access or dependencies; does not mutate the motion.
- Produces a deterministic, collision-resistant class/keyframe name based on motion ID.
- Emits `@keyframes` and explicit `animation-*` properties.
- Supports computed offsets, duplicate offsets, timing (duration, delay, iterations, direction, fill), CSS easing presets, `steps()` and `cubic-bezier()`, and per-keyframe easing.
- Supports simple CSS and custom property names plus string or finite-number values. Common camelCase names are converted to CSS kebab-case.
- Rejects suspicious CSS declarations, invalid selectors, `endDelay`, and per-keyframe `add`/`accumulate` compositions rather than silently changing the animation.
- **Limitations:** Property-specific CSS syntax and real browser support are not validated by the pure compiler. Unsupported easing functions including `linear()` are rejected for now. The CSS animation model does not have a direct `endDelay` property.

## Modules

```text
src/
  model.js       Versioned motion document and timing defaults
  validate.js    Motion validation and errors
  timing.js      Deterministic timing sampling
  easing.js      Easing functions and parser
  keyframes.js   Keyframe offset normalization
  properties.js  Numeric and color interpolation
  timeline.js    Sequencing and overlapping motion clips
  playback.js    Clock-driven playback state
  compiler.js    CSS keyframes and animation rule generation
  browser.js     Optional browser adapter and timeline preview
  index.js       Public exports
test/            Node built-in tests
```

## Verification and release gate

GitHub Actions executes the unit, edge-case and randomized stress suite on Node.js 20, 22 and 24; native browser conformance runs on Firefox and Playwright WebKit (Linux), plus a separate **real Safari on macOS** job.

- The release candidate adds public-API compatibility and package integrity checks to the existing browser-adapter tests. The exact totals are recorded by CI.
- Adapter integration asserts real rendered opacity, transform, timeline ordering, seek, rate, pause and native cleanup on Firefox, WebKit and native Safari.
- Core timing is checked against native timing at **21,600 samples per Firefox/WebKit engine**.
- Native Safari's timing API has **116 documented endpoint discrepancies** (112 wrapping and 4 precision); the expected W3C endpoint semantics and compiled CSS rendering are tested separately. This divergence is reported, never silently corrected or hidden.
- Details: [cross-browser verification](docs/browser-conformance.md) and [Safari issue #2](https://github.com/pfxamd/pfx-css-motion-core/issues/2).

**Release gate:** the release workflow must pass package checks, native browser conformance and the unit/stress suite before creating the GitHub Release and `v1.0.0` tag. The known Safari native endpoint discrepancy remains explicitly reported.

## Licensing

Apache License 2.0 — Copyright 2026 PFxamd. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
