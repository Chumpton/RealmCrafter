// REAL-TIME RAIN (Living weather). params: strength 0..1 (SKY lane), wet 0..1 (drip tail), dx/dz (unit vector the wind
// blows toward) + speed m/s. dx=dz=0 falls straight as before. Numbers: scripts/lib/data/home-weather-rain.js.
import {fx,pop,attr,range,curve,vec3,box,disc,wind,sphereDir,sprite,when,up,gravity,drag,floorHeight} from 'builtin/fx';
import {hallRoofMask} from './lib/hearth-roof-mask.js';
import {RAIN} from './lib/data/home-weather-rain.js';
const L=RAIN.look;
export function effect(ctx){
  const P=ctx.params||{},num=(v,d)=>(typeof v==='number'&&isFinite(v)?v:d);
  const s=Math.max(0,Math.min(1,num(P.strength,1))),wet=Math.max(0,Math.min(1,num(P.wet,s>0?1:0)));
  const dx=num(P.dx,0),dz=num(P.dz,0),drift=Math.min(num(P.speed,0)*L.slant,L.slantMax);
  const low=ctx.quality==='low',mobile=!low&&ctx.device&&ctx.device!=='desktop';
  const C=L.counts,base=low?C.low:mobile?C.mobile:ctx.quality==='ultra'?C.ultra:C.high;
  const outside=hallRoofMask(attr('p')).neg().add(1);
  const pops=[];
  if(s>0){
    // W18: drizzle (s < ~.35) is fine, slow and floaty; a downpour (s > ~.7) is fat, fast, long streaks
    const dzl=1-Math.min(1,s/.35)**2*(3-2*Math.min(1,s/.35)),pour=Math.max(0,(s-.6)/.4);
    const fall=3.2+5*s+4*pour-1*dzl,life=19/fall,drift2=drift*(1+1.6*dzl);
    const drops=pop('drops',{
      count:Math.max(60,Math.round(base*(.25+.75*s))),spawn:{on:box({halfExtents:[32,1,32],lift:15})},wrap:[32,0,32],
      lifetime:range(life*.9,life*1.1),
      init:{v:vec3(dx*drift2,-fall,dz*drift2).add(wind().mul(.15+.25*dzl)).add(sphereDir().mul(.12+.1*s+.35*dzl)),size:range(.004+.008*s+.008*pour,.007+.014*s+.012*pour)},
      size:attr('size'),floor:'die',collide:'die',color:vec3(.76,.83,.9),
      alpha:curve([0,0],[.1,1],[.85,1],[1,0]).mul(.26+.34*s+.12*pour).mul(outside),
      render:sprite({texture:'textures/droplet',blend:'alpha',align:'velocity',stretch:.004+.03*s*s+.03*pour,soft:.08,lit:true})
    });
    const splashes=pop('splashes',{
      spawn:when(drops.dies,(.05+.15*s)*(low?.6:1)),lifetime:range(.14,.26),
      init:{v:up(.45+.6*s).add(sphereDir().mul(.25+.25*s)),size:range(.012,.022).mul(.7+.7*s)},
      accel:gravity().mul(.45).add(drag(3)),floor:'die',collide:'die',size:attr('size').mul(curve([0,.5],[1,1.6])),
      color:vec3(.7,.78,.84),alpha:curve([0,.3],[1,0]).mul(.5+.5*s).mul(outside),
      render:sprite({texture:'textures/soft-disc',blend:'alpha',soft:.03,lit:true})
    });
    pops.push(drops,splashes);
    // W18 drizzle haze moved to scripts/effects-den-mist.fx.js: drawn per screen by sky-local-core only while that player is outdoors (W1 watch: it filled the frame indoors)
    if(s>L.rippleFrom){
      const r=(s-L.rippleFrom)/(1-L.rippleFrom);
      // lake rings: born anywhere around the eye, pinned flat at the waterline, drawn only where the ground is under water
      pops.push(pop('lakeRings',{
        spawn:{rate:r*(low?30:mobile?50:150),on:box({halfExtents:[60,0,60]})},lifetime:range(.7,1.2),
        init:{size:range(.35,.8)},pos:attr('p').mul(vec3(1,0,1)).add(vec3(0,L.lakeY,0)),
        size:attr('size').mul(curve([0,.15],[1,1])),color:vec3(.86,.93,.95),
        alpha:curve([0,.55],[1,0]).mul(floorHeight().neg().step(.05)),
        render:sprite({texture:L.ring,blend:'alpha',align:'ground',lit:true})
      }));
      const T=L.trough;
      pops.push(pop('troughRings',{
        spawn:{rate:r*(low?5:10)},lifetime:range(.45,.75),
        init:{ox:range(-T.hx,T.hx),oz:range(-T.hz,T.hz),size:range(.05,.1)},
        pos:vec3(1,0,0).mul(attr('ox')).add(vec3(0,0,1).mul(attr('oz'))).add(vec3(T.x,T.y,T.z)),
        size:attr('size').mul(curve([0,.2],[1,1.5])),color:vec3(.88,.94,.96),alpha:curve([0,.6],[1,0]),
        render:sprite({texture:L.ring,blend:'alpha',align:'ground',lit:true})
      }));
    }
  }
  // drips off the eaves and the two doorways: while it rains and ~40 s after (wet fades them)
  const E=L.eave,D=L.doors,g=4.9,fallY=(y0)=>vec3(0,1,0).mul(attr('age').mul(attr('age')).mul(-g).add(y0));
  const eaveDrips=pop('eaveDrips',{
    spawn:{rate:wet*(low?12:mobile?20:44)},lifetime:range(Math.sqrt(E.fall/g)*.97,Math.sqrt(E.fall/g)),
    init:{ex:range(E.x0,E.x1),ez:range(0,1).add(-.5).step(0).mul(E.zN-E.zS).add(E.zS),size:range(.012,.02)},
    pos:vec3(1,0,0).mul(attr('ex')).add(vec3(0,0,1).mul(attr('ez'))).add(fallY(E.y)),
    vel:vec3(0,-2*g,0).mul(attr('age')),
    size:attr('size'),color:vec3(.72,.8,.86),alpha:curve([0,0],[.08,.75],[1,.75]),
    render:sprite({texture:'textures/droplet',blend:'alpha',align:'velocity',stretch:.02,lit:true})
  });
  const doorDrips=pop('doorDrips',{
    spawn:{rate:wet*(low?4:8)},lifetime:range(Math.sqrt(D.fall/g)*.97,Math.sqrt(D.fall/g)),
    init:{dk:range(0,1).add(-.5).step(0),dj:range(-.55,.55),size:range(.014,.022)},
    pos:vec3(1,0,0).mul(attr('dk').mul(D.b.x-D.a.x).add(D.a.x).add(attr('dj'))).add(vec3(0,0,1).mul(attr('dk').mul(D.b.z-D.a.z).add(D.a.z))).add(fallY(D.y)),
    vel:vec3(0,-2*g,0).mul(attr('age')),
    size:attr('size'),color:vec3(.72,.8,.86),alpha:curve([0,0],[.08,.8],[1,.8]),
    render:sprite({texture:'textures/droplet',blend:'alpha',align:'velocity',stretch:.02,lit:true})
  });
  const dripSplash=pop('dripSplash',{
    spawn:when(eaveDrips.dies,{count:3,probability:.6}),lifetime:range(.15,.28),
    init:{v:up(.7).add(sphereDir().mul(.4)),size:range(.01,.018)},accel:gravity().mul(.45).add(drag(3)),
    size:attr('size'),color:vec3(.72,.8,.86),alpha:curve([0,.45],[1,0]),
    render:sprite({texture:'textures/soft-disc',blend:'alpha',soft:.03,lit:true})
  });
  pops.push(eaveDrips,doorDrips,dripSplash);
  return fx({follow:'camera'},...pops);
}
