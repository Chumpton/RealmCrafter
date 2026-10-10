// REAL-TIME RAIN lane (Living weather, 2026-09-28): the rain's look and sound, every tuned number here.
// Read by scripts/effects-den-rain.fx.js (client, the look) and scripts/lib/rain-sync.js (server, the row + beds).
// The SKY lane owns how MUCH it rains (weather-core -> strength) and the wind (place.state.wind); this file owns how it looks and sounds.
export const RAIN={
  rowId:'home-weather-rain', fx:'scripts/effects-den-rain.fx.js',
  windFallback:{toward:210,speed:3,gust:0,band:'light'},
  dripMs:40000,                 // eaves and doorways keep dripping this long after the rain stops, fading
  // three beds by intensity; `to` = the strength where the next bed takes over. Only ONE loop plays except inside
  // a fadeBand-wide window at each edge (rain ramps over ~60 s, so a crossfade lasts ~10 s)
  beds:[
    {clip:'/cdn/moodboard-lowpoly-cozy/sfx-sparse-light-rain-pitter-patter-on-leaves-loop.mp3',gain:.16,to:.16}, // A1: first drops
    {clip:'/cdn/moodboard-lowpoly-cozy/sfx-light-drizzle-on-thatch-loop.mp3',gain:.24,to:.36},
    {clip:'/cdn/moodboard-lowpoly-cozy/sfx-rain-falling-on-leaves-and-distant-roof-loop.mp3',gain:.34,to:.74},
    {clip:'/cdn/moodboard-lowpoly-cozy/sfx-heavy-downpour-on-longhouse-roof-loop.mp3',gain:.55,to:9}
  ],
  fadeBand:.1,
  // A1 (2026-09-29): the roof drum: two spatial loops up under the hall ridge, heard in the hall and faintly just outside
  // W7 (2026-09-29): eaves drip at each doorway: spatial loops just outside the door, strongest in rain, fading over dripMs after
  drip:{clip:'/cdn/moodboard-lowpoly-cozy/sfx-rain-dripping-off-wooden-eaves-into-wet-ground-loop.mp3',gain:.14,maxDistance:8,y:25.2,at:[{x:3.4,z:-4.1},{x:16.6,z:7.1},{x:8.0,z:7.1}]},
  roof:{clip:'/cdn/moodboard-lowpoly-cozy/sfx-rain-drumming-on-wooden-roof-from-inside-loop.mp3',gain:.32,y:30.5,z:1.5,xs:[4,16],maxDistance:12,floor:.25},
  // W16 rain in bursts: the fx + beds ride amount*(1+depth*b), b in -1..1 from the live wind gust plus two slow
  // shower-cell waves, so a phase gusts heavier and eases into lulls instead of holding one flat level.
  // weather-core's published rain stays the phase's base number; only the look and sound breathe.
  burst:{depth:.3, gustPull:1.2, gustMid:.35, cellA:{w:.55,ms:47000}, cellB:{w:.3,ms:13500}},
  look:{
    counts:{low:2200,mobile:3600,high:7500,ultra:13000},  // drops at strength 1; drizzle keeps ~25 %
    slant:.55, slantMax:11,     // horizontal drift = min(wind speed * slant, slantMax) m/s along the wind
    rippleFrom:.4,              // lake + trough rings above this strength
    lakeY:.04,                  // valleyLake sea level 0 (+4 cm)
    ring:'<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="none" stroke="white" stroke-width="4"/></svg>',
    trough:{x:26.2,y:23.566,z:-1.4,hx:.16,hz:.78},
    // W6 yard puddles: flat pad spots measured on the yard (terrain 23.55, slope < 5 mm over 0.8 m, nothing standing there)
    puddles:[{x:1,z:-6,r:1.1},{x:7,z:-5,r:.8},{x:13,z:-5.5,r:1.3},{x:21,z:-6,r:.9}],
    puddleY:23.562,             // pad 23.55 + 1.2 cm
    puddleWet:[.08,.63],        // wet at which a puddle starts / is full (fills in rain, shrinks as the yard dries)
    puddleRingFrom:.08,         // rings in puddles from light drizzle up       // yard-quench-trough water child (feet 23.452 + .11)
    eave:{x0:-3.3,x1:23.3,zS:-3.95,zN:6.95,y:26.62,fall:3.05}, // hall outer x -3..23 z -3.5..6.5, eave 2.6 m over floor 24.02
    doors:{a:{x:3.4,z:-3.85},b:{x:16.6,z:6.85},y:26.2,fall:2.65} // hall-door-main (hinge 2.78,-3.52) / hall-door-back (17.17,6.52), lintel 2.04 + trim
  }
};
import { clamp01 as clamp } from 'builtin/math';
// equal-power gains for the three beds at strength s (0 = silent)
// W23 R0 (creator 2026-09-29 'i still cant hear the rain'): beds were .07-.15 (a downpour at .15); now .16-.55, lift .7+.3s
// A1: any number of beds; each hands over to the next at its `to`, equal-power. lift makes the whole thing swell with strength
export function rainBedGains(s){
  const B=RAIN.beds;if(!(s>0))return B.map(()=>0);
  const f=RAIN.fadeBand,h=Math.PI/2,lift=.7+.3*s;let carry=1;const w=[];
  for(let i=0;i<B.length;i++){const t=i<B.length-1?clamp((s-(B[i].to-f/2))/f):0;w.push(carry*Math.cos(t*h));carry*=Math.sin(t*h);}
  return w.map((v,i)=>{const g=Math.round(v*B[i].gain*lift*200)/200;return g>=.005?g:0;});
}
// A1: roof drum gain at strength s (heavier rain drums harder)
export function rainRoofGain(s){if(!(s>0))return 0;const R=RAIN.roof,g=Math.round(R.gain*(R.floor+(1-R.floor)*s)*200)/200;return g>=.005?g:0;}
// W16: the burst factor b (-1..1) at time now for a gust 0..1
export function rainBurst(now,gust){
  const B=RAIN.burst,g=typeof gust==='number'?gust:0;
  const b=B.cellA.w*Math.sin(now/B.cellA.ms*2*Math.PI)+B.cellB.w*Math.sin(now/B.cellB.ms*2*Math.PI+1.7)+B.gustPull*(g-B.gustMid);
  return Math.max(-1,Math.min(1,b));
}
// place.state.wind -> the fx's dx, dz (unit, toward) and speed (m/s incl. gust), rounded so the row moves only when the wind does
export function rainWind(w){
  const W=w&&typeof w.toward==='number'?w:RAIN.windFallback,y=W.toward*Math.PI/180;
  return {dx:Math.round(-Math.sin(y)*10)/10,dz:Math.round(-Math.cos(y)*10)/10,speed:Math.round((W.speed||0)*(1+.4*(W.gust||0)))};
}
