import { GARDEN as G } from '../../templates/home-garden.js';
import { V, tube, face } from './home-garden-kit.js';
import { add, scale, cross, normalize } from 'builtin/vec3';
// A folded pointed leaf costs two triangles, so whole sprays stay cheap.
function birchLeaf(c,center,direction,length,width,roll){
  const a=normalize(direction),b=normalize(cross(a,V(0,1,0))),n=normalize(cross(b,a));
  const w=add(scale(b,Math.cos(roll)),scale(n,Math.sin(roll))),normal=normalize(cross(w,a));
  const rib=add(center,scale(normal,width*.08)),tip=add(rib,scale(a,length*.52)),base=add(rib,scale(a,-length*.48));
  const left=add(center,scale(w,width*.5)),right=add(center,scale(w,-width*.5));
  face(c,[base,left,tip],normal);face(c,[tip,right,base],normal);
}
function trunk(h){return[V(0,-.09,0),V(.035,h*.17,-.018),V(-.028,h*.37,.04),V(.085,h*.57,.035),V(.16,h*.77,-.03),V(.23,h*.95,.08),V(.31,h,0)];}
function branchData(c,h,s){const result=[];for(let i=0;i<G.birch.branches;i++){const a=i*2.39996323+.22*c.random(),y=h*(.31+i*.071),len=s*(.69+c.random()*.28)*(1-i*.045),root=V(.02+i*.02,y,.02);result.push({a,len,root,end:V(root.x+Math.cos(a)*len,Math.min(h*.96,y+h*(.19+c.random()*.07)),root.z+Math.sin(a)*len)});}return result;}
// Far crown: one lumpy ellipsoid in the leaf colours (apex, rings, apex).
function crownBlob(c,center,rx,ry,rz,sides,rings){
  const lat=[];for(let r=1;r<=rings;r++){const t=r/(rings+1),phi=Math.PI*t,ring=[];for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2+r*.4,j=.86+c.random()*.26;ring.push(V(center.x+Math.cos(a)*Math.sin(phi)*rx*j,center.y+Math.cos(phi)*ry,center.z+Math.sin(a)*Math.sin(phi)*rz*j));}lat.push(ring);}
  const top=V(center.x+.08,center.y+ry,center.z),bot=V(center.x,center.y-ry*.85,center.z),out=p=>V(p.x-center.x,p.y-center.y,p.z-center.z);
  let k=0;const col=()=>c.color(G.leafColors[(k++)%G.leafColors.length]);
  for(let i=0;i<sides;i++){const j=(i+1)%sides;col();face(c,[top,lat[0][i],lat[0][j]],out(add(lat[0][i],lat[0][j])));}
  for(let r=0;r<rings-1;r++)for(let i=0;i<sides;i++){const j=(i+1)%sides,p=[lat[r][i],lat[r][j],lat[r+1][j],lat[r+1][i]];col();face(c,p,out(scale(add(add(p[0],p[1]),add(p[2],p[3])),.25)));}
  const L=lat[rings-1];for(let i=0;i<sides;i++){const j=(i+1)%sides;col();face(c,[bot,L[j],L[i]],out(add(L[i],L[j])));}
}
// Per level: ring sides and how many leaf cards of each spray are drawn (random draws stay identical so near levels share their layout).
const LOD={1:{trunk:8,root:5,branch:6,twig:4,leaves:52,leader:156,leafScale:1},2:{trunk:8,root:4,branch:6,twig:3,leaves:34,leader:100,leafScale:1.15},3:{trunk:6,root:3,branch:4,twig:0,leaves:14,leader:50,leafScale:1.45}};
export function geometry(c){
  const h=c.params.height??6.7,s=c.params.spread??2.5,lod=c.lod??1;
  c.smooth();c.albedo('scripts/tex-garden-birch.js');c.color('#f4f0e5');c.roughness(.93);
  const t=trunk(h);
  if(lod>=4){
    if(lod===4)tube(c,[t[0],t[2],t[4],t[6]],[.155,.10,.048,.005],5);else tube(c,[t[0],t[3],t[5]],[.155,.079,.022],3);
    c.flat();c.albedo('scripts/tex-garden-leaf.js');c.roughness(.87);
    crownBlob(c,V(.22,h*.71,0),s*.86,h*.31,s*.86,lod===4?8:6,lod===4?3:2);
    return;
  }
  const L=LOD[lod]??LOD[1];
  tube(c,t,[.155,.116,.10,.079,.048,.022,.005],L.trunk);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const p=V(Math.cos(a)*.30,c.groundY(Math.cos(a)*.30,Math.sin(a)*.30)-.012,Math.sin(a)*.30);tube(c,[p,V(Math.cos(a)*.085,.16,Math.sin(a)*.085),V(0,.34,0)],[.031,.065,.084],L.root);}
  const branches=branchData(c,h,s),twigs=[];
  for(let i=0;i<branches.length;i++){
    const b=branches[i],mid=V(b.root.x+(b.end.x-b.root.x)*.42,b.root.y+h*.16,b.root.z+(b.end.z-b.root.z)*.42);
    c.color('#efeee2');tube(c,[b.root,mid,b.end],[.041*(1-i*.035),.025,.007],L.branch);
    for(let j=0;j<G.birch.twigs;j++){
      const k=.39+j*.255,a=b.a+(j-1)*.68,root=V(b.root.x+(b.end.x-b.root.x)*k,b.root.y+(b.end.y-b.root.y)*k+.08,b.root.z+(b.end.z-b.root.z)*k);
      const length=.54+c.random()*.37,end=V(root.x+Math.cos(a)*length,root.y-.12-c.random()*.25,root.z+Math.sin(a)*length),bend=V(root.x+(end.x-root.x)*.48,root.y+.10,root.z+(end.z-root.z)*.48);
      if(L.twig){c.color('#827e61');tube(c,[root,bend,end],[.010,.007,.002],L.twig);}twigs.push({root,bend,end,a});
    }
  }
  c.flat();c.albedo('scripts/tex-garden-leaf.js');c.roughness(.87);
  const ls=L.leafScale;
  for(const twig of twigs)for(let i=0;i<G.birch.leaves;i++){
    // A patchy, drooping spray around each fine twig; never a closed canopy hull.
    const t0=c.random(),phase=c.random()*Math.PI*2,r=Math.sqrt(c.random());
    const along=(t0-.5)*.90,side=Math.cos(phase)*r*.39,up=Math.sin(phase)*r*.33;
    const mx=twig.root.x+(twig.end.x-twig.root.x)*.62,mz=twig.root.z+(twig.end.z-twig.root.z)*.62;
    const p=V(mx+Math.cos(twig.a)*along-Math.sin(twig.a)*side,twig.root.y+(twig.end.y-twig.root.y)*.62+up-t0*.06,mz+Math.sin(twig.a)*along+Math.cos(twig.a)*side);
    const a=twig.a+(c.random()-.5)*3.5;
    const col=G.leafColors[Math.floor(c.random()*G.leafColors.length)];
    const dir=V(Math.cos(a),-.55-c.random()*1.5,Math.sin(a)),len=.21+c.random()*.11,wid=.11+c.random()*.055,roll=-1.15+c.random()*2.3;
    if(i<L.leaves){c.color(col);birchLeaf(c,p,dir,len*ls,wid*ls,roll);}
  }
  // Upright, uneven leader sprays join the crown, leaving sky between branches.
  const every=156/L.leader;
  for(let i=0;i<156;i++){
    const y=h*(.70+c.random()*.31),a=i*2.39996323,r=(h-y)*.39+.08+c.random()*.27;
    const dir=V(Math.cos(a),-.55-c.random(),Math.sin(a)),roll=-1.1+c.random()*2.2;
    if(Math.floor(i/every)!==Math.floor((i+1)/every)||L.leader===156){c.color(G.leafColors[i%G.leafColors.length]);birchLeaf(c,V(.2+Math.cos(a)*r,y,Math.sin(a)*r),dir,.24*ls,.13*ls,roll);}
  }
}
export function collider(c){const h=c.params.height??6.7;tube(c,trunk(h).slice(0,4),[.15,.116,.1,.08],6);}
