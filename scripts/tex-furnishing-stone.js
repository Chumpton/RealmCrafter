export const meta={filter:'linear'};
export function texture(ctx){
  const g=ctx.canvas(128,128),kind=ctx.params.kind||'limestone';
  const pal={limestone:['#c6bca5','#8c8373','#eee2c5'],plaster:['#e2d4b8','#b5a78e','#f6e9ce'],soot:['#3b3630','#171b19','#645447']};
  const p=pal[kind]||pal.limestone;g.fillStyle=p[0];g.fillRect(0,0,128,128);
  for(let i=0;i<110;i++){
    const x=ctx.random()*128,y=ctx.random()*128,r=1+ctx.random()*11;
    g.globalAlpha=kind==='plaster'?.045:.075;g.fillStyle=i%2?p[1]:p[2];
    for(const dx of [-128,0,128])for(const dy of [-128,0,128]){g.beginPath();g.ellipse(x+dx,y+dy,r,r*.48,ctx.random()*.4,0,Math.PI*2);g.fill();}
  }
  for(let i=0;i<220;i++){g.globalAlpha=.11;g.fillStyle=i%3?p[1]:p[2];g.fillRect(ctx.random()*128,ctx.random()*128,.45+ctx.random()*.7,.5+ctx.random());}
  g.globalAlpha=1;
}
