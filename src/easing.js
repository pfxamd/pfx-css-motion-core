// Pure easing functions: input and output are unit progress (overshoot is allowed).
const checkProgress = x => { if (!Number.isFinite(x)) throw new TypeError("Easing progress must be finite"); };
export function cubicBezier(x1, y1, x2, y2) {
  if (![x1,y1,x2,y2].every(Number.isFinite) || x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) throw new RangeError("Invalid bezier control points");
  const polynomial = (a,b,t) => ((1 - 3*b + 3*a)*t + (3*b - 6*a))*t*t + 3*a*t;
  const derivative = (a,b,t) => (3*(1 - 3*b + 3*a)*t + 2*(3*b - 6*a))*t + 3*a;
  return x => {
    checkProgress(x);
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo=0, hi=1, t=x;
    for(let i=0;i<8;i++){
      const dx=polynomial(x1,x2,t)-x;
      if(Math.abs(dx)<1e-7) break;
      const slope=derivative(x1,x2,t);
      if(Math.abs(slope)<1e-7) break;
      const next=t-dx/slope;
      if(next<0 || next>1) break;
      t=next;
    }
    // Bisection guarantees a result even for nearly-flat x curves.
    if (Math.abs(polynomial(x1,x2,t)-x) > 1e-7) {
      for(let i=0;i<36;i++){
        t=(lo+hi)/2;
        if(polynomial(x1,x2,t)<x) lo=t; else hi=t;
      }
    }
    return polynomial(y1,y2,t);
  };
}
export function steps(count, position="jump-end") {
  if (!Number.isSafeInteger(count) || count < 1 || !["jump-start","jump-end","jump-none","jump-both"].includes(position) || position==="jump-none" && count===1)
    throw new RangeError("Invalid steps parameters");
  return x => {
    checkProgress(x);
    if(x<=0) return position==="jump-start" || position==="jump-both" ? 1/(count+(position==="jump-both"?1:0)) : 0;
    if(x>=1) return 1;
    const jumps=count+(position==="jump-both"?1:position==="jump-none"?-1:0);
    const add=position==="jump-start" || position==="jump-both" ? 1 : 0;
    return Math.max(0,Math.min(1,(Math.floor(x*count)+add)/jumps));
  };
}
const NAMED = Object.freeze({
  linear: x=>{ checkProgress(x); return x; },
  ease: cubicBezier(.25,.1,.25,1),
  "ease-in": cubicBezier(.42,0,1,1),
  "ease-out": cubicBezier(0,0,.58,1),
  "ease-in-out": cubicBezier(.42,0,.58,1),
  "step-start": steps(1,"jump-start"),
  "step-end": steps(1,"jump-end")
});
export function parseEasing(value) {
  if(typeof value!=="string") throw new TypeError("Easing must be a string");
  const input=value.trim().toLowerCase();
  if(Object.hasOwn(NAMED,input)) return NAMED[input];
  const bezier=/^cubic-bezier\(\s*([-+\d.e]+)\s*,\s*([-+\d.e]+)\s*,\s*([-+\d.e]+)\s*,\s*([-+\d.e]+)\s*\)$/.exec(input);
  if(bezier) return cubicBezier(...bezier.slice(1).map(Number));
  const stepped=/^steps\(\s*(\d+)\s*(?:,\s*(jump-start|jump-end|jump-none|jump-both|start|end))?\s*\)$/.exec(input);
  if(stepped) return steps(Number(stepped[1]), stepped[2]==="start"?"jump-start":stepped[2]==="end"||!stepped[2]?"jump-end":stepped[2]);
  throw new SyntaxError("Unsupported CSS easing: "+value);
}
