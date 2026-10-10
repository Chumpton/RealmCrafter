import { add, sub, scale, dot, cross, normalize } from 'builtin/vec3';
export const V=(x,y,z)=>({x,y,z});
export function face(c,points,n) {
  let p=points;
  if(dot(cross(sub(p[1],p[0]),sub(p[2],p[0])),n)<0) p=p.slice().reverse();
  if(p.length===3)c.tri(p[0].x,p[0].y,p[0].z,p[1].x,p[1].y,p[1].z,p[2].x,p[2].y,p[2].z);
  else if(p.length===4)c.quad(p[0].x,p[0].y,p[0].z,p[1].x,p[1].y,p[1].z,p[2].x,p[2].y,p[2].z,p[3].x,p[3].y,p[3].z);
}
export function area(p){let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i][0]*q[1]-q[0]*p[i][1];}return a*.5;}
function turn(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
export function triangulate(poly){
  const ids=poly.map((p,i)=>i),tris=[],s=area(poly)>=0?1:-1;
  for(let guard=0;ids.length>3&&guard<100;guard++){
    let found=false;
    for(let i=0;i<ids.length;i++){
      const a=ids[(i+ids.length-1)%ids.length],b=ids[i],d=ids[(i+1)%ids.length];
      if(turn(poly[a],poly[b],poly[d])*s<=1e-9)continue;
      let inside=false;
      for(const k of ids)if(k!==a&&k!==b&&k!==d&&turn(poly[a],poly[b],poly[k])*s>=-1e-8&&turn(poly[b],poly[d],poly[k])*s>=-1e-8&&turn(poly[d],poly[a],poly[k])*s>=-1e-8){inside=true;break;}
      if(!inside){tris.push([a,b,d]);ids.splice(i,1);found=true;break;}
    }
    if(!found)break;
  }
  if(ids.length===3)tris.push(ids.slice());
  return tris;
}
export function flatPoly(c,p,y,up=1){for(const t of triangulate(p))face(c,t.map(i=>V(p[i][0],y,p[i][1])),V(0,up,0));}
export function inset(p,d){
  let x=0,z=0;for(const a of p){x+=a[0];z+=a[1];}x/=p.length;z/=p.length;
  return p.map(a=>{const l=Math.hypot(x-a[0],z-a[1]);const t=l>0?Math.min(.35,d/l):0;return[a[0]+(x-a[0])*t,a[1]+(z-a[1])*t];});
}
export function offsetPolygon(p,d){
  const sign=area(p)>=0?1:-1;
  const normals=p.map((a,i)=>{const b=p[(i+1)%p.length],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz);return[-dz/l*sign,dx/l*sign];});
  return p.map((a,i)=>{const n=normals[(i+p.length-1)%p.length],m=normals[i],x=n[0]+m[0],z=n[1]+m[1],den=x*m[0]+z*m[1],f=Math.abs(den)>.0001?d/den:0;return[a[0]+x*f,a[1]+z*f];});
}
export function prism(c,p,lo,hi,bevel=0){
  if(p.length<3||Math.abs(area(p))<.00001)return;
  const rings=bevel>0?[{p:inset(p,bevel*.25),y:lo},{p,y:hi-bevel},{p:inset(p,bevel),y:hi}]:[{p,y:lo},{p,y:hi}];
  const s=area(p)>=0?1:-1;
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<p.length;i++){
    const k=(i+1)%p.length,a=rings[j],b=rings[j+1];
    face(c,[V(a.p[i][0],a.y,a.p[i][1]),V(a.p[k][0],a.y,a.p[k][1]),V(b.p[k][0],b.y,b.p[k][1]),V(b.p[i][0],b.y,b.p[i][1])],V((p[k][1]-p[i][1])*s,0,(p[i][0]-p[k][0])*s));
  }
  flatPoly(c,rings[0].p,lo,-1);flatPoly(c,rings[rings.length-1].p,hi,1);
}
export function rect(x0,z0,x1,z1){return[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];}
export function clipRect(poly,x0,z0,x1,z1){
  let p=poly.map(v=>v.slice());
  for(const edge of [[0,x0,1],[0,x1,-1],[1,z0,1],[1,z1,-1]]){
    const out=[];if(!p.length)return out;
    for(let i=0;i<p.length;i++){
      const a=p[i],b=p[(i+1)%p.length],da=(a[edge[0]]-edge[1])*edge[2],db=(b[edge[0]]-edge[1])*edge[2];
      if(da>=-1e-8)out.push(a);
      if((da>=0)!==(db>=0)){const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
    }
    p=out;
  }
  return p.filter((a,i)=>Math.hypot(a[0]-p[(i+p.length-1)%p.length][0],a[1]-p[(i+p.length-1)%p.length][1])>.00001);
}
export function tube(c,points,radii,sides=6){
  const rings=[];
  for(let i=0;i<points.length;i++){
    const axis=normalize(sub(points[Math.min(i+1,points.length-1)],points[Math.max(0,i-1)]));
    const u=normalize(cross(axis,Math.abs(axis.y)<.85?V(0,1,0):V(1,0,0))),v=cross(axis,u),ring=[];
    for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2;ring.push(add(points[i],add(scale(u,Math.cos(a)*radii[i]),scale(v,Math.sin(a)*radii[i]))));}
    rings.push(ring);
  }
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<sides;i++){
    const k=(i+1)%sides,p=[rings[j][i],rings[j][k],rings[j+1][k],rings[j+1][i]];
    const mid=scale(add(points[j],points[j+1]),.5),f=scale(add(add(p[0],p[1]),add(p[2],p[3])),.25);
    face(c,p,sub(f,mid));
  }
  for(let i=1;i<sides-1;i++){face(c,[rings[0][0],rings[0][i],rings[0][i+1]],sub(points[0],points[1]));const j=rings.length-1;face(c,[rings[j][0],rings[j][i],rings[j][i+1]],sub(points[j],points[j-1]));}
}
export function leaf(c,center,direction,length,width,roll=0){
  const a=normalize(direction),b=normalize(cross(a,Math.abs(a.y)<.9?V(0,1,0):V(1,0,0)));
  const n=normalize(cross(b,a)),w=add(scale(b,Math.cos(roll)),scale(n,Math.sin(roll))),normal=normalize(cross(w,a));
  const tip=add(center,scale(a,length*.5)),base=add(center,scale(a,-length*.5));
  const left=add(center,scale(w,width*.5)),right=add(center,scale(w,-width*.5)),rib=add(center,scale(normal,width*.12));
  for(const p of [[base,left,rib],[left,tip,rib],[tip,right,rib],[right,base,rib]])face(c,p,normal);
}
export function rockHull(c,center,w,h,d,n=7,ground=false){
  const rings=[[],[],[]];
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2,j=.84+c.random()*.23,x=Math.cos(a)*w*.5*j,z=Math.sin(a)*d*.5*j;
    const g=ground?c.groundY(center.x+x,center.z+z):center.y;
    rings[0].push(V(center.x+x*.8,g-.065,center.z+z*.8));
    rings[1].push(V(center.x+x,g+h*(.35+c.random()*.12),center.z+z));
    rings[2].push(V(center.x+x*.48,g+h*(.84+c.random()*.16),center.z+z*.48));
  }
  for(let r=0;r<2;r++)for(let i=0;i<n;i++){const j=(i+1)%n;face(c,[rings[r][i],rings[r][j],rings[r+1][j],rings[r+1][i]],V(rings[r][i].x-center.x,.1,rings[r][i].z-center.z));}
  let y=0;for(const p of rings[2])y+=p.y;y/=n;const top=V(center.x,y,center.z);
  for(let i=0;i<n;i++){face(c,[rings[2][i],rings[2][(i+1)%n],top],V(0,1,0));if(i>0&&i<n-1)face(c,[rings[0][0],rings[0][i],rings[0][i+1]],V(0,-1,0));}
}
