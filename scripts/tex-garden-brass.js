export const meta={filter:'linear'};
export function texture(ctx){
  const g=ctx.canvas(128,128);g.fillStyle='#b8a585';g.fillRect(0,0,128,128);
  for(let i=0;i<120;i++){g.fillStyle=i%4?'rgba(55,60,47,.055)':'rgba(255,238,185,.13)';g.fillRect(ctx.random()*128,ctx.random()*128,2+ctx.random()*7,.4+ctx.random()*2);}
}
