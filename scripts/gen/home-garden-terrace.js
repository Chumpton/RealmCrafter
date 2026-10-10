import { GARDEN as G } from '../../templates/home-garden.js';
import { prism, clipRect, area, offsetPolygon } from './home-garden-kit.js';
const local=p=>p.map(a=>[a[0]-G.rootPlan[0],a[1]-G.rootPlan[1]]);
export function geometry(c){
  const p=G.polygon,top=G.floorY-G.baseY;
  c.flat();c.roughness(.94);c.albedo('scripts/tex-garden-limestone.js');c.color('#ada99e');prism(c,local(offsetPolygon(p,.026)),-.06,top-.019);
  const minZ=Math.min(...p.map(a=>a[1])),maxX=Math.max(...p.map(a=>a[0]));let row=0;
  for(let z=minZ-.1;z<.01;z+=G.paving.row,row++){
    let col=0;
    for(let x=-G.paving.width+(row%2)*G.paving.width*.5;x<maxX+.01;x+=G.paving.width,col++){
      const t=clipRect(p,x+G.paving.joint*.5,z+G.paving.joint*.5,x+G.paving.width-G.paving.joint*.5,z+G.paving.row-G.paving.joint*.5);
      if(t.length<3||Math.abs(area(t))<.004)continue;
      c.color(G.stoneColors[(row*3+col+Math.floor(c.random()*3))%G.stoneColors.length]);
      prism(c,local(t),top-.103,top,G.paving.bevel);
    }
  }
  const inside=offsetPolygon(p,.17);
  for(let e=0;e<p.length;e++){
    const a=p[e],b=p[(e+1)%p.length],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),ia=inside[e],ib=inside[(e+1)%p.length];
    for(let course=0;course<2;course++){
      const lo=-.054+course*.2,hi=course===0?.143:top-.105;
      for(let s=-G.masonry.length*(course%2)*.5;s<len;s+=G.masonry.length){
        const t0=Math.max(0,s)/len,t1=Math.min(len,s+G.masonry.length-G.masonry.joint)/len;if(t1-t0<.012)continue;
        const q0=[a[0]+dx*t0,a[1]+dz*t0],q1=[a[0]+dx*t1,a[1]+dz*t1];
        const tile=[q0,q1,[ia[0]+(ib[0]-ia[0])*t1,ia[1]+(ib[1]-ia[1])*t1],[ia[0]+(ib[0]-ia[0])*t0,ia[1]+(ib[1]-ia[1])*t0]];
        c.color(G.stoneColors[Math.floor(c.random()*G.stoneColors.length)]);prism(c,local(tile),lo,hi,.01);
      }
    }
  }
}
export function collider(c){prism(c,local(G.polygon),-.06,G.floorY-G.baseY);}
