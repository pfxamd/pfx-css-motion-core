import { assertValidMotion } from './validate.js';
import { normalizeKeyframes } from './keyframes.js';
import { parseEasing } from './easing.js';
import { createTimeline } from './timeline.js';

// Browser-independent conversion: importing this module never touches window or document.
function validateEasing(value, label) {
  try { parseEasing(value); }
  catch { throw new TypeError(`Unsupported ${label}: ${String(value)}`); }
  return value.trim();
}

export function toBrowserKeyframes(motion) {
  assertValidMotion(motion);
  if (motion.keyframes.length === 0) throw new RangeError('A browser animation requires keyframes');
  const frames = normalizeKeyframes(motion.keyframes);
  if (!frames.some(frame => Object.keys(frame).some(key =>
    key !== 'offset' && key !== 'easing' && key !== 'composite'))) {
    throw new TypeError('A browser animation requires at least one animated property');
  }
  return frames.map((frame, index) => {
    const result = { ...frame };
    if (frame.easing !== undefined) result.easing = validateEasing(frame.easing, `keyframes[${index}].easing`);
    return result;
  });
}

export function toBrowserTiming(motion, { startOffset = 0 } = {}) {
  assertValidMotion(motion);
  if (!Number.isFinite(startOffset) || startOffset < 0) {
    throw new RangeError('startOffset must be finite and non-negative');
  }
  const t = motion.timing;
  const delay = t.delay + startOffset;
  if (!Number.isFinite(delay)) throw new RangeError('Total browser delay overflow');
  return {
    duration: t.duration,
    delay,
    endDelay: t.endDelay,
    iterations: t.iterations,
    direction: t.direction,
    fill: t.fill,
    easing: validateEasing(t.easing, 'timing.easing')
  };
}

function assertTarget(element) {
  if (!element || typeof element.animate !== 'function') {
    throw new TypeError('Expected an element exposing animate()');
  }
}
function assertOptions(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('Browser adapter options must be an object');
  }
}
function validRate(rate) {
  if (!Number.isFinite(rate) || rate === 0) throw new RangeError('Playback rate must be finite and nonzero');
}
function validTime(time) {
  if (typeof time !== 'number' || !Number.isFinite(time)) throw new RangeError('Seek time must be finite');
}

/**
 * Wrap the native Web Animations API without a timer, DOM polling or injected styles.
 * autoplay defaults to false so a preview cannot play unexpectedly.
 * State is read from the native animation; no parallel clock can drift.
 */
export function createBrowserAnimation(element, motion, options = {}) {
  assertOptions(options);
  const { autoplay = false, startOffset = 0 } = options;
  if (typeof autoplay !== 'boolean') throw new TypeError('autoplay must be boolean');
  assertTarget(element);
  const frames = toBrowserKeyframes(motion);
  const timing = toBrowserTiming(motion, { startOffset });
  const animation = element.animate(frames, timing);
  let disposed = false;

  // Element.animate() auto-plays; pause immediately unless explicitly requested.
  try { if (!autoplay) animation.pause(); }
  catch (error) { animation.cancel(); throw error; }
  const assertAlive = () => {
    if (disposed) throw new Error('Browser animation has been disposed');
  };
  const state = () => Object.freeze({
    id: motion.id,
    playState: disposed ? 'disposed' : animation.playState,
    currentTime: animation.currentTime,
    playbackRate: animation.playbackRate,
    startOffset,
    disposed
  });
  const controller = {
    get animation() { return animation; },
    get state() { return state(); },
    get finished() { assertAlive(); return animation.finished; },
    play() { assertAlive(); animation.play(); return state(); },
    pause() { assertAlive(); animation.pause(); return state(); },
    reverse() { assertAlive(); animation.reverse(); return state(); },
    seek(time) { assertAlive(); validTime(time); animation.currentTime = time; return state(); },
    setRate(rate) { assertAlive(); validRate(rate); animation.playbackRate = rate; return state(); },
    finish() { assertAlive(); animation.finish(); return state(); },
    cancel() { assertAlive(); animation.cancel(); return state(); },
    dispose() {
      if (!disposed) {
        disposed = true;
        animation.cancel();
      }
      return state();
    }
  };
  return Object.freeze(controller);
}

/**
 * Synchronize clips against a single global position.
 * Each native effect's delay includes its clip offset; seeking every animation
 * to the same time preserves sequential and overlapping scheduling.
 * Entries: { element, motion, at?, id? }. This does not mutate motions.
 */
export function createBrowserTimeline(entries, options = {}) {
  assertOptions(options);
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new TypeError('Browser timeline requires at least one entry');
  }
  const { autoplay = false } = options;
  if (typeof autoplay !== 'boolean') throw new TypeError('autoplay must be boolean');

  // Preflight every entry before creating any browser effects.
  const timeline = createTimeline(entries);
  for (const entry of entries) {
    assertTarget(entry.element);
    toBrowserKeyframes(entry.motion);
    toBrowserTiming(entry.motion);
  }
  const controllers = [];
  try {
    for (let index = 0; index < timeline.clips.length; index++) {
      controllers.push(createBrowserAnimation(entries[index].element, entries[index].motion, {
        autoplay: false,
        startOffset: timeline.clips[index].start
      }));
    }
  } catch (error) {
    for (const controller of controllers) controller.dispose();
    throw error;
  }
  let disposed = false;
  // The clip that ends last remains the timeline clock after earlier clips finish.
  const masterIndex = timeline.clips.findIndex(clip => clip.end === timeline.duration);
  const assertAlive = () => {
    if (disposed) throw new Error('Browser timeline has been disposed');
  };
  const state = () => Object.freeze({
    playState: disposed ? 'disposed' : controllers[masterIndex].state.playState,
    currentTime: controllers[masterIndex].state.currentTime,
    playbackRate: controllers[masterIndex].state.playbackRate,
    duration: timeline.duration,
    disposed
  });
  const apply = (method, value) => {
    assertAlive();
    for (const controller of controllers) {
      if (value === undefined) controller[method]();
      else controller[method](value);
    }
    return state();
  };
  const group = {
    get clips() { return timeline.clips.slice(); },
    get animations() { return controllers.map(controller => controller.animation); },
    get state() { return state(); },
    play() { return apply('play'); },
    pause() { return apply('pause'); },
    seek(time) { validTime(time); return apply('seek', time); },
    setRate(rate) { validRate(rate); return apply('setRate', rate); },
    reverse() {
      assertAlive();
      const before = state();
      const nextRate = -before.playbackRate;
      for (const controller of controllers) controller.setRate(nextRate);
      // Starting backwards from zero means starting from the end of the sequence.
      if (before.currentTime === 0 && Number.isFinite(timeline.duration)) {
        for (const controller of controllers) controller.seek(timeline.duration);
      }
      return apply('play');
    },
    cancel() { return apply('cancel'); },
    dispose() {
      if (!disposed) {
        disposed = true;
        for (const controller of controllers) controller.dispose();
      }
      return state();
    }
  };
  const result = Object.freeze(group);
  if (autoplay) result.play();
  return result;
}
