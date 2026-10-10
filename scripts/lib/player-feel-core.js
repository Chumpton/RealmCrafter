// home-player-feel's body — scripts/home-player-feel.js (on the player template) loads this by import() on first need, so it
// and home-interaction stay out of the arrival set. E presses, seats (sit/stand, skål cue) and footsteps.
import { FEEL } from './data/home-feel.js';
import { KSFX, pick as kpick } from './data/kenney-sfx.js';
import { animate } from 'builtin/tween';
import { aimedInteractable, aimForward, aimScore, aimAngle } from './home-interaction.js';
import { HALL_BOX } from './data/sky-local.js';
import { sitPointsOf } from './den-seats.js';
import { DEFAULTS as SEAT_DEFAULTS } from './data/den-furniture-defaults.js';
import { skalNear } from '../feast-bite.js';
import { boardAimed } from '../board-input.js';
// BOARD-CLICK W7: aimed at a board, left click is board-input.js's and E does nothing here (the board's own press is retired)
function onBoard(ctx,me,input){if(me.state.aim?.k==='board'||ctx.session.boardIn?.[me.id]?.on)return true;return !!(input?.pressed?.use||input?.pressed?.interact)&&!!boardAimed(ctx,me,input);}
function scratch(ctx) { const s=(ctx.session.homeWalk??={}); return s[ctx.self.id]??=( {distance:0,last:null} ); }
function inside(p,poly) { let hit=false; for(let i=0,j=poly.length-1;i<poly.length;j=i++) { const a=poly[i],b=poly[j]; if((a[1]>p.z)!==(b[1]>p.z) && p.x<(b[0]-a[0])*(p.z-a[1])/(b[1]-a[1])+a[0]) hit=!hit; } return hit; }
function floorKind(ctx,p) {
  const B=HALL_BOX;
  if(p.y>23.85&&p.y<24.4&&p.x>B.x0&&p.x<B.x1&&p.z>B.z0&&p.z<B.z1) return 'wood'; // the longhouse floor
  const ground=ctx.place.terrain.materialAt(p.x,p.z);
  const name=typeof ground==='string'?ground:(ground?.id || ground?.dominant || 'grass');
  if(p.y>ground_y(ctx,p)+0.2) return 'wood'; // standing on something built: the jetty, a deck, a step
  return /snow|ice|frost/.test(name)?'snow':['gravel','chalkrock','shoreline','cobble','cobblestone','stone','road','rock'].some(k=>name.includes(k))?'stone':'grass';
}
function ground_y(ctx,p){return ctx.place.terrain.heightAt(p.x,p.z)??-1e9;}
// A seat of the furniture family (sitPointsOf) within reach is sat on; E or jump stands again in front of it. The body is its own
// writer: its parent becomes the seat and its feet the seat's point, and humanoid-locomotion holds the sit pose while it rides.
// a handle's rotation reads WORLD (a quaternion on most rows, never a .yaw field — the old parent walk read 0 there, so the south
// bench, turned 180°, put its seat points on the far side of the hall and E found nothing)
function worldYaw(ctx,o){const h=ctx.getObject(o.id)||o,r=h.rotation;
  if(typeof r==='number')return r*Math.PI/180;
  if(r&&typeof r.w==='number')return Math.atan2(2*(r.x*r.z+r.w*r.y),1-2*(r.x*r.x+r.y*r.y));
  if(r&&typeof r.yaw==='number')return r.yaw*Math.PI/180;
  let y=0,cur=o;for(let i=0;cur&&i<6;i++){y+=Number(cur.yaw)||0;const up=cur.parent;cur=up?ctx.getObject(typeof up==='string'?up:up.id):null;}return (y*Math.PI)/180;}
