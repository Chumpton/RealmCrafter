// Shared joinery emitter. A face's outward direction decides winding; UVs follow the grain.
export function mesh(ctx){
  const uvs=[];
  function autoUV(p,n,grain){
    if(grain==='z')return Math.abs(n[2])>.7?[p[0],p[1]]:[Math.abs(n[1])>.5?p[0]:p[1],p[2]];
    if(grain==='x')return Math.abs(n[0])>.7?[p[2],p[1]]:[Math.abs(n[1])>.5?p[2]:p[1],p[0]];
    return Math.abs(n[1])>.7?[p[0],p[2]]:Math.abs(n[0])>.7?[p[2],p[1]]:[p[0],p[1]];
  }
  function tri(a,b,c,n,uv){
    const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const q=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
    if(Math.abs(q[0])+Math.abs(q[1])+Math.abs(q[2])<1e-12)return;
    let v=[a,b,c],t=uv||v.map(p=>autoUV(p,n));
    if(q[0]*n[0]+q[1]*n[1]+q[2]*n[2]<0){v=[a,c,b];t=[t[0],t[2],t[1]];}
    ctx.tri(...v[0],...v[1],...v[2]); for(const p of t)uvs.push(...p);
  }
  function face(points,n,grain){for(let i=1;i<points.length-1;i++)tri(points[0],points[i],points[i+1],n,[autoUV(points[0],n,grain),autoUV(points[i],n,grain),autoUV(points[i+1],n,grain)]);}
  return {ctx,tri,face,uvs,finish:()=>({uvs})};
}
// Palette ratio of each species to the oak tile (tex-furnishing-wood / tex-furnishing-metal base colours, sRGB).
const ONE_TILE={walnut:[121/188,86/145,58/92],iron:[88/188,83/145,71/92]};
function mulHex(h,k){return '#'+[1,3,5].map((o,i)=>Math.round(Math.min(255,parseInt(h.slice(o,o+2),16)*k[i])).toString(16).padStart(2,'0')).join('');}
export function paint(m,kind,tint='#ffffff'){
  const c=m.ctx;c.emissive(null);c.metalness(0);c.roughness(.68);c.color(tint);
  const k=ONE_TILE[kind],t=k&&/^#[0-9a-f]{6}$/i.test(tint)?tint:null;
  if(t){ // walnut and dark iron ride the oak tile, tinted to their own palette: one texture group, one draw (round 12)
    c.albedo('scripts/tex-furnishing-wood.js?species=oak');c.color(mulHex(t,k));
    if(kind==='iron'){c.metalness(.6);c.roughness(.46);}else c.roughness(.49);
  }else if(kind==='oak'||kind==='walnut'||kind==='char'){
    c.albedo('scripts/tex-furnishing-wood.js?species='+kind);c.roughness(kind==='char'?.98:.49);
  }else if(['flax','cream','moss','oat','teal'].includes(kind)){
    c.albedo('scripts/tex-furnishing-weave.js?tone='+kind);c.roughness(.96);
  }else if(kind==='brass'||kind==='iron'){
    c.albedo('scripts/tex-furnishing-metal.js?finish='+(kind==='iron'?'dark':'brass'));c.metalness(kind==='brass'?.72:.6);c.roughness(kind==='brass'?.34:.46);
  }else if(['limestone','plaster','soot'].includes(kind)){
    c.albedo('scripts/tex-furnishing-stone.js?kind='+kind);c.roughness(.94);
  }else {c.albedo(null);c.color(kind);}
}
export function solid(m,x,y,z,w,h,d){
  const x0=x-w/2,x1=x+w/2,y1=y+h,z0=z-d/2,z1=z+d/2;
  m.face([[x0,y,z0],[x1,y,z0],[x1,y1,z0],[x0,y1,z0]],[0,0,-1]);
  m.face([[x0,y,z1],[x1,y,z1],[x1,y1,z1],[x0,y1,z1]],[0,0,1]);
  m.face([[x0,y,z0],[x0,y,z1],[x0,y1,z1],[x0,y1,z0]],[-1,0,0]);
  m.face([[x1,y,z0],[x1,y,z1],[x1,y1,z1],[x1,y1,z0]],[1,0,0]);
  m.face([[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]],[0,1,0]);
  m.face([[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1]],[0,-1,0]);
}
function rect(w,d,b){return[[-w/2+b,-d/2],[w/2-b,-d/2],[w/2,-d/2+b],[w/2,d/2-b],[w/2-b,d/2],[-w/2+b,d/2],[-w/2,d/2-b],[-w/2,-d/2+b]];}
export function bevel(m,x,y,z,w,h,d,b=.009,grain='y'){
  b=Math.min(b,h*.42,w*.2,d*.2);
  const rings=[{y,w:w-b*2,d:d-b*2,b:b*.45},{y:y+b,w,d,b:b*1.6},{y:y+h-b,w,d,b:b*1.6},{y:y+h,w:w-b*2,d:d-b*2,b:b*.45}].map(r=>rect(r.w,r.d,r.b).map(p=>[x+p[0],r.y,z+p[1]]));
  for(let j=0;j<3;j++)for(let i=0;i<8;i++){
    const k=(i+1)%8,a=rings[j][i],b0=rings[j][k],c=rings[j+1][k],d0=rings[j+1][i];
    const nx=(a[0]+b0[0]+c[0]+d0[0])/4-x,nz=(a[2]+b0[2]+c[2]+d0[2])/4-z;
    const n=[nx,j===0?-.2:j===2?.2:0,nz];m.face([a,b0,c,d0],n,grain);
  }
  m.face(rings[0],[0,-1,0],grain);m.face(rings[3],[0,1,0],grain);
}
export function lathe(m,profile,n=24,x=0,z=0,opts={}){
  const rz=opts.zScale||1,rx=opts.xScale||1;
  for(let j=0;j<profile.length-1;j++){
    const [y0,r0]=profile[j],[y1,r1]=profile[j+1];
    for(let i=0;i<n;i++){
      const a=i*Math.PI*2/n,b=(i+1)*Math.PI*2/n,t=(a+b)/2;
      const v=[[x+Math.cos(a)*r0*rx,y0,z+Math.sin(a)*r0*rz],[x+Math.cos(b)*r0*rx,y0,z+Math.sin(b)*r0*rz],[x+Math.cos(b)*r1*rx,y1,z+Math.sin(b)*r1*rz],[x+Math.cos(a)*r1*rx,y1,z+Math.sin(a)*r1*rz]];
      const normal=[(y1-y0)*Math.cos(t)/rx,r0-r1,(y1-y0)*Math.sin(t)/rz];
      const uv=opts.planar?v.map(p=>[p[0],p[2]]):[[a*Math.max(r0,r1),y0],[b*Math.max(r0,r1),y0],[b*Math.max(r0,r1),y1],[a*Math.max(r0,r1),y1]];
      m.tri(v[0],v[1],v[2],normal,[uv[0],uv[1],uv[2]]);m.tri(v[0],v[2],v[3],normal,[uv[0],uv[2],uv[3]]);
    }
  }
  if(opts.caps!==false){
    for(const end of [0,profile.length-1]){
      const [y,r]=profile[end],normal=[0,end===0?-1:1,0];
      for(let i=0;i<n;i++){const a=i*Math.PI*2/n,b=(i+1)*Math.PI*2/n;m.face([[x,y,z],[x+Math.cos(a)*r*rx,y,z+Math.sin(a)*r*rz],[x+Math.cos(b)*r*rx,y,z+Math.sin(b)*r*rz]],normal);}
    }
  }
}
export function beam(m,a,b,profile,n=10){
  const d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],len=Math.sqrt(d[0]*d[0]+d[1]*d[1]+d[2]*d[2]);
  const t=d.map(v=>v/len),up=Math.abs(t[1])>.92?[1,0,0]:[0,1,0];
  let e=[t[1]*up[2]-t[2]*up[1],t[2]*up[0]-t[0]*up[2],t[0]*up[1]-t[1]*up[0]];const el=Math.sqrt(e[0]*e[0]+e[1]*e[1]+e[2]*e[2]);e=e.map(v=>v/el);
  const f=[t[1]*e[2]-t[2]*e[1],t[2]*e[0]-t[0]*e[2],t[0]*e[1]-t[1]*e[0]];
  const rings=profile.map(([u,r])=>Array.from({length:n},(_,i)=>{const q=i*Math.PI*2/n;return a.map((v,k)=>v+d[k]*u+r*(e[k]*Math.cos(q)+f[k]*Math.sin(q)));}));
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){
    const k=(i+1)%n,mid=(i+.5)*Math.PI*2/n,dr=profile[j+1][1]-profile[j][1],dy=(profile[j+1][0]-profile[j][0])*len;
    const normal=e.map((v,k)=>dy*(v*Math.cos(mid)+f[k]*Math.sin(mid))-dr*t[k]);
    const uv=[[i/n*.24,profile[j][0]*len],[(i+1)/n*.24,profile[j][0]*len],[(i+1)/n*.24,profile[j+1][0]*len],[i/n*.24,profile[j+1][0]*len]];
    m.tri(rings[j][i],rings[j][k],rings[j+1][k],normal,[uv[0],uv[1],uv[2]]);m.tri(rings[j][i],rings[j+1][k],rings[j+1][i],normal,[uv[0],uv[2],uv[3]]);
  }
  m.face(rings[0],t.map(v=>-v));m.face(rings[rings.length-1],t);
}
export function rod(m,a,b,r,n=8){beam(m,a,b,[[0,r],[1,r]],n);}
export function plankedDisc(m,r,y,n=64,grain='oak'){
  const circle=Array.from({length:n},(_,i)=>[Math.cos(i*Math.PI*2/n)*r,Math.sin(i*Math.PI*2/n)*r]);
  function clip(poly,x,keepRight){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ia=keepRight?a[0]>=x:a[0]<=x,ib=keepRight?b[0]>=x:b[0]<=x;if(ia)out.push(a);if(ia!==ib){const t=(x-a[0])/(b[0]-a[0]);out.push([x,a[1]+(b[1]-a[1])*t]);}}return out;}
  const cuts=[-r,-r*.61,-r*.2,r*.22,r*.62,r];
  for(let i=0;i<cuts.length-1;i++){
    const poly=clip(clip(circle,cuts[i]+(i?.0006:0),true),cuts[i+1]-(i<4?.0006:0),false);
    paint(m,grain,['#f8f2e5','#fff8e9','#f8edda','#ffffff','#f8f1e3'][i]);m.face(poly.map(p=>[p[0],y,p[1]]),[0,1,0],'z');
  }
}
export function cloth(m,width,sections,tone='moss'){
  paint(m,tone);m.ctx.smooth();
  const count=12,rows=sections.map(([z,y],j)=>Array.from({length:count+1},(_,i)=>{const x=(i/count-.5)*width;return [x,y+Math.sin(i*1.4+j*.6)*.0028*Math.sin(Math.PI*i/count),z+Math.sin(i*1.8)*.002];}));
  for(let j=0;j<rows.length-1;j++)for(let i=0;i<count;i++){
    const p=[rows[j][i],rows[j][i+1],rows[j+1][i+1],rows[j+1][i]];
    m.face(p,[0,1,1]);m.face(p.map(v=>[v[0],v[1]-.009,v[2]]),[0,-1,-1]);
  }
  for(const i of [0,count])for(let j=0;j<rows.length-1;j++){const a=rows[j][i],b=rows[j+1][i];m.face([a,b,[b[0],b[1]-.009,b[2]],[a[0],a[1]-.009,a[2]]],[i===0?-1:1,0,0]);}
  for(const j of [0,rows.length-1])for(let i=0;i<count;i++){const a=rows[j][i],b=rows[j][i+1];m.face([a,b,[b[0],b[1]-.009,b[2]],[a[0],a[1]-.009,a[2]]],[0,0,j===0?-1:1]);}
  m.ctx.flat();
}

