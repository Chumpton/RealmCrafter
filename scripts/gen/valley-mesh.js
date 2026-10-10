// Rings progress counter-clockwise in the XZ plane; reverse their side winding to face out.
export function ring(cx, cy, cz, rx, rz, count, phase=0, ripple=0) {
  const result=[];
  for(let i=0;i<count;i++) { const a=i*Math.PI*2/count+phase,r=1+Math.sin(a*3+phase)*ripple+Math.cos(a*5-phase)*ripple*0.4;result.push([cx+Math.cos(a)*rx*r,cy,cz+Math.sin(a)*rz*r]); }
  return result;
}
export function loft(ctx, lower, upper) {
  for(let i=0;i<lower.length;i++) { const j=(i+1)%lower.length;ctx.quad(...lower[j],...lower[i],...upper[i],...upper[j]); }
}
export function cap(ctx, points, up=true) {
  const c=[0,0,0];for(const p of points){c[0]+=p[0];c[1]+=p[1];c[2]+=p[2];}c[0]/=points.length;c[1]/=points.length;c[2]/=points.length;
  for(let i=0;i<points.length;i++){const j=(i+1)%points.length;if(up)ctx.tri(...c,...points[j],...points[i]);else ctx.tri(...c,...points[i],...points[j]);}
}
