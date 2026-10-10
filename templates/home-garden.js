import { HOME, wing, plan } from '../scripts/lib/data/home.js';
const fromWing=(u,v)=>{ const p=wing(u,v); return [p.x-HOME.root.x,p.z-HOME.root.z]; };
export const GARDEN = {
  rootPlan:[3.5,-2.5], baseY:HOME.groundY, floorY:HOME.floorY,
  polygon:[[0,0],[5,0],[HOME.wingOrigin.x,HOME.wingOrigin.z],fromWing(5,0),fromWing(5,-2.4),fromWing(0,-2.4),[0,-2.4]],
  parapetRuns:[[[0,0],[0,-.6]],[[0,-1.8],[0,-2.4],fromWing(0,-2.4),fromWing(5,-2.4),fromWing(5,0)]],
  parapetHeight:.58, parapetWidth:.30, copingWidth:.33,
  stepRise:.15, stepTread:.30, stepWidth:1.20, steps:3,
  paving:{row:.53,width:.84,joint:.014,bevel:.011}, masonry:{course:.20,length:.76,joint:.010,bevel:.012},
  path:[[-3.9,-4.2],[-9,-4.5],[-13,-12],[-18,-22],[-16,-34],[-8,-50]], pathWidth:1.12,
  trees:[{id:'garden-birch-west',x:-8,z:6,height:6.7,spread:2.5,seed:11},{id:'garden-birch-path',x:-11,z:-5,height:7.25,spread:2.65,seed:29},{id:'garden-birch-east',x:15,z:1,height:6.3,spread:2.45,seed:43},{id:'garden-birch-northeast',x:16,z:-10,height:6.8,spread:2.5,seed:67}],
  rocks:[{id:'garden-rock-steps',x:-5.75,z:-5.9,w:1.1,h:.42,d:.8,seed:3},{id:'garden-rock-path',x:-10.3,z:-9.5,w:.8,h:.34,d:.65,seed:8},{id:'garden-rock-lakeslope',x:-14.3,z:-19.2,w:1.2,h:.51,d:.85,seed:12},{id:'garden-rock-east',x:9.7,z:-8.6,w:1.25,h:.46,d:.83,seed:15},{id:'garden-rock-back',x:13.8,z:4.7,w:.93,h:.38,d:.72,seed:18}],
  beds:[{id:'garden-meadow-steps',x:-5.3,z:-5.55,rx:1,rz:.45,flowers:8,tufts:23,seed:21},{id:'garden-meadow-west',x:-5,z:-2.8,rx:.8,rz:.45,flowers:6,tufts:20,seed:22},{id:'garden-meadow-path',x:-11.2,z:-9,rx:.42,rz:1.1,flowers:8,tufts:27,seed:23},{id:'garden-meadow-east',x:8.5,z:-6.7,rx:1.15,rz:.60,flowers:10,tufts:28,seed:24},{id:'garden-meadow-birch',x:13.9,z:3.3,rx:1.3,rz:.7,flowers:9,tufts:28,seed:25}],
  fernSites:[{id:'garden-fern-west',x:-3.58,z:.6,seed:31},{id:'garden-fern-corner',x:-3.6,z:2.6,seed:37}],
  seams:[[.37,-.25],[.38,-2.05],[1.48,-2.1],[2.78,-1.98],[4.13,-3.19],[5.59,-4.65]],
  lantern:{plan:[3.4,-.18],mount:1.5,width:.26,lightIntensity:1.0,lightDistance:3.8},
  stoneColors:['#eee8db','#e3ddd1','#f1ebdf','#ddd8cd','#e7e3d7','#d9d6cc'],
  leafColors:['#80a163','#93b176','#a7bd87','#739958','#83a968','#95b87e'],
  meadowColors:['#729152','#87a36a','#607e4d','#9ab377'],
  birch:{branches:8,twigs:3,leaves:52,trunkRadius:.12},
  pebbleCount:32
};
const base={tags:['home-garden'],material:{pbr:true,roughness:.91},castShadow:true,receiveShadow:true};
export const terrace={...base,tags:['home-garden','garden-terrace'],physics:'static',primitive:{kind:'scripted',script:'scripts/gen/home-garden-terrace.js',seed:7}};
export const parapet={...base,tags:['home-garden','garden-parapet'],physics:'static',primitive:{kind:'scripted',script:'scripts/gen/home-garden-parapet.js',seed:8}};
export const stairs={...base,tags:['home-garden','garden-stairs'],physics:'static',primitive:{kind:'scripted',script:'scripts/gen/home-garden-stairs.js',seed:13}};
export const birch={...base,tags:['home-garden','garden-tree'],physics:'static',primitive:{kind:'scripted',script:'scripts/gen/home-garden-birch.js',params:{height:6.7,spread:2.5},seed:11}};
export const rock={...base,tags:['home-garden','garden-rock'],physics:'static',primitive:{kind:'scripted',script:'scripts/gen/home-garden-rock.js',params:{w:1.1,h:.42,d:.8},seed:3}};
export const planting={...base,castShadow:false,tags:['home-garden','garden-planting'],physics:'none',primitive:{kind:'scripted',script:'scripts/gen/home-garden-planting.js',params:{kind:'meadow',rx:1,rz:.5,flowers:8,tufts:24},seed:21}};
export const pebbles={...base,tags:['home-garden','garden-pebbles'],physics:'none',primitive:{kind:'scripted',script:'scripts/gen/home-garden-pebbles.js',seed:51}};
export const lantern={...base,tags:['home-garden','garden-lantern'],physics:'none',primitive:{kind:'scripted',script:'scripts/gen/home-garden-lantern.js',seed:61}};
