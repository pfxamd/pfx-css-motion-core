import test from 'node:test';
import assert from 'node:assert/strict';
import { createMotion, toBrowserKeyframes, toBrowserTiming, createBrowserAnimation, createBrowserTimeline } from '../src/index.js';

function make(id='fade',duration=100,opts={}) {
  return createMotion({
    id,timing:{duration,fill:'both',...opts},
    keyframes:[{opacity:0},{opacity:1}]
  });
}
function target({throws=false}={}) {
  const recordings=[];
  const element={
    recordings,
    animate(frames,timing){
      if(throws) throw new Error('Native animation rejected');
      let currentTime=0,playbackRate=1,playState='running';
      const native={
        frames,timing,
        get currentTime(){return currentTime;},
        set currentTime(value){currentTime=value;},
        get playbackRate(){return playbackRate;},
        set playbackRate(value){playbackRate=value;},
        get playState(){return playState;},
        get finished(){return Promise.resolve(native);},
        play(){playState='running';},
        pause(){playState='paused';},
        reverse(){playbackRate=-playbackRate;playState='running';},
        finish(){playState='finished';},
        cancel(){playState='idle';native.cancelCount=(native.cancelCount??0)+1;}
      };
      recordings.push(native);
      return native;
    }
  };
  return element;
}

