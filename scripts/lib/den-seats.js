import { DEFAULTS } from './data/den-furniture-defaults.js';
// A SEAT: an item whose params carry `seat` (the seat's height, metres) is sat on — E beside it sits, E again stands
// (scripts/home-player-feel.js). The points are where the sitter's feet go, seat-local: one per ~0.6 m of width, facing −z;
// the body's sit pose lifts the hips about half a body above the point.
// state.seatBlock on the row: [[x0,x1],…] seat-local x ranges no one may sit in (a game table, a post) — authored by live dot write
export function sitPointsOf(params,state){
  const pts=sitPointsRaw(params),blk=state?.seatBlock;
  return Array.isArray(blk)&&blk.length?pts.filter(p=>!blk.some(([a,b])=>p.x>=Math.min(a,b)&&p.x<=Math.max(a,b))):pts;
}
function sitPointsRaw(params){
  if(!params)return [];
  if(params.item==='furn-bench'){ // the longhouse wall benches: a seat every ~1 m along each run, gaps and posts left clear, facing the family's −Z front
    const L=params.length||4,gaps=[...(params.gaps||[])].sort((a,b)=>a[0]-b[0]),skip=params.skip||[],out=[];let x=-L/2;const runs=[];
    for(const g of gaps){if(g[0]>x)runs.push([x,g[0]]);x=Math.max(x,g[1]);}if(x<L/2)runs.push([x,L/2]);
    for(const [a,b] of runs){const n=Math.floor((b-a)/1);for(let i=0;i<n;i++){const px=a+(i+.5)*(b-a)/n;if(!skip.some(k=>Math.abs(k-px)<.45))out.push({x:px,y:Math.max(0,(params.seat??.45)-.48),z:-.42});}}
    return out;
  }
  const p={...(DEFAULTS[params.item]||{}),...params};
  if(typeof p.seat!=='number')return [];
  const w=p.width||p.length||.5,n=Math.max(1,Math.floor((w+.1)/.6)),y=Math.max(0,p.seat-.48);
  return Array.from({length:n},(_,i)=>({x:n===1?0:(i+.5)*w/n-w/2,y,z:.03}));
}
