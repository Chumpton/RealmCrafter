// Shared immutable placement contract. Y=24 is every finished indoor floor.
export const HOME = {
  floorY: 24, groundY: 23.55, root: { x: -3, y: 24, z: -3 },
  den: [[0,0],[5,0],[9.2,4.2],[6,6],[0,6]],
  wingOrigin: { x: 4.464466094067262, z: -0.5355339059327378 }, wingYaw: 45,
  board: { minU: 0, maxU: 5, minV: 0, maxV: 5 },
  spare: { minU: 0, maxU: 5, minV: 5, maxV: 9 },
  frontDoor: { x0:3.04, x1:4.14, z:0, height:2.4 },
  boardOpening: { u:0,v0:2.55,v1:4.15,height:2.5 },
  spareDoor: { u:0,v0:5.25,v1:6.45,height:2.4 },
  spawn: { x:0.2, y:24.04, z:0.1 },
  referencePlan: '/cdn/value.b23bf3bdb7f835e7a237df62c99aab3ef789a08faaa30af96890217d6794f492.png'
};
export function wing(u,v,y=0) { const c=Math.SQRT1_2; return { x: HOME.root.x+HOME.wingOrigin.x+(u+v)*c, y:HOME.floorY+y, z:HOME.root.z+HOME.wingOrigin.z+(v-u)*c }; }
export function plan(x,z,y=0) { return {x:x-3,y:24+y,z:z-3}; }