test('browser conversion is pure and normalizes omitted keyframe offsets',()=>{
  const m=createMotion({id:'implicit',keyframes:[{opacity:0},{opacity:.5},{opacity:1}]});
  const before=JSON.stringify(m);
  const frames=toBrowserKeyframes(m);
  assert.deepEqual(frames.map(f=>f.offset),[0,.5,1]);
  assert.equal(JSON.stringify(m),before);
  assert.notEqual(frames[0],m.keyframes[0]);
});
test('browser conversion preserves full timing including endDelay and infinity',()=>{
  const m=make('timing',300,{delay:-30,endDelay:40,iterations:Infinity,direction:'alternate',easing:'steps(4, end)'});
  assert.deepEqual(toBrowserTiming(m,{startOffset:100}),{
    duration:300,delay:70,endDelay:40,iterations:Infinity,
    direction:'alternate',fill:'both',easing:'steps(4, end)'
  });
});
test('browser import requires neither window nor document',()=>{
  assert.equal(typeof toBrowserKeyframes,'function');
  assert.equal(typeof createBrowserTimeline,'function');
});
test('rejects empty or property-less keyframes, invalid easing, and options',()=>{
  assert.throws(()=>toBrowserKeyframes(make('bad',100).constructor),TypeError);
  assert.throws(()=>toBrowserKeyframes(createMotion({keyframes:[]})),RangeError);
  assert.throws(()=>toBrowserKeyframes(createMotion({keyframes:[{offset:0},{offset:1}]})),TypeError);
  assert.throws(()=>toBrowserKeyframes(createMotion({keyframes:[{opacity:0,easing:'bad()'},{opacity:1}]})),TypeError);
  assert.throws(()=>toBrowserTiming(make('a',100,{easing:'bad()'})),TypeError);
  assert.throws(()=>toBrowserTiming(make(),{startOffset:-1}),RangeError);
  assert.throws(()=>createBrowserAnimation(null,make()),TypeError);
  assert.throws(()=>createBrowserAnimation(target(),make(),null),TypeError);
  assert.throws(()=>createBrowserAnimation(target(),make(),{autoplay:'yes'}),TypeError);
});
test('browser controller pauses by default and exposes native animation',()=>{
  const node=target();
  const control=createBrowserAnimation(node,make());
  assert.equal(control.state.playState,'paused');
  assert.equal(control.animation,node.recordings[0]);
  assert.equal(control.animation.timing.fill,'both');
  assert.equal(control.animation.timing.delay,0);
  assert.deepEqual(control.animation.frames.map(f=>f.offset),[0,1]);
  assert.equal(Object.isFrozen(control),true);
});
test('browser controller uses native time and rate without secondary clocks',()=>{
  const control=createBrowserAnimation(target(),make());
  assert.equal(control.seek(60).currentTime,60);
  assert.equal(control.setRate(2).playbackRate,2);
  assert.equal(control.play().playState,'running');
  assert.equal(control.pause().playState,'paused');
  assert.equal(control.reverse().playbackRate,-2);
  assert.equal(control.finish().playState,'finished');
  assert.equal(control.cancel().playState,'idle');
});
test('browser controller cleanup is idempotent and prevents future actions',()=>{
  const node=target();
  const control=createBrowserAnimation(node,make(),{autoplay:true});
  assert.equal(control.state.playState,'running');
  assert.equal(control.dispose().disposed,true);
  assert.equal(control.dispose().playState,'disposed');
  assert.equal(node.recordings[0].cancelCount,1);
  assert.throws(()=>control.play(),/disposed/);
  assert.throws(()=>control.seek(0),/disposed/);
});
test('browser adapter validates seek/rate without mutating native animation',()=>{
  const control=createBrowserAnimation(target(),make());
  assert.throws(()=>control.seek(NaN),RangeError);
  assert.throws(()=>control.seek(Infinity),RangeError);
  assert.throws(()=>control.setRate(0),RangeError);
  assert.throws(()=>control.setRate(Infinity),RangeError);
  assert.equal(control.state.currentTime,0);
  assert.equal(control.state.playbackRate,1);
});
test('browser timeline schedules after overlap and synchronizes global seeking',()=>{
  const one=target(),two=target(),three=target();
  const m1=make('one',100);
  const m2=make('two',40,{delay:10});
  const m3=make('three',30);
  const group=createBrowserTimeline([
    {element:one,motion:m1},
    {element:two,motion:m2,at:'with-previous'},
    {element:three,motion:m3}
  ]);
  assert.equal(group.state.duration,130);
  assert.deepEqual(group.clips.map(c=>c.start),[0,0,100]);
  assert.deepEqual([one.recordings[0].timing.delay,two.recordings[0].timing.delay,three.recordings[0].timing.delay],[0,10,100]);
  assert.equal(group.seek(110).currentTime,110);
  assert.deepEqual(group.animations.map(a=>a.currentTime),[110,110,110]);
  assert.equal(group.setRate(2).playbackRate,2);
  assert.deepEqual(group.animations.map(a=>a.playbackRate),[2,2,2]);
  group.dispose();
  assert.deepEqual(group.animations.map(a=>a.cancelCount),[1,1,1]);
});
test('browser timeline rejects invalid input without creating effects',()=>{
  const one=target();
  assert.throws(()=>createBrowserTimeline([]),TypeError);
  assert.throws(()=>createBrowserTimeline([{element:one,motion:make()},{element:null,motion:make('two')}]),TypeError);
  assert.equal(one.recordings.length,0);
});
test('browser timeline rolls back when native construction fails',()=>{
  const one=target(),two=target({throws:true});
  assert.throws(()=>createBrowserTimeline([{element:one,motion:make()},{element:two,motion:make('two')}]),/Native animation rejected/);
  assert.equal(one.recordings[0].cancelCount,1);
});
test('browser timeline reverse starts from total end when at zero',()=>{
  const one=target(),two=target();
  const group=createBrowserTimeline([{element:one,motion:make('a',100)},{element:two,motion:make('b',100)}]);
  const status=group.reverse();
  assert.equal(status.currentTime,200);
  assert.equal(status.playbackRate,-1);
  assert.deepEqual(group.animations.map(a=>a.currentTime),[200,200]);
  assert.deepEqual(group.animations.map(a=>a.playState),['running','running']);
  assert.equal(group.dispose().playState,'disposed');
  assert.throws(()=>group.play(),/disposed/);
});
