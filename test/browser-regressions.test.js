import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleTiming, parseEasing } from '../src/index.js';

// Regression cases discovered by differential browser testing.
test('zero-duration fractional backwards fill starts at 0', () => {
  const t = { duration: 0, delay: 20, iterations: 0.5, fill: 'both' };
  assert.equal(sampleTiming(t, 0).progress, 0);
  assert.equal(sampleTiming(t, 1).progress, 0);
  assert.equal(sampleTiming(t, 20).progress, 0.5);
});

test('reverse zero-duration backwards fill starts at 1', () => {
  const t = { duration: 0, delay: 20, iterations: 1, fill: 'both', direction: 'reverse' };
  assert.equal(sampleTiming(t, 0).progress, 1);
  assert.equal(sampleTiming(t, 20).progress, 0);
});

test('negative endDelay retains current progress after endTime until active end', () => {
  const t = { duration: 100, iterations: 0.5, endDelay: -20, fill: 'both' };
  assert.equal(sampleTiming(t, 30).progress, 0.3);
  assert.equal(sampleTiming(t, 40).progress, 0.4);
  assert.equal(sampleTiming(t, 50).progress, 0.5);
  assert.equal(sampleTiming(t, 100).progress, 0.5);
});

test('none fill suppresses progress after early endTime', () => {
  const t = { duration: 100, iterations: 1, endDelay: -20, fill: 'none' };
  assert.equal(sampleTiming(t, 50).progress, 0.5);
  assert.equal(sampleTiming(t, 80).progress, null);
});

test('CSS jump-both easing uses the expected step thresholds', () => {
  const eased = parseEasing('steps(4, jump-both)');
  assert.equal(eased(0), 0.2);
  assert.equal(eased(0.5), 0.6);
  assert.equal(eased(1), 1);
});
