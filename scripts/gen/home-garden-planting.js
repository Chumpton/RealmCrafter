import { softened } from './soften.js';
import { GARDEN as G } from '../../templates/home-garden.js';
import { V, tube, leaf, face } from './home-garden-kit.js';
// Per level: blades per tuft, daisy petals/stem sides, fern pinna pairs. Random draws never change, so levels share one layout.
const LOD={1:{blades:7,petals:9,stem:4,centre:7,dleaf:1,pinnae:9,fstem:4},2:{blades:5,petals:6,stem:3,centre:5,dleaf:1,pinnae:6,fstem:3},3:{blades:4,petals:0,stem:0,centre:0,dleaf:0,pinnae:5,fstem:0}};
const lodOf=c=>c.lod??1;
function card(c,x,y,z,a,w,l,top=.35){const dx=Math.cos(a),dz=Math.sin(a);face(c,[V(x-dx*w,y,z-dz*w),V(x+dx*w,y,z+dz*w),V(x+dx*w*top,y+l,z+dz*w*top),V(x-dx*w*top,y+l,z-dz*w*top)],V(-dz,.3,dx));}
function grass(c,x,y,z,h){
  const lod=lodOf(c),keep=(LOD[lod]??LOD[3]).blades;
  for(let i=0;i<7;i++){const a=i*2.39996323+c.random()*.6,l=h*(.5+c.random()*.7),r=.06+c.random()*.08,dx=Math.cos(a),dz=Math.sin(a),w=.008+c.random()*.01;
    if(lod>=4){if(i===0){c.color(G.meadowColors[1]);card(c,x,y,z,a+1.57,.07,h*.9);}continue;}
    if(i>=keep)continue;
    c.color(G.meadowColors[i%G.meadowColors.length]);face(c,[V(x-dz*w,y,z+dx*w),V(x+dz*w,y,z-dx*w),V(x+dx*r*.55,y+l*.62,z+dz*r*.55),V(x+dx*r,y+l,z+dz*r)],V(-dz,.3,dx));}
}
function daisy(c,x,y,z,h){
  const lod=lodOf(c),flowerSize=c.params.flowerSize??1,top=V(x+.04,y+h,z-.012);
  if(lod>=3){
    c.albedo(null);
    if(lod===3){c.color('#698449');face(c,[V(x-.006,y,z),V(x+.006,y,z),V(top.x+.004,top.y,top.z),V(top.x-.004,top.y,top.z)],V(0,0,-1));}
    c.color('#f3ecd1');const n=lod===3?6:2,r=.075*flowerSize;
    if(lod===3){for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;face(c,[top,V(top.x+Math.cos(a)*r,top.y+.006,top.z+Math.sin(a)*r),V(top.x+Math.cos(b)*r,top.y+.006,top.z+Math.sin(b)*r)],V(0,1,0));}
      c.color('#d9ad48');const q=.017*flowerSize,u=V(top.x,top.y+.012,top.z);face(c,[V(u.x+q,u.y,u.z),V(u.x-q*.5,u.y,u.z+q*.87),V(u.x-q*.5,u.y,u.z-q*.87)],V(0,1,0));}
    else face(c,[V(top.x-r,top.y,top.z),V(top.x,top.y+.004,top.z-r),V(top.x+r,top.y,top.z),V(top.x,top.y+.004,top.z+r)],V(0,1,0));
    return;
  }
  const L=LOD[lod]??LOD[1];
  c.albedo('scripts/tex-garden-leaf.js');c.color('#698449');tube(c,[V(x,y,z),V(x+.018,y+h*.5,z-.008),V(x+.04,y+h,z-.012)],[.006,.004,.003],L.stem);
  if(L.dleaf)leaf(c,V(x+.018,y+h*.35,z),V(.8,.32,.5),.13,.025,0);
  c.albedo(null);c.color('#f3ecd1');
  const ps=L.petals===9?1:1.25;
  for(let i=0;i<L.petals;i++){const a=i*Math.PI*2/L.petals,dx=Math.cos(a),dz=Math.sin(a),r=.029*flowerSize;leaf(c,V(top.x+dx*r,top.y+.004,top.z+dz*r),V(dx,.10,dz),.056*flowerSize*ps,.019*flowerSize*ps,0);}
  c.color('#d9ad48');tube(c,[V(top.x,top.y-.004,top.z),V(top.x,top.y+.009,top.z)],[.017*flowerSize,.014*flowerSize],L.centre);
}
// Two-triangle pinna for the far fern.
function pinna(c,p,d,l,w){const n=Math.hypot(d.x,d.z)||1,ax=d.x/n,az=d.z/n;face(c,[V(p.x-ax*l*.5,p.y,p.z-az*l*.5),V(p.x-az*w*.5,p.y+.01,p.z+ax*w*.5),V(p.x+ax*l*.5,p.y-.02,p.z+az*l*.5),V(p.x+az*w*.5,p.y+.01,p.z-ax*w*.5)],V(0,1,0));}
function fern(c){
  const lod=lodOf(c);
  c.albedo('scripts/tex-garden-leaf.js');c.roughness(.9);
  for(let i=0;i<8;i++){
    const a=i*Math.PI*2/8+.13,len=.43+c.random()*.18,dx=Math.cos(a),dz=Math.sin(a),base=V(0,c.groundY(0,0)-.025,0);
    if(lod>=4){// a frond as one arched tapering strip
      c.color(G.meadowColors[i%G.meadowColors.length]);const w=.09,sx=-dz*w,sz=dx*w;
      const P=[[0,.12,1],[.45,.36,.9],[1,.18,.15]];
      const segs=lod===4?P.length-1:1,pts=lod===4?P:[P[0],P[2]];
      for(let k=0;k<segs;k++){const A=pts[k],B=pts[k+1];face(c,[V(dx*len*A[0]-sx*A[2],A[1],dz*len*A[0]-sz*A[2]),V(dx*len*A[0]+sx*A[2],A[1],dz*len*A[0]+sz*A[2]),V(dx*len*B[0]+sx*B[2],B[1],dz*len*B[0]+sz*B[2]),V(dx*len*B[0]-sx*B[2],B[1],dz*len*B[0]-sz*B[2])],V(0,1,0));}
      continue;
    }
    const L=LOD[lod]??LOD[1];
    c.color('#6c8750');if(L.fstem)tube(c,[base,V(dx*len*.36,.38,dz*len*.36),V(dx*len,.18,dz*len)],[.009,.005,.001],L.fstem);
    const n=L.pinnae,grow=9/n;
    for(let q=1;q<=n;q++){const t=q/(n+1),reach=len*t,y=Math.sin(t*Math.PI)*.25+.12,l=(.18*Math.sin(t*Math.PI)+.025)*(n===9?1:Math.min(1.35,Math.sqrt(grow)));
      for(const sign of [-1,1]){c.color(G.meadowColors[(q+i)%G.meadowColors.length]);const p=V(dx*reach-dz*sign*l*.26,y,dz*reach+dx*sign*l*.26),d=V(-dz*sign*.8+dx*.45,-.15,dx*sign*.8+dz*.45);if(lod===3)pinna(c,p,d,l,.05);else leaf(c,p,d,l,.035,sign*.2);}
    }
  }
}
function rawGeometry(c){
  c.flat();c.roughness(.92);
  const lod=lodOf(c);
  if(c.params.kind==='fern'){fern(c);return;}
  c.albedo('scripts/tex-garden-leaf.js');
  if(c.params.kind==='seams'){
    for(let i=0;i<G.seams.length;i++){const p=G.seams[i],x=p[0]-G.rootPlan[0],z=p[1]-G.rootPlan[1];c.albedo('scripts/tex-garden-leaf.js');grass(c,x,-.018,z,.11);if(i%2===0)daisy(c,x+.03,-.014,z,.18);}return;
  }
  const {rx=1,rz=.5,tufts=24,flowers=8,grassHeight=.17,grassVariation=.17,flowerHeight=.22,flowerVariation=.17}=c.params;
  // lod 5 keeps at most 18 tuft cards and 6 flower cards (≤ 48 triangles).
  let tuftsDrawn=0,flowersDrawn=0;
  for(let i=0;i<tufts+flowers;i++){
    const a=c.random()*Math.PI*2,r=Math.sqrt(c.random()),x=Math.cos(a)*r*rx,z=Math.sin(a)*r*rz,y=c.groundY(x,z)-.026;
    if(i<tufts){const gh=grassHeight+c.random()*grassVariation;if(lod===5&&tuftsDrawn>=18)continue;tuftsDrawn++;c.albedo('scripts/tex-garden-leaf.js');grass(c,x,y,z,gh);}
    else{const fh=flowerHeight+c.random()*flowerVariation;if(lod===5&&flowersDrawn>=6)continue;flowersDrawn++;daisy(c,x,y,z,fh);}
  }
}
export const geometry = softened(rawGeometry); // foliage lights as one soft mass (soften.js)
export function collider(){return null;}
