import { V, tube, prism, rect, face } from './home-garden-kit.js';
export function geometry(c){
  c.flat();c.albedo('scripts/tex-garden-brass.js');c.color('#79623e');c.roughness(.51);c.metalness(.62);
  prism(c,rect(-.048,.075,.048,.105),-.15,.24,.012);
  tube(c,[V(0,.20,.08),V(0,.29,.035),V(0,.32,-.09),V(0,.28,-.18),V(0,.24,-.18)],[.014,.013,.012,.012,.011],6);
  prism(c,rect(-.105,-.28,.105,-.08),-.185,-.14,.014);
  prism(c,rect(-.112,-.287,.112,-.073),.16,.193,.011);
  const bottom=[V(-.13,.195,-.31),V(.13,.195,-.31),V(.13,.195,-.05),V(-.13,.195,-.05)],top=V(0,.285,-.18);
  for(let i=0;i<4;i++)face(c,[bottom[i],bottom[(i+1)%4],top],V(bottom[i].x,.5,bottom[i].z+.18));
  tube(c,[V(0,.268,-.18),V(0,.31,-.18)],[.021,.007],6);
  for(const x of [-.085,.085])for(const z of [-.263,-.097])tube(c,[V(x,-.14,z),V(x,.17,z)],[.012,.010],5);
  c.albedo(null);c.metalness(0);c.roughness(.7);c.color('#ebd4a0');tube(c,[V(0,-.139,-.18),V(0,-.039,-.18)],[.031,.029],8);
  c.color('#3d3122');tube(c,[V(0,-.04,-.18),V(0,-.021,-.18)],[.004,.003],4);
  c.color('#ffd06c');c.emissive(2.9,1.67,.42);
  tube(c,[V(0,-.025,-.18),V(.007,.009,-.18),V(.005,.055,-.18),V(-.007,.112,-.18)],[.008,.027,.017,.0008],7);
  c.color('#fff3c8');c.emissive(3.4,2.55,1.15);tube(c,[V(0,-.022,-.18),V(.003,.01,-.18),V(.003,.061,-.18)],[.007,.012,.0004],6);
  c.emissive(null);c.roughness(.2);c.color('#efd4a0',.13);
  const panes=[[V(-.075,-.132,-.265),V(.075,-.132,-.265),V(.075,.155,-.265),V(-.075,.155,-.265)],[V(-.086,-.132,-.25),V(-.086,-.132,-.105),V(-.086,.155,-.105),V(-.086,.155,-.25)],[V(.086,-.132,-.105),V(.086,-.132,-.25),V(.086,.155,-.25),V(.086,.155,-.105)]];
  for(let i=0;i<panes.length;i++)face(c,panes[i],i===0?V(0,0,-1):V(i===1?-1:1,0,0));
}
export function collider(){return null;}
