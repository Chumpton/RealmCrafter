export const meta={filter:'linear'};
export function texture(ctx){
  const g=ctx.canvas(128,128),dark=ctx.params.finish==='dark';
  g.fillStyle=dark?'#585347':'#d3ad64';g.fillRect(0,0,128,128);
  for(let i=0;i<150;i++){
    g.globalAlpha=.045+ctx.random()*.04;g.fillStyle=i%2?(dark?'#b1a483':'#f5dfa0'):(dark?'#252d29':'#80663b');
    g.fillRect(0,ctx.random()*128,128,.3+ctx.random()*.45);
  }
  g.globalAlpha=1;
}
