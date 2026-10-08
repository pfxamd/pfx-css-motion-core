import test from 'node:test';
import assert from 'node:assert/strict';
import { createMotion, validateMotion, compileCSS, normalizeKeyframes, sampleTiming,
  createTimeline, sampleTimeline, createPlayback, cubicBezier, interpolateValue } from '../src/index.js';

let seed = 0x8a34c901;
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; }
function integer(min, max) { return min + Math.floor(random() * (max - min + 1)); }

test('10000 random cubic-bezier samples stay finite and monotonic', () => {
  for (let scenario=0;scenario<100;scenario++) {
    const ease=cubicBezier(random(),random(),random(),random());
    let previous=-Infinity;
    for(let i=0;i<=100;i++) {
      const value=ease(i/100);
      assert(Number.isFinite(value));
      assert(value>=previous-1e-10);
      previous=value;
    }
    assert(Math.abs(previous-1)<1e-10);
  }
});
test('5000 randomized timing samples are bounded and deterministic', () => {
  for(let i=0;i<5000;i++) {
    const iterations=integer(0,5)+(random()<.2?.5:0);
    const duration=integer(0,2000);
    const direction=['normal','reverse','alternate','alternate-reverse'][integer(0,3)];
    const delay=integer(-1000,1000), endDelay=integer(-1000,1000);
    const t={duration,iterations,direction,delay,endDelay,fill:'both'};
    const at=integer(0,18000);
    const result=sampleTiming(t,at);
    assert.deepEqual(result,sampleTiming(t,at));
    assert(['before','active','after'].includes(result.phase));
    assert(result.progress>=0 && result.progress<=1);
    assert(Number.isFinite(result.progress));
  }
});
test('2000 randomized keyframe documents compile deterministically', () => {
  for(let i=0;i<2000;i++) {
    const frames=[];
    const count=integer(2,9);
    for(let j=0;j<count;j++) frames.push({opacity:random(),transform:'translateX('+integer(-1000,1000)+'px)'});
    const motion=createMotion({id:'stress-'+i,timing:{duration:integer(0,10000)},keyframes:frames});
    assert.equal(validateMotion(motion).valid,true);
    const normalized=normalizeKeyframes(motion.keyframes);
    assert.equal(normalized[0].offset,0);
    assert.equal(normalized.at(-1).offset,1);
    for(let j=1;j<count;j++) assert(normalized[j].offset>=normalized[j-1].offset);
    const css=compileCSS(motion).css;
    assert.equal(css,compileCSS(motion).css);
    assert(css.includes('animation-duration:'));
  }
});
test('2000 clip timeline remains stable and does not mutate inputs', () => {
  const entries=Array.from({length:2000},(_,i)=>({
    motion:createMotion({id:'clip-'+i,timing:{duration:1,fill:'both'}}),
    at:i%4===0 && i>0?'with-previous':'after'
  }));
  const timeline=createTimeline(entries);
  assert.equal(timeline.clips.length,2000);
  assert(Number.isFinite(timeline.duration));
  const samples=sampleTimeline(timeline,500);
  assert.equal(samples.length,2000);
  assert.equal(entries[0].motion.timing.duration,1);
  for(const item of samples) assert(Number.isFinite(item.localTime));
});
test('playback remains clamped over 25000 ticks', () => {
  const p=createPlayback(1000,{rate:1.1,loop:true});p.play(0);
  for(let i=1;i<=25000;i++) {
    const state=p.tick(i*10);
    assert(state.time>=0 && state.time<1000);
  }
  p.pause(250000);
  assert.equal(p.state.status,'paused');
});
test('5000 numeric interpolations remain finite and within bounds', () => {
  for(let i=0;i<5000;i++) {
    const a=integer(-1000000,1000000),b=integer(-1000000,1000000),p=random();
    const value=interpolateValue(a,b,p);
    assert(Number.isFinite(value));
    assert(value>=Math.min(a,b)-1e-7 && value<=Math.max(a,b)+1e-7);
  }
});
