// Pure timeline scheduling. Positions are in milliseconds.
// The timeline does not mutate source motions or depend on the DOM.
export function createTimeline(entries = []) {
  if (!Array.isArray(entries)) throw new TypeError("Timeline entries must be an array");
  const clips = [];
  let cursor = 0;
  let duration = 0;
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new TypeError("Invalid timeline entry");
    const { motion, at } = entry;
    if (!motion || typeof motion !== "object" || !motion.timing) throw new TypeError("Entry requires a motion");
    const { duration: d, iterations = 1, delay = 0, endDelay = 0 } = motion.timing;
    if (!Number.isFinite(d) || d < 0 || !(Number.isFinite(iterations) && iterations >= 0 || iterations === Infinity) ||
        !Number.isFinite(delay) || !Number.isFinite(endDelay)) throw new TypeError("Invalid motion timing");
    let start;
    if (at === undefined || at === "after") start = cursor;
    else if (at === "with-previous") start = clips.length ? clips[clips.length - 1].start : 0;
    else if (typeof at === "number" && Number.isFinite(at) && at >= 0) start = at;
    else throw new TypeError("Invalid timeline position");
    const span = Math.max(0, delay + (d === 0 ? 0 : d * iterations) + endDelay);
    const end = start + span;
    const clip = { id: entry.id ?? motion.id ?? String(index), start, end, motion };
    clips.push(clip);
    cursor = end;
    duration = Math.max(duration, end);
  }
  return { duration, clips };
}

export function sampleTimeline(timeline, time) {
  if (!timeline || !Array.isArray(timeline.clips)) throw new TypeError("Invalid timeline");
  if (typeof time !== "number" || !Number.isFinite(time)) throw new TypeError("Time must be finite");
  return timeline.clips.map(clip => ({
    id: clip.id,
    start: clip.start,
    end: clip.end,
    localTime: time - clip.start,
    active: time >= clip.start && time < clip.end
  }));
}
