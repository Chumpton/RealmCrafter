import { GARDEN as G } from '../../templates/home-garden.js';
import { prism, offsetPolygon } from './home-garden-kit.js';
function ribbons(points,w){
  const normals=[];
  for(let i=0;i<points.length-1;i++){const dx=points[i+1][0]-points[i][0],dz=points[i+1][1]-points[i][1],l=Math.hypot(dx,dz);normals.push([-dz/l,dx/l]);}
  const inner=points.map((p,i)=>{const a=normals[Math.max(0,i-1)],b=normals[Math.min(normals.length-1,i)],nx=a[0]+b[0],nz=a[1]+b[1],f=w/(nx*b[0]+nz*b[1]);return[p[0]+nx*f,p[1]+nz*f];});
  return points.slice(0,-1).map((a,i)=>[a,points[i+1],inner[i+1],inner[i]]);
}
const loc=p=>p.map(a=>[a[0]-G.rootPlan[0],a[1]-G.rootPlan[1]]);
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
function segment(p,a,b){return[mix(p[0],p[1],a),mix(p[0],p[1],b),mix(p[3],p[2],b),mix(p[3],p[2],a)];}
export function geometry(c){
  c.flat();c.albedo('scripts/tex-garden-limestone.js');c.roughness(.93);
  for(const run of G.parapetRuns){
    const strips=ribbons(run,G.parapetWidth),caps=ribbons(run,G.copingWidth);
    for(let j=0;j<strips.length;j++){
      const p=strips[j],len=Math.hypot(p[1][0]-p[0][0],p[1][1]-p[0][1]);
      c.color('#aba799');prism(c,loc(offsetPolygon(p,.022)),0,.495);
      for(let course=0;course<2;course++)for(let d=-.36*(course%2);d<len;d+=.72){
        const a=Math.max(0,d)/len,b=Math.min(len,d+.71)/len;if(b-a<.015)continue;
        c.color(G.stoneColors[(j+course+Math.floor(c.random()*5))%G.stoneColors.length]);prism(c,loc(segment(p,a,b)),.008+course*.24,.239+course*.24,.012);
      }
      for(let d=0;d<len;d+=.88){const a=d/len,b=Math.min(len,d+.87)/len;if(b-a<.015)continue;c.color(G.stoneColors[(j+Math.floor(c.random()*4))%G.stoneColors.length]);prism(c,loc(segment(caps[j],a,b)),.48,G.parapetHeight,.014);}
    }
  }
}
export function collider(c){for(const run of G.parapetRuns)for(const p of ribbons(run,G.copingWidth))prism(c,loc(p),0,G.parapetHeight);}
