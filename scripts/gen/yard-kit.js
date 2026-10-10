// The yard's modelling kit: every face is wound outward from a stated direction, never eyeballed.
export const TEX={
  wood:'scripts/tex-furnishing-wood.js?species=oak', walnut:'scripts/tex-furnishing-wood.js?species=walnut', char:'scripts/tex-furnishing-wood.js?species=char',
  bark:'scripts/tex-valley-bark.js', stone:'cdn/texture-rough-grey-fieldstone.png', soot:'scripts/tex-furnishing-stone.js?kind=soot',
  granite:'cdn/texture-weathered-grey-granite.png', turf:'cdn/texture-mossy-turf-sod-grass.png', hay:'cdn/texture-golden-hay-straw.png',
  hide:'cdn/texture-tanned-leather-hide.png', fur:'cdn/texture-shaggy-brown-fur-pelt.png', shingle:'cdn/texture-weathered-wooden-roof-shingles.png',
  planks:'cdn/texture-weathered-vertical-wood-planks.png', earth:'scripts/tex-portal-earth.js', weave:'scripts/tex-furnishing-weave.js',
};
export const IRON='oklch(0.34 0.012 250)';
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const len=(a)=>Math.hypot(a[0],a[1],a[2]);
const norm=(a)=>{const l=len(a)||1;return [a[0]/l,a[1]/l,a[2]/l];};
export const V={add,sub,mul,cross,dot,len,norm};
// Far detail, read off ctx.lod (1 = the finished thing, untouched): fewer sides, thinner paths, and parts too small to read at that distance left out. Colliders never route through these.
const LOD_SIDES=[1,1,.6,.45,.34,.25],LOD_CUT=[0,0,.03,.075,.16,.34];
// small round bits carry few sides even up close: a 2 cm rod reads round at 5, a 5 cm post at 6, a 10 cm log at 8
export function roundSides(r,n){return r<.025?Math.min(n,5):r<.05?Math.min(n,6):r<.1?Math.min(n,8):n;}
export function lodLevel(c){const l=c&&c.lod;return typeof l==='number'&&l>1?Math.min(5,Math.floor(l)):1;}
export function lodSides(c,n,min=3){const l=lodLevel(c);return l===1?n:Math.max(Math.min(n,min),Math.round(n*LOD_SIDES[l]));}
export function lodDrop(c,len,thick){const l=lodLevel(c);return l>1&&Math.sqrt(Math.abs(len*thick))<LOD_CUT[l]&&Math.abs(len)<LOD_CUT[l]*2.5;}
export function lodPath(c,n){const l=lodLevel(c),step=l>=4?3:l>=3?2:1;if(step===1||n<=3)return null;const idx=[];for(let i=0;i<n-1;i+=step)idx.push(i);idx.push(n-1);return idx;}
let T={x:0,y:0,z:0,c:1,s:0};
// frame(x,y,z,yaw°): later emits are placed in this sub-frame (yaw 90 turns −Z to −X)
export function frame(x=0,y=0,z=0,yaw=0){const r=yaw*Math.PI/180;T={x,y,z,c:Math.cos(r),s:Math.sin(r)};}
const R=(v)=>[v[0]*T.c+v[2]*T.s,v[1],-v[0]*T.s+v[2]*T.c];
const P=(p)=>{const r=R(p);return [r[0]+T.x,r[1]+T.y,r[2]+T.z];};
export function q(ctx,a,b,c,d,want){
  const A=P(a),B=P(b),C=P(c),D=P(d),w=R(want);
  let n=cross(sub(B,A),sub(C,A));if(len(n)<1e-10)n=cross(sub(C,A),sub(D,A));
  if(dot(n,w)<0)ctx.quad(...A,...D,...C,...B);else ctx.quad(...A,...B,...C,...D);
}
export function tri(ctx,a,b,c,want){
  const A=P(a),B=P(b),C=P(c),w=R(want);
  if(dot(cross(sub(B,A),sub(C,A)),w)<0)ctx.tri(...A,...C,...B);else ctx.tri(...A,...B,...C);
}
// oriented box: centre o, half-axes ax, ay, az (ay is "up"; bottom face skipped unless asked)
export function obox(ctx,o,ax,ay,az,opt={}){
  const A=[ax,ay,az],c=(t)=>add(add(add(o,mul(ax,t[0])),mul(ay,t[1])),mul(az,t[2]));
  for(let e=0;e<3;e++)for(const sg of [-1,1]){
    if(e===1&&sg<0&&!opt.bottom)continue;
    if(e===1&&sg>0&&opt.top===false)continue;
    const f=(u,w)=>{const t=[0,0,0];t[e]=sg;t[(e+1)%3]=u;t[(e+2)%3]=w;return c(t);};
    q(ctx,f(-1,-1),f(1,-1),f(1,1),f(-1,1),mul(A[e],sg));
  }
}
export function box(ctx,cx,y0,cz,w,h,d,yaw=0,opt={}){
  const r=yaw*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
  obox(ctx,[cx,y0+h/2,cz],[c*w/2,0,-s*w/2],[0,h/2,0],[s*d/2,0,c*d/2],opt);
}
export function basis(u){
  const un=norm(u),ref=Math.abs(un[1])>0.9?[1,0,0]:[0,1,0],s=norm(cross(un,ref)),t=cross(s,un);return [un,s,t];
}
// a squared timber from a to b: w across (horizontal side), h the other way
export function beam(ctx,a,b,w,h){
  if(lodDrop(ctx,len(sub(b,a)),Math.max(w,h)))return;
  const u=sub(b,a),[,s,t]=basis(u),tiny=Math.max(w,h)<=.05; // a thin rod's end caps are a few mm, never read: dropped
  obox(ctx,mul(add(a,b),.5),mul(t,h/2),mul(u,.5),mul(s,w/2),tiny?{top:false}:{bottom:true});
}
export function cyl(ctx,a,b,r0,r1,seg,opt={}){
  if(lodDrop(ctx,len(sub(b,a)),r0+r1))return;seg=lodSides(ctx,roundSides(Math.max(r0,r1),seg));if(Math.max(r0,r1)<.015)opt={...opt,caps:false};
  const u=sub(b,a),[un,s,t]=basis(u),ph=opt.phase||0,A=[],B=[],dir=(g)=>add(mul(s,Math.cos(g)),mul(t,Math.sin(g)));
  for(let i=0;i<seg;i++){const d=dir(ph+i/seg*Math.PI*2);A.push(add(a,mul(d,r0)));B.push(add(b,mul(d,r1)));}
  for(let i=0;i<seg;i++){const j=(i+1)%seg;q(ctx,A[i],A[j],B[j],B[i],dir(ph+(i+.5)/seg*Math.PI*2));}
  if(opt.caps===false)return;
  if(opt.cap)opt.cap();
  for(let i=1;i<seg-1;i++){if(r0>0&&opt.capA!==false)tri(ctx,A[0],A[i],A[i+1],mul(un,-1));if(r1>0&&opt.capB!==false)tri(ctx,B[0],B[i],B[i+1],un);}
}
// surface of revolution about +Y at c; prof = [[r,y],…] bottom to top along the outside
export function lathe(ctx,c,prof,seg,opt={}){
  seg=roundSides(Math.max(...prof.map(p=>p[0])),seg);
  if(lodLevel(ctx)>1){const ix=lodLevel(ctx)>=4&&prof.length>4?lodPath({lod:3},prof.length):null;if(ix)prof=ix.map(i=>prof[i]);seg=lodSides(ctx,seg);}
  const ph=opt.phase||0,jit=opt.jitter||0;
  const rings=prof.map(([r,y])=>{const a=[];for(let i=0;i<seg;i++){const g=ph+i/seg*Math.PI*2,rr=r*(1+(jit?(ctx.random()-.5)*jit:0));a.push([c[0]+Math.cos(g)*rr,c[1]+y,c[2]+Math.sin(g)*rr]);}return a;});
  for(let k=0;k<prof.length-1;k++){
    const dr=prof[k+1][0]-prof[k][0],dy=prof[k+1][1]-prof[k][1];
    for(let i=0;i<seg;i++){
      const j=(i+1)%seg,g=ph+(i+.5)/seg*Math.PI*2,want=[Math.cos(g)*dy,-dr,Math.sin(g)*dy];
      if(prof[k][0]<1e-6)tri(ctx,rings[k][i],rings[k+1][j],rings[k+1][i],want);
      else if(prof[k+1][0]<1e-6)tri(ctx,rings[k][i],rings[k][j],rings[k+1][i],want);
      else q(ctx,rings[k][i],rings[k][j],rings[k+1][j],rings[k+1][i],want);
    }
  }
}
// a flat polygon (points in a plane) fanned from its centroid, facing want
export function poly(ctx,pts,want){
  // convex (every turn one way): fanned from a corner, n-2 triangles; else from the centroid
  const w=want;let sg=0,cv=true;for(let i=0;i<pts.length&&cv;i++){const d=dot(cross(sub(pts[(i+1)%pts.length],pts[i]),sub(pts[(i+2)%pts.length],pts[(i+1)%pts.length])),w);if(Math.abs(d)<1e-12)continue;if(!sg)sg=Math.sign(d);else if(Math.sign(d)!==sg)cv=false;}
  if(cv&&pts.length>3){for(let i=1;i<pts.length-1;i++)tri(ctx,pts[0],pts[i],pts[i+1],want);return;}
  const c=pts.reduce((a,p)=>add(a,mul(p,1/pts.length)),[0,0,0]);
  for(let i=0;i<pts.length;i++)tri(ctx,c,pts[i],pts[(i+1)%pts.length],want);
}
// a board roof from low edge p0 to high edge p1, `width` along the eave; turf: lumpy sod with a skirt and a grass fringe
export function roof(ctx,p0,p1,width,thick,opt={}){
  const S=sub(p1,p0),W=mul(norm(cross(S,[0,1,0])),width/2);let N=norm(cross(S,W));if(N[1]<0)N=mul(N,-1);
  obox(ctx,add(mul(add(p0,p1),.5),mul(N,thick/2)),mul(S,.5),mul(N,thick/2),W,{bottom:true});
  if(!opt.turf)return;
  const L=opt.lod||1,nu=L<=1?6:L<=2?4:1,nv=L<=1?8:L<=2?5:1,dep=opt.depth||.14,base=add(add(p0,mul(W,-1)),mul(N,thick));
  ctx.albedo(TEX.turf);ctx.color(opt.turfColor||'oklch(0.93 0.035 128)');ctx.roughness(.95);
  const H=[];for(let i=0;i<=nu;i++){H.push([]);for(let j=0;j<=nv;j++){const e=i===0||j===0||i===nu||j===nv;H[i].push(e?dep*.7:dep*(1+(L<=2?(ctx.random()-.5)*.9:0)));}}
  const pb=(i,j)=>add(add(base,mul(S,i/nu)),mul(W,2*j/nv)),pt=(i,j)=>add(pb(i,j),mul(N,H[i][j]));
  for(let i=0;i<nu;i++)for(let j=0;j<nv;j++)q(ctx,pt(i,j),pt(i+1,j),pt(i+1,j+1),pt(i,j+1),N);
  const Sn=norm(S),Wn=norm(W);
  for(let j=0;j<nv;j++){q(ctx,pt(0,j),pt(0,j+1),pb(0,j+1),pb(0,j),mul(Sn,-1));q(ctx,pt(nu,j),pt(nu,j+1),pb(nu,j+1),pb(nu,j),Sn);}
  for(let i=0;i<nu;i++){q(ctx,pt(i,0),pt(i+1,0),pb(i+1,0),pb(i,0),mul(Wn,-1));q(ctx,pt(i,nv),pt(i+1,nv),pb(i+1,nv),pb(i,nv),Wn);}
  if(L<=1){ // grass hanging over the low eave
    ctx.albedo(null);ctx.color('oklch(0.58 0.09 128)');
    const tufts=Math.round(width/.18);
    for(let k=0;k<tufts;k++){const f=(k+.5)/tufts,a=add(add(base,mul(W,2*f)),mul(N,dep*.6)),b=add(a,mul(W,.09/width)),tip=add(add(a,[0,-.12-ctx.random()*.1,0]),mul(Sn,-.06));tri(ctx,a,add(a,mul(Wn,.08)),tip,mul(Sn,-1));}
  }
}
// stacked fieldstone: a core and courses of irregular blocks proud of it (lod ≥ 3: the block alone)
export function stones(ctx,cx,y0,cz,w,h,d,opt={}){
  const L=opt.lod||1;ctx.albedo(opt.tex||TEX.stone);
  if(L>=3){ctx.color(opt.tint||'oklch(0.93 0.01 80)');box(ctx,cx,y0,cz,w,h,d);return;}
  ctx.color(opt.tint||'oklch(0.9 0.01 80)');box(ctx,cx,y0,cz,w-.08,h,d-.08);
  const ch=opt.course||.24,n=Math.max(1,Math.round(h/ch)),hh=h/n,skip=opt.skip||[];
  for(let k=0;k<n;k++){const y=y0+k*hh;
    for(const [sx,sz] of [[0,-1],[0,1],[-1,0],[1,0]]){
      if(skip.includes(`${sx},${sz}`))continue;
      const along=sx===0?w:d;let s=-along/2,first=true;
      while(s<along/2-.03){
        let bl=first&&k%2?.1+ctx.random()*.12:.22+ctx.random()*.26;first=false;bl=Math.min(bl,along/2-s);
        const m=s+bl/2,dep=.1+ctx.random()*.04,pro=ctx.random()*.025,bh=hh-.025;
        ctx.color(`oklch(${(.87+ctx.random()*.11).toFixed(3)} ${(.008+ctx.random()*.014).toFixed(3)} ${60+Math.floor(ctx.random()*60)})`);
        if(sx===0)box(ctx,cx+m,y+.0125,cz+sz*(d/2-dep/2+pro),bl-.03,bh,dep);
        else box(ctx,cx+sx*(w/2-dep/2+pro),y+.0125,cz+m,dep,bh,bl-.03);
        s+=bl;
      }
    }
  }
  if(opt.cap)box(ctx,cx,y0+h,cz,w+.04,.06,d+.04);
}
// a split stockfish hanging by its tail from `top`, flat face across yaw
export function fish(ctx,top,len,yaw=0){
  const r=yaw*Math.PI/180,U=[Math.cos(r),0,-Math.sin(r)],k=len/.42;
  const O=[[0,0],[.05,-.02],[.025,-.07],[.06,-.19],[.05,-.34],[0,-.42],[-.05,-.34],[-.06,-.19],[-.025,-.07],[-.05,-.02]];
  const pts=O.map(([u,v])=>add(add(top,mul(U,u*k)),[0,v*k,0]));poly(ctx,pts,cross(U,[0,1,0]));
}
export function ham(ctx,top,s=1){
  const c=[top[0],top[1]-.37*s,top[2]];
  lathe(ctx,c,[[0,0],[.08*s,.02*s],[.13*s,.12*s],[.12*s,.24*s],[.07*s,.32*s],[.03*s,.36*s],[0,.37*s]],7);
}
// a spoked wheel in the plane (e1, e2) about c; missing = spoke/rim indices left out
export function wheel(ctx,c,e1,e2,r,n,missing=[],lod=1){
  const pt=(a,rr)=>add(c,add(mul(e1,Math.sin(a)*rr),mul(e2,Math.cos(a)*rr))),segs=lod<=2?n*2:n;
  for(let i=0;i<segs;i++){if(missing.includes('r'+i))continue;beam(ctx,pt(i/segs*Math.PI*2,r),pt((i+1)/segs*Math.PI*2,r),.07,.08);}
  if(lod<=3)for(let i=0;i<n;i++){if(missing.includes(i))continue;beam(ctx,pt(i/n*Math.PI*2,.07),pt(i/n*Math.PI*2,r-.03),.035,.035);}
  const ax=norm(cross(e1,e2));cyl(ctx,add(c,mul(ax,-.09)),add(c,mul(ax,.09)),.08,.08,lod<=2?8:5);
}
