export const SCHEMA_VERSION = 1;
export const DEFAULT_TIMING = Object.freeze({
  duration: 1000,
  delay: 0,
  endDelay: 0,
  iterations: 1,
  direction: "normal",
  fill: "none",
  easing: "linear"
});
export function createMotion({ id = "motion", name = "Untitled motion", timing = {}, keyframes = [] } = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    name,
    timing: { ...DEFAULT_TIMING, ...timing },
    keyframes: keyframes.map(frame => ({ ...frame }))
  };
}