// Many pieces into one mesh: a ctx stand-in that moves every tri by the current piece's x/y/z/yaw before it reaches the real ctx.
// at(x,y,z,yawDeg) sets the piece; stamp(m,n0) writes uv = (cos yaw, sin yaw)·(1+y) on the piece's verts for material-den-sway merged.
export function placed(ctx){
  let c=1,s=0,ox=0,oy=0,oz=0;
  const w={flat:()=>ctx.flat(),smooth:()=>ctx.smooth(),albedo:(v)=>ctx.albedo(v),emissive:(...v)=>ctx.emissive(...v),color:(v)=>ctx.color(v),roughness:(v)=>ctx.roughness(v),metalness:(v)=>ctx.metalness(v),
    tri:(...a)=>{for(let i=0;i<9;i+=3){const x=a[i],z=a[i+2];a[i]=ox+x*c+z*s;a[i+1]+=oy;a[i+2]=oz-x*s+z*c;}ctx.tri(...a);}};
  return {w,at(x,y,z,yaw){const r=(yaw||0)*Math.PI/180;c=Math.cos(r);s=Math.sin(r);ox=x;oy=y;oz=z;},
    stamp(m,n0){const k=1+oy;for(let i=n0;i<m.uvs.length;i+=2){m.uvs[i]=c*k;m.uvs[i+1]=s*k;}}};
}
