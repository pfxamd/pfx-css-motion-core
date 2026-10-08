# PFx CSS Motion Core

A dependency-free, original CSS motion core with pure timing, easing, keyframe normalization, property interpolation, timeline scheduling, playback control, and CSS export. The visual editor is maintained separately in [PFx CSS Motion](https://github.com/pfxamd/pfx-css-motion).

## Status

Early foundation (`0.1.0`). Public APIs and schema are provisional until v1.0.0. This is not yet a browser-rendering engine. The CSS compiler exports CSS, but does not apply it to DOM elements.

## Install and tests

Node.js 20+ for tests; no runtime dependencies.

```sh
npm test
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
  index.js       Public exports
test/            Node built-in tests
```

## Quality checks and edge-case coverage

Run `npm test` for the complete regression/stress suite and `npm run check` for syntax and unit tests. Continuous integration is configured for Node.js 20, 22, and 24.

Current local validation (Node.js 22, October 2026):

- 69/69 tests passed; suite passed on 10 consecutive runs.
- Coverage from `node --test --experimental-test-coverage`: 98.27% total line coverage, 88.67% total branch coverage, 100% total function coverage (these totals **include test files**).
- Randomized deterministic stress cases: easing, timing, keyframe compilation, timeline sequencing, numeric interpolation, and 25,000 playback ticks.
- Timing fixes: exact iteration boundaries, negative end delay clipping, finite timestamps, and duration overflow.
- Scheduling fixes: after-overlap ordering and rejection of unbounded sequential scheduling.
- Input fixes: sparse keyframe rejection, small numerical values, bounded overflow fallback, monotonic playback clock.

**Before publishing v1.0.0:** verify actual CSS output in Firefox, Chromium, and Safari. Chromium's local headless check could not run in the current execution environment; do not treat the browser-compatibility gate as passed. The compiler is intentionally conservative: it does not validate property-specific CSS grammar in a browser, and unsupported compositions/easings are rejected.

## Browser verification (October 8, 2026)

The deterministic Node.js suite contains **74 tests** after adding regressions discovered through actual browser comparisons.

Chromium 144 headless was launched successfully, and the following checks were performed:
- **8,424 / 8,424** timing samples matched native `Element.animate()` / `getComputedTiming()` after correcting zero-duration backwards fill and negative `endDelay` cases.
- **224 / 224** easing samples matched native Chromium behavior.
- A generated CSS animation was tested at half duration: opacity `0.5` and translateX `50px`.
- A larger **80,064-sample** timing comparison showed **44 disagreements at exact iteration discontinuities**, attributable to sampling precisely on zero/one boundaries; there were **0 mismatches elsewhere**. These exact-boundary cross-engine differences remain a compatibility concern, not a passed gate.
- Firefox and WebKit/Safari executables were **unavailable** in the test environment. Do not claim cross-browser certification.
- GitHub Actions remote run status was not independently verified. The `v1.0.0` release gate therefore remains open.

To reproduce the browser checks without third-party runtime dependencies, serve the repository root over HTTP and navigate to `test/browser-conformance.html` in a browser. The report uses native Web Animations API comparisons.

## Licensing

The repository currently declares `UNLICENSED`. No reuse or redistribution rights are granted until a license is explicitly chosen.
