export const meta = { filter: "linear" };
export function texture(ctx) {
  const g=ctx.canvas(128,128);g.fillStyle="#92ae92";g.fillRect(0,0,128,128);
  const colors=["#759980","#a5bb97","#82a48d","#b1c59e","#87a78c"];
  for(let i=0;i<180;i++) {
    const x=ctx.random()*128,y=ctx.random()*128,r=2+ctx.random()*6;
    g.globalAlpha=0.35; g.fillStyle=colors[i%5];
    for(let u=-1;u<=1;u++) for(let v=-1;v<=1;v++) { const a=x+128*u,b=y+128*v;g.beginPath();g.moveTo(a-r,b);g.lineTo(a-r*0.2,b-r*0.8);g.lineTo(a+r,b-r*0.15);g.lineTo(a+r*0.4,b+r*0.7);g.lineTo(a-r*0.6,b+r*0.65);g.closePath();g.fill(); }
  }
  g.globalAlpha=0.35;
  for(let i=0;i<220;i++) { g.strokeStyle=colors[i%5];const x=ctx.random()*128,y=ctx.random()*128;g.beginPath();g.moveTo(x,y);g.lineTo(x+3.5,y-2);g.stroke(); }
  g.globalAlpha=1;
}
