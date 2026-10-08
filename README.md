# PFx CSS Motion Core

A dependency-free, original CSS animation core. This repository contains the standalone core; the visual editor lives in [PFx CSS Motion](https://github.com/pfxamd/pfx-css-motion).

## Status

Early foundation (0.1.0). **This is not yet an animation renderer or CSS compiler.**

## Scope

- Versioned animation document model
- Strict input validation
- Planned independent timing, easing, keyframe, property, timeline, playback, and CSS export modules
- Browser-adapter boundary (no DOM dependency in the pure computation layer)

## Run tests

```sh
npm test
```

Node.js 20+; no third-party dependencies.

## Usage

```js
import { createMotion, validateMotion } from "@pfxamd/css-motion-core";

const motion = createMotion({
  id: "fade-in",
  timing: { duration: 600 },
  keyframes: [{ offset: 0, opacity: 0 }, { offset: 1, opacity: 1 }]
});

const result = validateMotion(motion);
if (!result.valid) console.error(result.errors);
```

## Architecture

```text
src/
  index.js       Public exports
  model.js       Versioned model/defaults
  validate.js    Pure validation
test/            Node built-in tests
```

## API compatibility

Schema v1 is a provisional internal contract; public API stability is not promised until v1.0.0.

## Licensing

No reuse or redistribution permissions are granted by this repository at this stage. License decision pending.
