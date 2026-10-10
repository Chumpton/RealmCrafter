export const meta={filter:'linear'};
export function texture(ctx){
  const g=ctx.canvas(128,128);g.fillStyle='#e2e6c3';g.fillRect(0,0,128,128);
  for(let i=0;i<210;i++){g.strokeStyle=i%3?'rgba(255,255,218,.11)':'rgba(111,131,82,.08)';g.lineWidth=1+ctx.random()*3;const x=ctx.random()*128,y=ctx.random()*128;g.beginPath();g.moveTo(x,y);g.lineTo(x+8+ctx.random()*13,y-4-ctx.random()*7);g.stroke();}
}
