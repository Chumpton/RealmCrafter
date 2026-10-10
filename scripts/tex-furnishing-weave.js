// Flax warp and weft, deliberately unpatterned. Texture scale is shared across the whole set.
export const meta={filter:'linear'};
export function texture(ctx){
  const g=ctx.canvas(128,128),type=ctx.params.tone||'flax';
  const colors={flax:['#d9ccae','#b3a184','#f1e6cd'],moss:['#7d8963','#59634c','#a2ad89'],oat:['#bba57d','#97835f','#d8c5a0'],teal:['#577e79','#3a5f59','#809b8b'],cream:['#e9dec6','#c0b197','#f7edd5']};
  const p=colors[type]||colors.flax;
  g.fillStyle=p[0];g.fillRect(0,0,128,128);
  for(let i=0;i<64;i++){
    g.globalAlpha=.21;g.fillStyle=p[1];g.fillRect(i*2,0,.62,128);g.fillRect(0,i*2,128,.54);
    g.globalAlpha=.17;g.fillStyle=p[2];g.fillRect(i*2+.75,0,.7,128);g.fillRect(0,i*2+.85,128,.6);
  }
  for(let j=0;j<32;j++)for(let i=0;i<32;i++){
    g.globalAlpha=.16;g.fillStyle=(i+j)%2?p[1]:p[2];
    g.fillRect(i*4+((j%2)*2),j*4,1.7,.85);
  }
  for(let i=0;i<100;i++){
    g.globalAlpha=.05+ctx.random()*.07;g.fillStyle=i%2?p[2]:p[1];
    g.fillRect(ctx.random()*128,ctx.random()*128,.7+ctx.random(),2+ctx.random()*4);
  }
  g.globalAlpha=1;
}
