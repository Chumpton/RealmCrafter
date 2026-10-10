import { GARDEN as G } from '../../templates/home-garden.js';
import { prism, rect } from './home-garden-kit.js';
export function geometry(c){
  const {stepTread:t,stepRise:r,stepWidth:w}=G;
  c.flat();c.albedo('scripts/tex-garden-limestone.js');c.roughness(.94);
  for(let i=0;i<G.steps;i++){
    const x0=-(i+1)*t,x1=-i*t,top=(G.steps-i-1)*r;
    c.color('#b7b2a4');prism(c,rect(x0,-w*.5,x1,w*.5),-.135,top-.008);
    for(let k=0;k<2;k++){const z0=-w*.5+k*w*.5+.004,z1=z0+w*.5-.008;c.color(G.stoneColors[(i*2+k)%G.stoneColors.length]);prism(c,rect(x0,z0,x1,z1),top-.115,top,.009);}
  }
}
export function collider(c){for(let i=0;i<G.steps;i++)prism(c,rect(-(i+1)*G.stepTread,-G.stepWidth*.5,-i*G.stepTread,G.stepWidth*.5),-.14,(G.steps-i-1)*G.stepRise);}