function seatScratch(ctx){const s=(ctx.session.homeSeat??={});return s[ctx.self.id]??=({at:0});}
const sameSpot=(a,b)=>a&&b&&Math.abs(a.x-b.x)<.05&&Math.abs((a.z??0)-(b.z??0))<.05;
function taken(ctx,me,o,pt){return ctx.place.players.some(q=>q.id!==me.id&&q.state?.seatedOn===o.id&&sameSpot(q.state.seatPoint,pt));}
// the free seat point you are looking at, inside a short reach
function aimedSeat(ctx,me,input){
  const p=me.worldFeetPosition||me.feetPosition,fwd=aimForward(input),flat={x:fwd.x,z:fwd.z},O=FEEL.seatOccupants;let best=null,full=false;
  const folk=ctx.query({anyTags:O.tags,radius:FEEL.seatReachFar+2,center:p}).map(r=>r.feetPosition).filter(Boolean);
  for(const o of ctx.query({tags:['den-furniture'],radius:FEEL.seatReachFar+9,center:p})){
    const points=sitPointsOf(o.primitive?.params??o.state?.seatParams,o.state);if(!points.length)continue;
    const q=o.worldFeetPosition||o.feetPosition,y=worldYaw(ctx,o),c=Math.cos(y),s=Math.sin(y);
    for(const pt of points){
      const w={x:q.x+pt.x*c+pt.z*s,z:q.z-pt.x*s+pt.z*c,y:q.y+Math.max(.35,pt.y??0)};
      const score=aimScore(p,flat,w,FEEL.seatReach,FEEL.seatCone,0.25)??aimScore(p,fwd,w,FEEL.seatReachFar,FEEL.seatConeFar,0.25)??aimScore(p,flat,w,FEEL.seatFallback.reach,FEEL.seatFallback.cone,0.25); // near: a loose aim by your heading (a seat top at your knees sits ~60° under a level gaze — the 3-D ray used to miss it standing right at the bench); across a table: a dead-on ray
      if(score===null)continue;
      if(folk.some(f=>Math.hypot(f.x-w.x,f.z-w.z)<O.radius&&f.y>q.y-O.below&&f.y<q.y+O.above))continue; // Ulf's, Freydis's, the chess pair's: not a seat
      if(taken(ctx,me,o,pt)){full=true;continue;}
      if(!best||score<best.score){const pr=o.primitive?.params||o.state?.seatParams||{},top=pr.seat??SEAT_DEFAULTS[pr.item]?.seat??.45;best={o,pt,score,ang:Math.min(aimAngle(p,fwd,w),aimAngle(p,flat,w)),d:Math.hypot(w.x-p.x,w.z-p.z),w:{x:w.x,y:q.y+top,z:w.z}};}
    }
  }
  return best||(full?{full:true}:null);
}
function standUp(ctx){
  const me=ctx.self,seat=ctx.getObject(me.state.seatedOn),pt=me.state.seatPoint||{x:0,z:0};
  me.state.seatedOn=null;
  if(!seat){me.parent=null;return;}
  const q=seat.worldFeetPosition||seat.feetPosition,y=worldYaw(ctx,seat),c=Math.cos(y),s=Math.sin(y),out=-.72;
  me.parent=null;
  me.feetPosition={x:q.x+pt.x*c+out*s,y:q.y+.04,z:q.z-pt.x*s+out*c};
}
// what E would take right now: the seat or the pressable you're aimed at — one pick for the press and the glow
function pick(ctx,me,input){
  const aimed=aimedInteractable(ctx,me,input),seat=aimedSeat(ctx,me,input);
  // your aim across a door's leaf or doorway is the door, never the seat beside it; seat vs a person: the truer aim wins, by angle (a
  // metre barely counts) — Ingrid standing in front of the bench no longer takes the E you pointed at the seat behind her
  const V=FEEL.seatVsPress,weigh=(t)=>(t.ang??t.score)+(t.d??0)*V.metre;
  // a thing you press (lyre, dish, chest) aimed within touch reach beats a seat unless you aim at the seat itself: the pole lyre
  // stands at the north bench's front edge, and the seat's wide heading cone used to take every E aimed at it
  const person=aimed&&(aimed.o.tags||[]).some(t=>V.people.includes(t));
  const thingWins=aimed&&!aimed.span&&!person&&(aimed.d??0)<=V.pressReach&&!(seat&&seat.ang<=V.seatSelf&&seat.ang<(aimed.ang??180));
  const sit=seat&&!seat.full&&(!aimed||(!aimed.span&&!thingWins&&weigh(seat)<=weigh(aimed)+V.bias));
  return {aimed,seat,sit};
}
// the aim glow, drawn on this screen alone: it waits for the aim to hold, then an amber ring breathes over the aimed seat, a small thing
// (cup, dish) takes a faint warm glow, and a big thing (door, table, a person) takes one ember mote at the part you use — never a line round its whole body
const MOTE=`fx
pop mote n=1 size=.045 sz=$size*flick(.6,.22) col=hdr(2.1,1.15,.42) a=.75 r=sprite(soft-disc,add)
pop ember rate=4 on=disc(.04) life=.9..1.4 v=up(.1..0.2)+sdir()*.03 size=.01..0.018 acc=curl(.3)*.2+drag(.6) col=hdr(2.6,1.3,.4)>hdr(1.3,.45,.1) a=0>.2:.9>.7:.6>0 sz=$size r=sprite(ember,add)`;
function glowScratch(ctx){const s=(ctx.session.homeGlow??={});return s[ctx.self.id]??=({key:null,ring:null,mote:null,lit:null,at:0,ax:0,az:0,px:0,pz:0,pend:null,pendAt:0});}
function clearGlow(ctx,g){
  if(g.lit){ctx.emit('highlightClear',{target:g.lit},{audience:{player:ctx.self.id}});g.lit=null;}
  const ring=g.ring&&ctx.getObject(g.ring);if(ring)ring.visible=false;
  const mote=g.mote&&ctx.getObject(g.mote);if(mote){mote.fx=null;mote.visible=false;}
  g.key=null;
}
function markPoint(o,q){
  const b=o.bounds,f=o.worldFeetPosition||o.feetPosition||{x:0,y:0,z:0};
  if(q&&q.y!=null&&q.y>f.y+.3)return q;
  const c=b?.center||f,top=b?b.max.y:f.y+1.8;
  return {x:q?.x??c.x,y:Math.min(top-.1,f.y+FEEL.aimMark.headLift),z:q?.z??c.z};
}
function light(ctx,me,g,key,aimed,seat,sit){
  if(sit){
    const R=FEEL.seatRing,at={x:seat.w.x,y:seat.w.y+R.lift,z:seat.w.z};
    let ring=g.ring&&ctx.getObject(g.ring);
    if(ring){ring.feetPosition=at;ring.visible=true;}
    else{
      g.ring=ctx.spawn({audience:'local',scope:'session',feetPosition:at,rotation:{yaw:0,pitch:90,roll:0},castShadow:false,receiveShadow:false,
        primitive:{kind:'torus',radius:R.radius,tube:R.tube,radialSegments:6,tubularSegments:32},anchor:'center',pivot:'center',
        material:{color:R.color,emissive:R.color,emissiveIntensity:1.2,transparent:true,opacity:R.opacity,depthWrite:false}});
      ring=ctx.getObject(g.ring);
      if(ring)animate(ctx,ring,{scale:[1,R.breathe,1]},{duration:R.breatheSec,easing:'easeInOutSine',loop:true});
    }
    return;
  }
  const size=aimed.o.bounds?.size,big=!size||Math.max(size.x,size.y,size.z)>FEEL.aimMark.bigSize;
  let at;
  if(!big){ // a dish, a cup: a hairline warm edge, and the ember lifts off its top
    ctx.emit('highlightSet',{target:aimed.o.id,color:FEEL.aimGlow,style:'outline'},{audience:{player:me.id}});g.lit=aimed.o.id;
    const b=aimed.o.bounds;at=b?{x:b.center.x,y:b.max.y+.04,z:b.center.z}:markPoint(aimed.o,aimed.q);
  }else at=markPoint(aimed.o,aimed.q);
  const mote=g.mote&&ctx.getObject(g.mote);
  if(mote){mote.feetPosition=at;mote.visible=true;mote.fx={script:MOTE};}
  else g.mote=ctx.spawn({audience:'local',scope:'session',feetPosition:at,fx:{script:MOTE}});
}

