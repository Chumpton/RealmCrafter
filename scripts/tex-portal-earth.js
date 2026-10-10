export const meta={filter:'linear'};
export function texture(ctx){
 const g=ctx.canvas(128,128);g.fillStyle='#8d8068';g.fillRect(0,0,128,128);
 for(let i=0;i<220;i++){
  const x=ctx.random()*128,y=ctx.random()*128,r=2+ctx.random()*13;
  g.fillStyle=i%2?'rgba(56,48,33,.06)':'rgba(203,185,145,.075)';
  for(const u of [-128,0,128])for(const v of [-128,0,128]){g.beginPath();g.ellipse(x+u,y+v,r,r*.7,0,0,Math.PI*2);g.fill();}
 }
 for(let i=0;i<650;i++){g.fillStyle=i%3?'rgba(57,46,30,.09)':'rgba(228,210,177,.16)';g.fillRect(ctx.random()*128,ctx.random()*128,.4+ctx.random()*.8,.4+ctx.random()*.5);}
}
