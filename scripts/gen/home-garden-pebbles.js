import { GARDEN as G } from '../../templates/home-garden.js';
import { V, face } from './home-garden-kit.js';
// One pebble. Always draws the same 15 randoms rockHull(n=5) did, so every level keeps the same stones.
// lod 1: rockHull n=5 exactly · 2: 4 corners, no buried cap · 3: 3 corners, one band · 4: 3-sided pyramid · 5: one lit triangle.
function pebble(c,center,w,h,d,lod){
  const n=5,R=[[],[],[]];
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2,j=.84+c.random()*.23,x=Math.cos(a)*w*.5*j,z=Math.sin(a)*d*.5*j,g=c.groundY(center.x+x,center.z+z);
    R[0].push(V(center.x+x*.8,g-.065,center.z+z*.8));R[1].push(V(center.x+x,g+h*(.35+c.random()*.12),center.z+z));R[2].push(V(center.x+x*.48,g+h*(.84+c.random()*.16),center.z+z*.48));
  }
  let y=0;for(const p of R[2])y+=p.y;y/=n;const top=V(center.x,y,center.z);
  const side=(a,b,cc,dd)=>face(c,[a,b,cc,dd],V(a.x-center.x,.1,a.z-center.z));
  if(lod===1){
    for(let r=0;r<2;r++)for(let i=0;i<n;i++){const j=(i+1)%n;side(R[r][i],R[r][j],R[r+1][j],R[r+1][i]);}
    for(let i=0;i<n;i++){face(c,[R[2][i],R[2][(i+1)%n],top],V(0,1,0));if(i>0&&i<n-1)face(c,[R[0][0],R[0][i],R[0][i+1]],V(0,-1,0));}
    return;
  }
  const pick=lod===2?[0,1,3,4]:[0,2,3],k=pick.length,Q=R.map(r=>pick.map(i=>r[i]));
  if(lod===5){face(c,Q[1].map(m=>V(m.x,y*.5+m.y*.5,m.z)),V(0,1,0));return;}
  // lod 2: two bands + cap on 4 of the 5 corners (no buried floor); lod 3: one band + cap on 3; lod 4: a 3-sided pyramid.
  const bands=lod===2?2:lod===3?1:0,capRing=lod===4?Q[0]:Q[bands];
  for(let r=0;r<bands;r++)for(let i=0;i<k;i++){const j=(i+1)%k;side(Q[r][i],Q[r][j],Q[r+1][j],Q[r+1][i]);}
  for(let i=0;i<k;i++){const j=(i+1)%k;face(c,[capRing[i],capRing[j],top],V((capRing[i].x+capRing[j].x)*.5-center.x,.4,(capRing[i].z+capRing[j].z)*.5-center.z));}
}
export function geometry(c){
  const pts=c.params.points??[[0,0],[-5.1,-.3],[-9.1,-7.8]],count=c.params.count??G.pebbleCount,lod=c.lod??1;
  const lengths=pts.slice(1).map((b,i)=>Math.hypot(b[0]-pts[i][0],b[1]-pts[i][1])),total=lengths.reduce((a,b)=>a+b,0);
  c.flat();c.albedo('scripts/tex-garden-limestone.js');c.roughness(.97);
  for(let i=0;i<count;i++){
    let s=c.random()*total,k=0;while(k<lengths.length-1&&s>lengths[k]){s-=lengths[k];k++;}
    const a=pts[k],b=pts[k+1],l=lengths[k],t=s/l,dx=(b[0]-a[0])/l,dz=(b[1]-a[1])/l,side=(i%2?1:-1)*(.41+c.random()*.24),x=a[0]+(b[0]-a[0])*t-dz*side,z=a[1]+(b[1]-a[1])*t+dx*side;
    const size=.04+c.random()*.10,hh=.015+c.random()*.026;c.color(G.stoneColors[i%G.stoneColors.length]);
    if(lod===5&&i>=48){for(let q=0;q<15;q++)c.random();continue;}
    pebble(c,V(x,c.groundY(x,z),z),size,hh,size*.73,lod);
  }
}
export function collider(){return null;}
