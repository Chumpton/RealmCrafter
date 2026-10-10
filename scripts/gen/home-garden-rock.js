import { GARDEN as G } from '../../templates/home-garden.js';
import { V, rockHull } from './home-garden-kit.js';
export function geometry(c){const {w=1.1,h=.42,d=.8}=c.params;c.flat();c.roughness(.96);c.albedo('scripts/tex-garden-limestone.js');c.color(G.stoneColors[Math.floor(c.random()*G.stoneColors.length)]);rockHull(c,V(0,0,0),w,h,d,[8,8,6,5,5,4][Math.min(5,Math.max(1,Math.floor(c.lod||1)))],true);}
export function collider(c){const {w=1.1,h=.42,d=.8}=c.params;rockHull(c,V(0,0,0),w*.92,h*.93,d*.92,6,true);}
