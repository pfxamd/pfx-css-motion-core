// Pure, deterministic timing calculations. All times are milliseconds.
const VALID_DIRECTIONS = new Set(["normal", "reverse", "alternate", "alternate-reverse"]);
const VALID_FILLS = new Set(["none", "forwards", "backwards", "both"]);
export function sampleTiming(timing, localTime) {
  if (!Number.isFinite(localTime)) throw new TypeError("localTime must be finite");
  if (!timing || typeof timing !== "object") throw new TypeError("timing must be an object");
  const { duration, delay = 0, endDelay = 0, iterations = 1, direction = "normal", fill = "none" } = timing;
  if (!Number.isFinite(duration) || duration < 0 || !Number.isFinite(delay) || !Number.isFinite(endDelay) ||
      !(iterations === Infinity || (Number.isFinite(iterations) && iterations >= 0)) ||
      !VALID_DIRECTIONS.has(direction) || !VALID_FILLS.has(fill)) throw new TypeError("Invalid timing options");
  const activeDuration = duration === 0 || iterations === 0 ? 0 : duration * iterations;
  if (Number.isFinite(iterations) && !Number.isFinite(activeDuration)) throw new RangeError("Active duration exceeds finite numeric range");
  const endTime = Math.max(0, delay + activeDuration + endDelay);
  const beforeBoundary = Math.max(0, Math.min(delay, endTime));
  const afterBoundary = Math.max(0, Math.min(delay + activeDuration, endTime));
  const phase = localTime < beforeBoundary ? "before" : localTime < afterBoundary ? "active" : "after";
  const fills = phase === "before" ? fill === "backwards" || fill === "both" : phase === "after" ? fill === "forwards" || fill === "both" : true;
  if (!fills) return { phase, progress: null, currentIteration: null, activeDuration, endTime };
  const activeTime = phase === "before" ? 0
    : Math.max(0, Math.min(localTime - delay, activeDuration));
  const overall = duration === 0 ? (phase === "before" ? 0 : iterations)
    : activeTime / duration;
  // Only the completed effect's final boundary belongs to the previous iteration.
  const boundary = activeTime === activeDuration && activeDuration !== Infinity && overall > 0 && Number.isInteger(overall);
  let currentIteration;
  let simpleProgress;
  if (overall === Infinity) {
    currentIteration = 0;
    simpleProgress = 1;
  } else if (iterations === 0) {
    currentIteration = 0;
    simpleProgress = 0;
  } else {
    currentIteration = boundary ? Math.max(0, overall - 1) : Math.floor(overall);
    simpleProgress = boundary ? 1 : overall % 1;
  }
  const reversed = direction === "reverse" ||
    (direction === "alternate" && currentIteration % 2 === 1) ||
    (direction === "alternate-reverse" && currentIteration % 2 === 0);
  return { phase, progress: reversed ? 1 - simpleProgress : simpleProgress, currentIteration, activeDuration, endTime };
}
