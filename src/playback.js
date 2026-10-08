// Deterministic playback state machine. Inject timestamps; no timers or DOM.
export function createPlayback(duration, { rate = 1, loop = false } = {}) {
  if (!(Number.isFinite(duration) && duration >= 0)) throw new RangeError("duration must be nonnegative and finite");
  if (!Number.isFinite(rate) || rate === 0) throw new RangeError("rate must be finite and nonzero");
  if (typeof loop !== "boolean") throw new TypeError("loop must be boolean");
  let time = rate < 0 ? duration : 0;
  let status = "idle";
  let anchor = null;
  const normalize = value => loop && duration > 0 ? ((value % duration) + duration) % duration : Math.max(0, Math.min(duration, value));
  function update(now) {
    if (!Number.isFinite(now)) throw new TypeError("now must be finite");
    if (status === "running") {
      if (now < anchor) throw new RangeError("Clock must advance monotonically");
      const next = normalize(time + (now - anchor) * rate);
      time = next;
      anchor = now;
      if (!loop && (rate >= 0 && time >= duration || rate < 0 && time <= 0)) {
        status = "finished";
        anchor = null;
      }
    }
    return snapshot();
  }
  function snapshot() { return Object.freeze({time, status, rate, loop, duration}); }
  return Object.freeze({
    get state() { return snapshot(); },
    play(now) {
      if (!Number.isFinite(now)) throw new TypeError("now must be finite");
      if (status === "running") return update(now);
      if (status === "finished") time = rate < 0 ? duration : 0;
      status = "running";
      anchor = now;
      return update(now);
    },
    pause(now) {
      update(now);
      if (status === "running") status = "paused";
      anchor = null;
      return snapshot();
    },
    seek(position, now) {
      if (!Number.isFinite(position) || !Number.isFinite(now)) throw new TypeError("seek position and now must be finite");
      time = normalize(position);
      if (status === "finished") status = "paused";
      if (status === "running") anchor = now;
      return snapshot();
    },
    reverse(now) {
      update(now);
      rate = -rate;
      if (status === "finished") status = "paused";
      if (status === "running") anchor = now;
      return snapshot();
    },
    setRate(value, now) {
      if (!Number.isFinite(value) || value === 0) throw new RangeError("rate must be finite and nonzero");
      update(now);
      rate = value;
      if (status === "finished") status = "paused";
      if (status === "running") anchor = now;
      return snapshot();
    },
    tick: update,
    reset() {
      time = rate < 0 ? duration : 0;
      status = "idle";
      anchor = null;
      return snapshot();
    }
  });
}
