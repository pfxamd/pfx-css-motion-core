import test from 'node:test';
import assert from 'node:assert/strict';
import { createMotion, createTimeline, sampleTiming, createPlayback, normalizeKeyframes, interpolateValue, parseEasing, cubicBezier, compileCSS, CSSCompileError, validateMotion } from '../src/index.js';
const motion = (id, duration, opts={}) => createMotion({id,timing:{duration,...opts}});

test('exact interior iteration boundary starts the next iteration', () => {
  const t={duration:100,iterations:3,fill:'both'};
  assert.equal(sampleTiming(t,99.9).currentIteration,0);
  assert.deepEqual([sampleTiming(t,100).progress,sampleTiming(t,100).currentIteration],[0,1]);
  assert.deepEqual([sampleTiming(t,200).progress,sampleTiming(t,200).currentIteration],[0,2]);
  assert.deepEqual([sampleTiming(t,300).progress,sampleTiming(t,300).currentIteration],[1,2]);
});
test('alternating direction respects exact iteration boundaries', () => {
  const t={duration:100,iterations:3,fill:'both',direction:'alternate'};
  assert.equal(sampleTiming(t,100).progress,1);
  assert.equal(sampleTiming(t,200).progress,0);
});
test('negative endDelay truncates the active interval', () => {
  const t={duration:1000,iterations:1,delay:0,endDelay:-400,fill:'both'};
  assert.equal(sampleTiming(t,599).phase,'active');
  assert.equal(sampleTiming(t,600).phase,'after');
  assert.equal(sampleTiming(t,600).progress,.6);
});
test('nonfinite timestamps cannot return corrupt iteration state', () => {
  const t={duration:100,iterations:Infinity,fill:'both'};
  assert.throws(()=>sampleTiming(t,Infinity),TypeError);
  assert.throws(()=>sampleTiming(t,-Infinity),TypeError);
});
test('nondecreasing playback clock is enforced while running', () => {
  const p=createPlayback(100);p.play(100);p.tick(120);
  assert.throws(()=>p.tick(110),RangeError);
  assert.equal(p.state.time,20);
  assert.equal(p.tick(130).time,30);
});
test('timeline sequential follow-on starts after longest overlapping clip', () => {
  const tl=createTimeline([{motion:motion('a',100)},{motion:motion('b',20),at:'with-previous'},{motion:motion('c',40)}]);
  assert.deepEqual(tl.clips.map(x=>x.start),[0,0,100]);
  assert.equal(tl.duration,140);
});
test('timeline cannot schedule after infinite clip', () => {
  assert.throws(()=>createTimeline([{motion:motion('infinite',100,{iterations:Infinity})},{motion:motion('following',100)}]),RangeError);
});
test('numeric interpolation preserves small CSS values', () => {
  assert.equal(interpolateValue('0px','0.000000000002px',.5),'0.000000000001px');
});
test('numeric interpolation avoids overflow when valid midpoint exists', () => {
  assert.equal(interpolateValue(-1e308,1e308,.5),0);
});
test('validate and normalize reject sparse keyframe arrays', () => {
  const frames=new Array(3);frames[0]={opacity:0};frames[2]={opacity:1};
  assert.equal(validateMotion(createMotion({keyframes:frames})).valid,false);
  assert.throws(()=>normalizeKeyframes(frames),TypeError);
});
test('easing requires finite progress', () => {
  assert.throws(()=>cubicBezier(.25,.1,.25,1)(NaN),TypeError);
  assert.throws(()=>parseEasing('linear')(Infinity),TypeError);
});
test('CSS compiler continues to reject unsupported endDelay', () => {
  assert.throws(()=>compileCSS(motion('x',100,{endDelay:1})),CSSCompileError);
});
