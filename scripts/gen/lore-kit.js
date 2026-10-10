// Lore lane mesh helpers: every face wound outward from a direction, never eyeballed.
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const nrm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l];};
// Far detail, read off ctx.lod (1 = the finished thing, untouched): fewer sides, thinner paths, and parts too small to read at that distance left out. Colliders never route through these.
const LOD_SIDES=[1,1,.7,.5,.4,.3],LOD_CUT=[0,0,.025,.06,.14,.3];
export function lodLevel(c){const l=c&&c.lod;return typeof l==='number'&&l>1?Math.min(5,Math.floor(l)):1;}
export function lodSides(c,n,min=3){const l=lodLevel(c);return l===1?n:Math.max(Math.min(n,min),Math.round(n*LOD_SIDES[l]));}
export function lodDrop(c,len,thick){const l=lodLevel(c);return l>1&&Math.sqrt(Math.abs(len*thick))<LOD_CUT[l]&&Math.abs(len)<LOD_CUT[l]*2.5;}
export function lodPath(c,n){const l=lodLevel(c),step=l>=4?3:l>=3?2:1;if(step===1||n<=3)return null;const idx=[];for(let i=0;i<n-1;i+=step)idx.push(i);idx.push(n-1);return idx;}
export function qd(ctx,a,b,c,d,dir){const n=crs(sub(b,a),sub(c,a));if(dot(n,dir)<0)ctx.quad(...a,...d,...c,...b);else ctx.quad(...a,...b,...c,...d);}
export function td(ctx,a,b,c,dir){const n=crs(sub(b,a),sub(c,a));if(dot(n,dir)<0)ctx.tri(...a,...c,...b);else ctx.tri(...a,...b,...c);}
export function q(ctx,a,b,c,d,ref){const m=[(a[0]+b[0]+c[0]+d[0])/4,(a[1]+b[1]+c[1]+d[1])/4,(a[2]+b[2]+c[2]+d[2])/4];qd(ctx,a,b,c,d,sub(m,ref));}
export function box(ctx,x0,y0,z0,x1,y1,z1){
  const P=(i)=>[i&1?x1:x0,i&2?y1:y0,i&4?z1:z0];
  qd(ctx,P(0),P(1),P(3),P(2),[0,0,-1]);qd(ctx,P(4),P(5),P(7),P(6),[0,0,1]);
  qd(ctx,P(0),P(2),P(6),P(4),[-1,0,0]);qd(ctx,P(1),P(3),P(7),P(5),[1,0,0]);
  qd(ctx,P(0),P(1),P(5),P(4),[0,-1,0]);qd(ctx,P(2),P(3),P(7),P(6),[0,1,0]);
}
// a solid of revolution about the Y axis at (cx,cz): prof = [[r,y],…] from the bottom centre round the outside to the top centre
export function lathe(ctx,cx,cy,cz,prof,seg,a0=0){
  if(lodLevel(ctx)>1){const ix=lodLevel(ctx)>=4&&prof.length>4?lodPath({lod:3},prof.length):null;if(ix)prof=ix.map(i=>prof[i]);seg=lodSides(ctx,seg);}
  for(let i=0;i<prof.length-1;i++){
    const [r0,y0]=prof[i],[r1,y1]=prof[i+1],dr=r1-r0,dy=y1-y0;
    for(let s=0;s<seg;s++){
      const t0=a0+s/seg*Math.PI*2,t1=a0+(s+1)/seg*Math.PI*2,tm=(t0+t1)/2;
      const p=(r,y,t)=>[cx+Math.cos(t)*r,cy+y,cz+Math.sin(t)*r];
      const dir=[Math.cos(tm)*dy,-dr,Math.sin(tm)*dy];
      if(r0<1e-6) td(ctx,p(0,y0,0),p(r1,y1,t0),p(r1,y1,t1),dir);
      else if(r1<1e-6) td(ctx,p(r0,y0,t0),p(r0,y0,t1),p(0,y1,0),dir);
      else qd(ctx,p(r0,y0,t0),p(r0,y0,t1),p(r1,y1,t1),p(r1,y1,t0),dir);
    }
  }
}
// an elliptic tube along a spine: pts = [{p:[x,y,z], rx, ry}], rx sideways, ry up; ends capped; band(i) runs before each band
export function tube(ctx,pts,seg,band){
  if(lodLevel(ctx)>1){let L=0,rm=0;for(let i=0;i<pts.length;i++){rm=Math.max(rm,pts[i].rx,pts[i].ry);if(i)L+=Math.hypot(...sub(pts[i].p,pts[i-1].p));}if(lodDrop(ctx,L,rm*2))return;seg=lodSides(ctx,seg);}
  const n=pts.length,rings=[];
  for(let i=0;i<n;i++){
    const a=pts[Math.max(0,i-1)].p,b=pts[Math.min(n-1,i+1)].p,T=nrm(sub(b,a));
    let S=crs(T,[0,1,0]);if(Math.hypot(...S)<1e-4)S=[1,0,0];S=nrm(S);const U=crs(S,T);
    const {p,rx,ry}=pts[i],ring=[];
    for(let s=0;s<seg;s++){const t=s/seg*Math.PI*2,c=Math.cos(t)*rx,d=Math.sin(t)*ry;ring.push([p[0]+S[0]*c+U[0]*d,p[1]+S[1]*c+U[1]*d,p[2]+S[2]*c+U[2]*d]);}
    rings.push({ring,T,p});
  }
  for(let i=0;i<n-1;i++){
    band&&band(i);
    const A=rings[i],B=rings[i+1],m=[(A.p[0]+B.p[0])/2,(A.p[1]+B.p[1])/2,(A.p[2]+B.p[2])/2];
    for(let s=0;s<seg;s++){const s1=(s+1)%seg;q(ctx,A.ring[s],A.ring[s1],B.ring[s1],B.ring[s],m);}
  }
  const cap=(R,sign)=>{if(pts[R===rings[0]?0:n-1].rx<1e-5)return;for(let s=0;s<seg;s++)td(ctx,R.p,R.ring[s],R.ring[(s+1)%seg],[R.T[0]*sign,R.T[1]*sign,R.T[2]*sign]);};
  band&&band(0);cap(rings[0],-1);band&&band(n-2);cap(rings[n-1],1);
}
export function rod(ctx,a,b,r,seg,r2=r){tube(ctx,[{p:a,rx:r,ry:r},{p:b,rx:r2,ry:r2}],seg);}
// an axis-aligned ellipsoid
export function ell(ctx,c,r,seg,rings){
  if(lodLevel(ctx)>1){if(lodDrop(ctx,2*Math.max(...r),2*Math.min(...r)))return;seg=lodSides(ctx,seg);rings=lodSides(ctx,rings,2);}
  const P=(i,j)=>{const la=-Math.PI/2+i/rings*Math.PI,lo=j/seg*Math.PI*2;return[c[0]+Math.cos(la)*Math.cos(lo)*r[0],c[1]+Math.sin(la)*r[1],c[2]+Math.cos(la)*Math.sin(lo)*r[2]];};
  for(let i=0;i<rings;i++)for(let j=0;j<seg;j++){
    const a=P(i,j),b=P(i,j+1),cc=P(i+1,j+1),d=P(i+1,j);
    if(i===0)td(ctx,a,cc,d,sub(cc,c));else if(i===rings-1)td(ctx,a,b,cc,sub(a,c));else q(ctx,a,b,cc,d,c);
  }
}
export function boxCollider(ctx,list){for(const b of list)box(ctx,...b);}
