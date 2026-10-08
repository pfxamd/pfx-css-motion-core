# PFx CSS Motion Core — v1 stable API

The single ESM entry point is `@pfxamd/css-motion-core` (`src/index.js`).
No implicit DOM access, no runtime dependencies, Node.js >= 20 for Node imports.

## Public exports (locked v1 contract)

| Area | Exports |
|---|---|
| Model | `SCHEMA_VERSION`, `DEFAULT_TIMING`, `createMotion` |
| Validation | `validateMotion`, `assertValidMotion` |
| Timing | `sampleTiming` |
| Easing | `cubicBezier`, `steps`, `parseEasing` |
| Keyframes | `normalizeKeyframes` |
| Property interpolation | `parseNumeric`, `parseColor`, `interpolateValue`, `interpolateProperties` |
| Timeline | `createTimeline`, `sampleTimeline` |
| Playback | `createPlayback` |
| CSS output | `compileCSS`, `CSSCompileError` |
| Browser | `toBrowserKeyframes`, `toBrowserTiming`, `createBrowserAnimation`, `createBrowserTimeline` |

**Schema version is 1.** Changing the document shape or removing/renaming a public export is a breaking change requiring a major release. New nonbreaking exports can be added in minor releases. Bug fixes should use patch releases.

## Motion model

```js
const motion = createMotion({
  id: 'fade',
  name: 'Fade in',
  timing: {
    duration: 600,     // ms, finite >= 0
    delay: 0,          // signed milliseconds
    endDelay: 0,       // signed milliseconds
    iterations: 1,     // >= 0 or Infinity
    direction: 'normal',  // normal | reverse | alternate | alternate-reverse
    fill: 'both',         // none | forwards | backwards | both
    easing: 'ease-in-out'
  },
  keyframes: [
    { offset: 0, opacity: 0 },
    { offset: 1, opacity: 1 }
  ]
});
```

Use `validateMotion(motion)` for structured issues; `assertValidMotion(motion)` throws on validation errors.
The timing and interpolation functions are pure and do not read browser state.

## CSS compiler

`compileCSS(motion, {className?})` returns `{css,className,keyframesName}`.
Importantly the compiler **cannot represent `endDelay`** as a CSS animation property and explicitly rejects nonzero values. It also validates easing syntax and rejects non-replace keyframe composition.

## Native browser adapter

`createBrowserAnimation(element, motion, {autoplay=false, startOffset=0})`
returns a frozen controller exposing:

- `animation` — underlying native Animation (read-only reference).
- `state` — snapshot of playState/currentTime/playbackRate/id/startOffset/disposed.
- `finished` — native finished promise.
- `play()`, `pause()`, `reverse()`, `seek(milliseconds)`, `setRate(nonzeroRate)`, `finish()`, `cancel()`, `dispose()`.

`createBrowserTimeline([{element,motion,at?,id?}], {autoplay=false})`
exposes `clips`, `animations`, `state`, `play()`, `pause()`, `seek(time)`,
`setRate(rate)`, `reverse()`, `cancel()`, and `dispose()`.
Position `at` can be a nonnegative millisecond offset, `"after"` or `"with-previous"`.
Timeline previews apply a shared currentTime to all native animations; each clip's start is included in its delay.
Both controller and timeline require real `Element.animate()` at invocation but can be **imported without a DOM**.

### Scope and compatibility caveats

- The browser controls reflect the underlying browser implementation; platform-specific behavior can differ.
- `dispose()` cancels native animations and is idempotent.
- A browser animation is paused by default until `play()`.
- The pure timeline and pure playback do not use the DOM.
- Safari 26.6.1 returns different native `getComputedTiming().progress` values at some final iteration boundaries. The core retains W3C endpoint behavior and logs these known Safari differences instead of silently emulating them. See [browser conformance](browser-conformance.md).

## Release verification

`npm run release:check` runs syntax/unit/stress tests plus a package whitelist, Apache-2.0 license and zero-runtime-dependencies audit. CI additionally runs native browser tests on Firefox, WebKit and Safari.
