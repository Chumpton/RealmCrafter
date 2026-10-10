// Short living green leaves; the distance tree field is separate from this close lawn.
// Levels: 1 three blades (9 tris) · 2 two blades (6) · 3–4 three single-tri blades (3) · 5 two crossed tris.
export function geometry(ctx) {
  const lod=ctx.lod??1,h=Number(ctx.params.height??0.21);
  ctx.roughness(0.96);ctx.flat();
  const blades=lod===2?2:lod>=5?2:3;
  for(let i=0;i<3;i++) {
    const a=i*Math.PI*2/3+ctx.random()*0.6,dx=Math.cos(a),dz=Math.sin(a),hh=h*(0.7+ctx.random()*0.45),w=0.018+ctx.random()*0.009;
    if(i>=blades) continue;
    const x=dx*0.025,z=dz*0.025,bx=dx*hh*0.15,bz=dz*hh*0.15;
    if(lod>=3) {
      ctx.color("#86a965");ctx.sway(null);
      ctx.tri(x-dz*w,0,z+dx*w,x+dz*w,0,z-dx*w,x+bx*2,hh,z+bz*2);
      continue;
    }
    ctx.color("#729759");ctx.sway(null);
    ctx.quad(x-dz*w,0,z+dx*w,x+dz*w,0,z-dx*w,x+bx+dz*w*0.38,hh*0.66,z+bz-dx*w*0.38,x+bx-dz*w*0.38,hh*0.66,z+bz+dx*w*0.38);
    ctx.color("#9bbb70");ctx.sway(null);
    ctx.tri(x+bx-dz*w*0.38,hh*0.66,z+bz+dx*w*0.38,x+bx+dz*w*0.38,hh*0.66,z+bz-dx*w*0.38,x+bx*2,hh,z+bz*2);
  }
}
export function collider(){return null;}
