import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleTiming } from '../src/index.js';

// Web Animations 1, §§ 4.8.3.1–4.8.4:
// https://www.w3.org/TR/web-animations-1/#calculating-the-simple-iteration-progress
test('forwards fill retains 1 at and after exact end of one iteration', () => {
  const timing={duration:100,iterations:1,fill:'both'};
  for(const time of [100,100.001,101,1000]) {
    const actual=sampleTiming(timing,time);
    assert.equal(actual.progress,1);
    assert.equal(actual.currentIteration,0);
  }
});
test('integer multi-iteration fill holds last iteration end, not start of next', () => {
  const timing={duration:100,iterations:3,fill:'both'};
  for(const time of [300,320,400,800,2400]) {
    assert.equal(sampleTiming(timing,time).progress,1);
    assert.equal(sampleTiming(timing,time).currentIteration,2);
  }
});
test('alternate direction holds endpoint of final iteration', () => {
  const t={duration:100,iterations:2,fill:'both',direction:'alternate'};
  assert.equal(sampleTiming(t,200).progress,0);
  assert.equal(sampleTiming({...t,iterations:3},300).progress,1);
  assert.equal(sampleTiming({...t,direction:'alternate-reverse'},200).progress,1);
});
test('after fill none does not falsely hold an endpoint', () => {
  const t={duration:100,iterations:3,fill:'none'};
  assert.equal(sampleTiming(t,400).progress,null);
  assert.equal(sampleTiming({...t,fill:'backwards'},400).progress,null);
});
test('negative endDelay clamps after-fill active time to duration', () => {
  const t={duration:100,iterations:3,delay:20,endDelay:-10,fill:'forwards'};
  assert.ok(Math.abs(sampleTiming(t,310).progress-.9)<1e-10);
  assert.equal(sampleTiming(t,320).progress,1);
  assert.equal(sampleTiming(t,1000).progress,1);
});
test('non-integer final iteration retains fractional progress', () => {
  const t={duration:100,iterations:2.5,fill:'forwards'};
  assert.equal(sampleTiming(t,250).progress,.5);
  assert.equal(sampleTiming(t,999).progress,.5);
});
