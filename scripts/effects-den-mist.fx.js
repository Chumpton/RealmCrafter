// W18 drizzle haze, per screen: a few big faint grey puffs around the eye in light rain. Spawned audience:"local" by
// scripts/lib/sky-local-core.js only while this player stands OUTSIDE the hall (the W1 watch caught it filling the frame
// indoors and tripping the fx fill governor, which shrank the hearth fire too). params: strength, dx, dz, speed (the rain row's).
import {fx,pop,attr,range,curve,vec3,box,sprite} from 'builtin/fx';
import {hallRoofMask} from './lib/hearth-roof-mask.js';
import {RAIN} from './lib/data/home-weather-rain.js';
const L=RAIN.look;
export function effect(ctx){
  const P=ctx.params||{},num=(v,d)=>(typeof v==='number'&&isFinite(v)?v:d);
  const s=Math.max(0,Math.min(1,num(P.strength,0))),dx=num(P.dx,0),dz=num(P.dz,0),drift=Math.min(num(P.speed,0)*L.slant,L.slantMax);
  const low=ctx.quality==='low',mobile=!low&&ctx.device&&ctx.device!=='desktop';
  const t=Math.min(1,s/.35),dzl=1-t*t*(3-2*t);
  const outside=hallRoofMask(attr('p')).neg().add(1);
  if(!(s>0)||dzl<=.05)return fx({follow:'camera'});
  return fx({follow:'camera'},pop('drizzleMist',{
    count:low?3:mobile?5:9,spawn:{on:box({halfExtents:[22,3,22],lift:3})},wrap:[22,0,22],lifetime:range(10,16),
    init:{v:vec3(dx*drift*.5,0,dz*drift*.5),size:range(9,16)},size:attr('size').mul(curve([0,.7],[1,1.2])),
    color:vec3(.78,.82,.86),alpha:curve([0,0],[.3,1],[.7,1],[1,0]).mul(.07*dzl*Math.min(1,s/.08)).mul(outside),
    render:sprite({texture:'textures/smoke-puff',blend:'alpha',soft:low||mobile?0:2,lit:true})
  }));
}
