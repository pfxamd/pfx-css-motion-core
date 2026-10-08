// Pure, deterministic timing calculations. All times are milliseconds.
const VALID_DIRECTIONS = new Set(["normal", "reverse", "alternate", "alternate-reverse"]);
const VALID_FILLS = new Set(["none", "forwards", "backwards", "both"]);
export function sampleTiming(timing, localTime) {
  if (typeof localTime !== "number" || Number.isNaN(localTime)) throw new TypeError("localTime must be a number");
  const { duration, delay = 0, endDelay = 0, iterations = 1, direction = "normal", fill = "none" } = timing;
  if (!Number.isFinite(duration) || duration < 0 || !Number.isFinite(delay) || !Number.isFinite(endDelay) ||
      !(iterations === Infinity || (Number.isFinite(iterations) && iterations >= 0)) ||
      !VALID_DIRECTIONS.has(direction) || !VALID_FILLS.has(fill)) throw new TypeError("Invalid timing options");
  const activeDuration = duration === 0 ? 0 : iterations === Infinity ? Infinity : duration * iterations;
  const endTime = Math.max(0, delay + activeDuration + endDelay);
  const activeEnd = delay + activeDuration;
  const phase = localTime < delay ? "before" : localTime < activeEnd ? "active" : "after";
  const fills = phase === "before" ? fill === "backwards" || fill === "both" : phase === "after" ? fill === "forwards" || fill === "both" : true;
  if (!fills) return { phase, progress: null, currentIteration: null, activeDuration, endTime };
  let overall;
  if (phase === "before") overall = 0;
  else if (phase === "after") overall = iterations;
  else overall = duration === 0 ? 0 : (localTime - delay) / duration;
  // At an exact iteration endpoint, show the endpoint of the previous iteration.
  const boundary = phase === "after" && Number.isFinite(iterations) && iterations > 0 ||
    phase === "active" && overall > 0 && Number.isInteger(overall);
  let currentIteration;
  let simpleProgress;
  if (duration === 0 && iterations === Infinity) {
    currentIteration = 0;
    simpleProgress = 1;
  } else if (iterations === 0) {
    currentIteration = 0;
    simpleProgress = 0;
  } else {
    currentIteration = boundary ? Math.max(0, Math.ceil(overall) - 1) : Math.floor(overall);
    simpleProgress = boundary ? (overall % 1 || 1) : overall % 1;
  }
  const reversed = direction === "reverse" ||
    (direction === "alternate" && currentIteration % 2 === 1) ||
    (direction === "alternate-reverse" && currentIteration % 2 === 0);
  return { phase, progress: reversed ? 1 - simpleProgress : simpleProgress, currentIteration, activeDuration, endTime };
}
