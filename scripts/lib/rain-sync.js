// REAL-TIME RAIN lane: the rain row + its sound beds, called from weather-core's 2 s tick (no update() of its own).
// syncRain(ctx, amount, state): amount = weather-core's rain 0..1 (SKY lane's number). Writes only when a value moves.
import {animate} from 'builtin/tween';
import {earAudio,earMatches} from './data/hall-acoustics.js';
import { RAIN, rainBedGains, rainRoofGain, rainBurst, rainWind } from './data/home-weather-rain.js';
const q=(x,n=100)=>Math.round(x*n)/n;
const GLIDE=1.9;
export function syncRain(ctx,amount,s){
  const now=ctx.now(),rain=ctx.getObject(RAIN.rowId),base=amount;
  if(amount>0){const b=rainBurst(now,ctx.place.state.wind?.gust);amount=Math.max(.05,Math.min(1,Math.round(base*(1+RAIN.burst.depth*b)*20)/20));const bq=q(b,10);if(s.rainBurst!==bq)s.rainBurst=bq;const r=amount/base,T=s.burstTrace;if(!T||T.base!==q(base,20))s.burstTrace={base:q(base,20),lo:q(r),hi:q(r)};else if(r<T.lo)T.lo=q(r);else if(r>T.hi)T.hi=q(r);} // W16 bursts
  else if(s.rainBurst!==undefined)delete s.rainBurst;
  let wet=0;
  if(amount>0){wet=1;if(s.rainOffAt)s.rainOffAt=0;}
  else if(rain){if(!s.rainOffAt)s.rainOffAt=now;wet=q(Math.max(0,1-(now-s.rainOffAt)/RAIN.dripMs),20);}
  const gains=rainBedGains(amount);
  // A1 glide: each loop tweens to its new volume across the 2 s tick, so the sound swells and eases as smoothly as the drops;
  // a new loop fades in from 0, a finished one fades to 0 first and is removed on the next tick
  const vol=ctx.place.state.wxForce?.rainVol,vm=typeof vol==='number'?vol:1; // W22 slice 3: the owner's rain sound level; the drops stay as they fall
  const voice=(id,clip,g,at,extra,side)=>{
    if(vm!==1)g=q(Math.min(1,g*vm),200);
    let row=ctx.getObject(id);
    if(row&&!earMatches(row.audio)){ctx.destroy(id);delete s['rg:'+id];row=null;} // A2: an old plain-clip bed hands over to the hall ear

    if(g>0){
      if(!row){ctx.spawn(id,{tags:['weather','home-rain'],feetPosition:at,audience:'all',audio:earAudio(clip,side,{gain:0,loop:true,bus:'Ambience',...extra})});const r=ctx.getObject(id);if(r)animate(ctx,r,{'audio.gain':g},{duration:GLIDE,easing:'easeInOutSine'});}
      else if(row.audio&&row.audio.gain!==g&&s['rg:'+id]!==g)animate(ctx,row,{'audio.gain':g},{duration:GLIDE,easing:'easeInOutSine'});
      s['rg:'+id]=g;
    }else if(row){
      if(s['rg:'+id]){s['rg:'+id]=0;animate(ctx,row,{'audio.gain':0},{duration:GLIDE,easing:'easeInOutSine'});}
      else{ctx.destroy(id);delete s['rg:'+id];}
    }
  };
  RAIN.beds.forEach((b,i)=>voice(RAIN.rowId+'-bed-'+i,b.clip,gains[i],{x:0,y:24,z:0},{spatial:false},'out'));
  const rg=rainRoofGain(amount),R=RAIN.roof; // the drum on the hall roof, placed so the hall hears it and the yard barely does
  R.xs.forEach((x,i)=>voice(RAIN.rowId+'-roof-'+i,R.clip,rg,{x,y:R.y,z:R.z},{spatial:true,maxDistance:R.maxDistance},'in'));
  const D=RAIN.drip,dg=D?q(D.gain*(amount>0?.55+.45*amount:wet),200):0; // W7: drips ride the rain, then the wet fade after it
  if(D)D.at.forEach((p,i)=>voice(RAIN.rowId+'-drip-'+i,D.clip,dg>=.005?dg:0,{x:p.x,y:D.y,z:p.z},{spatial:true,maxDistance:D.maxDistance},'out'));
  if(!(amount>0)&&wet<=0){if(rain)ctx.destroy(rain.id);if(s.rainOffAt)s.rainOffAt=0;return;}
  const P={strength:amount,wet,...rainWind(ctx.place.state.wind)};
  if(!rain){ctx.spawn(RAIN.rowId,{tags:['weather','home-rain'],feetPosition:{x:0,y:24,z:0},audience:'all',fx:{script:RAIN.fx,params:P}});return;}
  if(rain.audio)rain.audio=null;                       // the old single bed hands over to the three beds
  const cur=rain.fx?.params||{};
  if(Object.keys(P).some((k)=>cur[k]!==P[k]))rain.fx.params={...cur,...P};
}
