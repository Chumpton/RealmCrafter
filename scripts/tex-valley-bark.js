export const meta = { filter: "linear" };
export function texture(ctx) {
  const g=ctx.canvas(128,128); g.fillStyle="#8b8c78"; g.fillRect(0,0,128,128);
  for(let i=0;i<95;i++) {
    const x=ctx.random()*128,y=ctx.random()*128,h=8+ctx.random()*32;
    g.strokeStyle=i%3===0?"#b0ae8b":i%3===1?"#69786b":"#969a80"; g.lineWidth=0.6+ctx.random()*2;
    for(let v=-1;v<=1;v++) { g.beginPath();g.moveTo(x,y+v*128);g.lineTo(x+1,y+h*0.46+v*128);g.lineTo(x-0.6,y+h+v*128);g.stroke(); }
  }
}
