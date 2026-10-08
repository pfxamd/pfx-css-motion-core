# PFx CSS Motion Core

A dependency-free, original CSS motion core with pure timing, easing, keyframe normalization, property interpolation, timeline scheduling, playback control, and CSS export. The visual editor is maintained separately in [PFx CSS Motion](https://github.com/pfxamd/pfx-css-motion).

## Status

Early foundation (`0.1.0`). Public APIs and schema are provisional until v1.0.0. This is not yet a browser-rendering engine.

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

## Licensing

The repository currently declares `UNLICENSED`. No reuse or redistribution rights are granted until a license is explicitly chosen.