// RETICLE (creator GO 2026-09-30, docs/board/proposals/RETICLE.md): left click (`use`) is E unless a held tool owns the left button
function clickIsE(ctx,me,input){return !!input.pressed?.use&&!(me.isEditor&&me.state.optionsOpen&&me.state.optTab==='build')&&!me.state.holding&&!me.state.shovel&&!me.state.chessView?.on&&!(me.state.judgeOpen!=null)&&!onBoard(ctx,me,input);}
const SKIP=new Set(['hall','yard','home','den','west','east','north','south','main','the','a','kit','model','far','near','left','right','inner','outer']);
function labelOf(o){const s=o.state||{};if(typeof s.label==='string')return s.label.slice(0,24);
  const w=String(o.id||'').split(/[\/#:]/).pop().split(/[-_ ]/).filter(x=>x&&!/^\d+$/.test(x)&&!SKIP.has(x.toLowerCase()));return (w.pop()||'use').slice(0,24);}
function setAim(me,k,label){const a=me.state.aim;if((a?.k??null)===k)return;me.state.aim=k?{k,label}:null;}
function tally(ctx,id){const t=ctx.world.state.useTally;if(!t){ctx.world.state.useTally={[id]:1};return;}
  if(t[id]==null){if(Object.keys(t).length>=64)return;t[id]=1;}else t[id]+=1;}
function showGlow(ctx,me,input){
  const g=glowScratch(ctx),now=ctx.now(),p=me.worldFeetPosition||me.feetPosition,ax=input?.axes?.aimYawSin??0,az=input?.axes?.aimYawCos??1;
  if(me.state.seatedOn||me.state.chessView?.on){if(g.key||g.pend)clearGlow(ctx,g);g.pend=null;setAim(me,null);return;} // over the board the aim mark would sit on the bench and the folk across your whole view
  if(me.state.aim?.k==='board'||ctx.session.boardIn?.[me.id]?.on){if(g.key||g.pend)clearGlow(ctx,g);g.pend=null;return;} // board-input.js owns the aim over a board
  if(now-g.at<FEEL.aimRefreshMs)return;
  if(!g.pend&&Math.abs(ax-g.ax)<.02&&Math.abs(az-g.az)<.02&&Math.hypot(p.x-g.px,p.z-g.pz)<.08&&now-g.at<1000)return;
  g.at=now;g.ax=ax;g.az=az;g.px=p.x;g.pz=p.z;
  const {aimed,seat,sit}=pick(ctx,me,input);
  const key=sit?`seat:${seat.o.id}:${seat.pt.x.toFixed(2)}:${seat.pt.z.toFixed(2)}`:aimed?`press:${aimed.o.id}`:null;
  if(key===g.key){g.pend=null;return;}
  if(g.key)clearGlow(ctx,g); // looking away drops it at once
  if(!key){g.pend=null;setAim(me,null);return;}
  if(g.pend!==key){g.pend=key;g.pendAt=now;return;} // a glance across the room lights nothing
  if(now-g.pendAt<FEEL.aimMark.dwellMs)return;
  g.pend=null;g.key=key;
  light(ctx,me,g,key,aimed,seat,sit);
  setAim(me,key,sit?'sit':labelOf(aimed.o));
}
export function onInput(ctx,input) {
  const me=ctx.self;
  showGlow(ctx,me,input);
  if(me.state.seatedOn){
    // E, jump, or a push of the stick/WASD stands you up; the push waits out a short grace so the key you walked in on doesn't pop you straight back up
    const S=FEEL.standPush,mx=input.axes?.moveX??0,mz=input.axes?.moveZ??0,sat=seatScratch(ctx).at??0;
    const pushed=Math.hypot(mx,mz)>=S.deadzone&&ctx.now()-sat>=S.graceMs; void pushed;
    if(input.pressed.interact){standUp(ctx);showGlow(ctx,me,input);}
    else if(input.pressed.jump&&ctx.getObject(me.state.seatedOn)?.tags?.includes?.('delaware-carriage')){standUp(ctx);} // Mount Delaware carriage: jump steps off too // creator 2026-10-06: only E gets you off the bench; camera drags, clicks, jump and WASD keep you seated (was: interact||clickIsE||jump||pushed)
    return;}
  if(!input.pressed.interact&&!clickIsE(ctx,me,input)) return;
  if(!me.state.holding&&onBoard(ctx,me,input)) return; // E at a board: nothing
  if(me.state.holding){const h=ctx.getObject(me.state.holding);ctx.emit('press',{by:me.id},{to:h?.state?.from||'hall-lyre'});return;} // E with the hall lyre in hand sets it back on its post
  {const p=me.worldFeetPosition||me.feetPosition,helm=ctx.query({tags:['warship-helm'],radius:3.2,center:p})[0]??ctx.query({tags:['warship'],radius:40,center:p}).map(h=>ctx.getObject(h.id+'/helm')).find(w=>{const q=w?.worldFeetPosition;return q&&Math.hypot(q.x-p.x,q.z-p.z)<3.4&&Math.abs(q.y-p.y)<3;}); // a ship's wheel within reach: E takes the helm before anything aimed (the hull's own wheel, when a child row is not in the query)
    if(helm){ctx.emit('haptic',{kind:'soft'},{audience:{player:me.id}});ctx.emit('press',{by:me.id},{to:helm.id});return;}}
  const {aimed,seat,sit}=pick(ctx,me,input);
  if(seat?.full&&!aimed){ctx.emit('toast',{message:'someone is sitting there',duration:1.6},{audience:{player:me.id}});return;}
  if(sit||aimed)ctx.emit('haptic',{kind:'soft'},{audience:{player:me.id}});
  if(!sit&&!aimed&&!me.state.mount&&me.state.wynx&&input.pressed.interact){ /* (creator 2026-10-06) a click never mounts her, only E */ const hp=me.worldFeetPosition||me.feetPosition,g=ctx.getObject(me.state.wynx),q=g&&(g.worldFeetPosition||g.feetPosition); // your own Wynx beside you: E climbs on (scripts/player.js ears.wynxRide)
    if(q&&Math.hypot(q.x-hp.x,q.z-hp.z)<4.5&&Math.abs(q.y-hp.y)<3){ctx.emit('haptic',{kind:'soft'},{audience:{player:me.id}});ctx.emit('wynxRide',{id:g.id},{to:me.id});return;}}
  if(!sit&&!aimed){const hp=me.worldFeetPosition||me.feetPosition,horse=ctx.query({tags:['den-horse'],radius:3.8,center:hp})[0]; // a horse beside you: any E mounts, no aiming at her
    if(horse){ctx.emit('haptic',{kind:'soft'},{audience:{player:me.id}});ctx.emit('press',{by:me.id},{to:horse.id});return;}}
  if(!sit&&!aimed){const hp=me.worldFeetPosition||me.feetPosition,car=ctx.query({tags:['delaware-carriage'],radius:5,center:hp})[0]; // Mount Delaware carriage beside you: E takes a free seat (E or jump steps off, standUp)
    if(car){const c=ctx.getObject(car.id),seats=c?.state?.seats||[],taken=new Set(ctx.place.players.filter(p=>p.state?.seatedOn===car.id).map(p=>JSON.stringify(p.state.seatPoint)));const pt=seats.find(s=>!taken.has(JSON.stringify(s)));
      if(!pt){ctx.emit('toast',{message:'the carriage is full',duration:1.6},{audience:{player:me.id}});return;}
      ctx.emit('haptic',{kind:'soft'},{audience:{player:me.id}});seatScratch(ctx).at=ctx.now();clearGlow(ctx,glowScratch(ctx));me.parent=car.id;me.feetPosition={...pt};me.rotation={yaw:0};me.state.seatedOn=car.id;me.state.seatPoint=pt;
      ctx.emit('toast',{message:'all aboard: next stop '+(c.state.at?c.state.next:(c.state.next||'the peaks'))+'. E steps off',duration:2.5},{audience:{player:me.id}});return;}}
  if(!sit&&!aimed)ctx.log('E: nothing to take',{at:me.worldFeetPosition||me.feetPosition,seat:seat?(seat.full?'full':seat.o.id):null});
  if(sit){seatScratch(ctx).at=ctx.now();clearGlow(ctx,glowScratch(ctx));me.parent=seat.o.id;me.feetPosition={x:seat.pt.x,y:seat.pt.y,z:seat.pt.z};me.rotation={yaw:0};me.state.seatedOn=seat.o.id;me.state.seatPoint=seat.pt;
    const q=seat.o.worldFeetPosition||seat.o.feetPosition,y=worldYaw(ctx,seat.o),c=Math.cos(y),sn=Math.sin(y);skalNear(ctx,{x:q.x+seat.pt.x*c+seat.pt.z*sn,y:q.y,z:q.z-seat.pt.x*sn+seat.pt.z*c}); // a seat at the feast: the nearest seated folk raises a mug, once per sit
    return;}
  if(aimed){ctx.emit('press',{by:me.id},{to:aimed.o.id});tally(ctx,aimed.o.id);}
}
export function update(ctx,dt) {
  const state=scratch(ctx), p=ctx.self.feetPosition;
  if(ctx.self.parent) {state.last=null;return;}
  const old=state.last; state.last={x:p.x,y:p.y,z:p.z};
  if(!old) return;
  const moved=Math.hypot(p.x-old.x,p.z-old.z);
  if(!ctx.self.grounded || moved>2.5) {state.distance=0;return;}
  state.distance+=moved;
  if(state.distance>=FEEL.stepLength) {
    state.distance%=FEEL.stepLength;
    ctx.emit('playSound',{clip:kpick(KSFX[floorKind(ctx,p)]??KSFX.grass,ctx.random()),position:p,volume:0.16,pitch:0.96+ctx.random()*0.08,maxDistance:8,mode:'restart'});
  }
  if(moved<0.001) ctx.sleep();
}
