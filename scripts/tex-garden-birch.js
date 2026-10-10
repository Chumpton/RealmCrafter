export const meta={filter:'linear'};
export function texture(ctx){
  const g=ctx.canvas(128,128);g.fillStyle='#e6e2d6';g.fillRect(0,0,128,128);
  for(let i=0;i<48;i++){const x=ctx.random()*128;g.fillStyle=i%2?'rgba(150,149,139,.075)':'rgba(255,254,239,.20)';g.fillRect(x,0,1+ctx.random()*5,128);}
  for(let i=0;i<74;i++){
    const x=ctx.random()*128,y=ctx.random()*128,w=1.4+ctx.random()*9,h=.5+ctx.random()*1.4;
    for(const dx of [-128,0,128]){g.fillStyle=i%7===0?'#696b61':'rgba(79,84,77,.56)';g.beginPath();g.moveTo(x+dx,y);g.lineTo(x+dx+w*.8,y-h*.4);g.lineTo(x+dx+w,y+h*.5);g.lineTo(x+dx+w*.15,y+h);g.closePath();g.fill();g.fillStyle='rgba(255,253,229,.62)';g.fillRect(x+dx,y+h,w*.8,.65);}
  }
  for(let i=0;i<5;i++){const x=ctx.random()*128,y=ctx.random()*128;g.strokeStyle='rgba(77,82,74,.51)';g.lineWidth=1.1;g.beginPath();g.ellipse(x,y,4+ctx.random()*3,1.9,0,Math.PI,Math.PI*2);g.stroke();}
}
