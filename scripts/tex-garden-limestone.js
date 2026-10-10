export const meta={filter:'linear'};
export function texture(ctx){
  const g=ctx.canvas(128,128);g.fillStyle='#d6d4ca';g.fillRect(0,0,128,128);
  for(let i=0;i<190;i++){
    const x=ctx.random()*128,y=ctx.random()*128,w=4+ctx.random()*24,h=2+ctx.random()*10;
    g.fillStyle=i%3===0?'rgba(241,237,217,.12)':'rgba(103,103,94,.045)';
    for(const dx of [-128,0,128])for(const dy of [-128,0,128]){g.beginPath();g.ellipse(x+dx,y+dy,w,h,-.25+ctx.random()*.5,0,Math.PI*2);g.fill();}
  }
  for(let i=0;i<420;i++){const x=ctx.random()*128,y=ctx.random()*128;g.fillStyle=i%4===0?'rgba(245,239,217,.19)':'rgba(72,75,69,.07)';g.fillRect(x,y,.5+ctx.random()*1.1,.4+ctx.random()*.75);}
  for(let i=0;i<9;i++){let x=ctx.random()*128,y=ctx.random()*128;g.strokeStyle='rgba(104,104,91,.10)';g.lineWidth=.65;g.beginPath();g.moveTo(x,y);for(let k=0;k<4;k++){x+=2+ctx.random()*4;y+=ctx.random()*3-1.5;g.lineTo(x,y);}g.stroke();}
}
