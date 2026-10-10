// A quiet, elongated, hand-painted grain. One cached tile per species, not a picture per prop.
export const meta = { filter: 'linear' };
export function texture(ctx) {
  const g = ctx.canvas(256, 256);
  const kind = ctx.params.species || 'oak';
  const palettes = { oak: ['#bc915c','#956c3f','#ddbb83'], walnut: ['#79563a','#563924','#a57c51'], char: ['#292421','#151716','#645449'] };
  const p = palettes[kind] || palettes.oak;
  g.fillStyle=p[0]; g.fillRect(0,0,256,256);
  for(let i=-4;i<74;i++) {
    const x=i*3.7;
    g.strokeStyle=i%5===0?p[2]:p[1]; g.globalAlpha=i%5===0?.21:.15;
    g.lineWidth=i%7===0?2.3:.65;
    g.beginPath();
    for(let j=0;j<=24;j++) {
      const y=j*256/24;
      const d=Math.sin(y*Math.PI*2/256+i*.24)*(2.2+1.7*Math.sin(i*.7))+Math.sin(y*Math.PI*4/256+i*.37)*.65;
      if(j===0)g.moveTo(x+d,y);else g.lineTo(x+d,y);
    }
    g.stroke();
  }
  // Cathedral grain, quiet pores, a few soft knots; every mark is below the base colour.
  for(let k=0;k<3;k++) {
    const x=42+k*83, y=51+k*61;
    for(let i=0;i<7;i++) {
      g.globalAlpha=.09; g.strokeStyle=i%2?p[2]:p[1]; g.lineWidth=.7;
      g.beginPath(); g.ellipse(x,y,2.8+i*2,7+i*5.6,0,0,Math.PI*2);g.stroke();
    }
  }
  for(let i=0;i<210;i++) {
    const x=ctx.random()*256,y=ctx.random()*256;
    g.globalAlpha=.08+ctx.random()*.08;g.fillStyle=i%3===0?p[2]:p[1];
    g.fillRect(x,y,.5+ctx.random()*.7,1.2+ctx.random()*3.5);
  }
  if(kind==='char') {
    g.globalAlpha=.36;g.strokeStyle='#111413';g.lineWidth=1.1;
    for(let i=0;i<10;i++){const x=i*28+ctx.random()*7;g.beginPath();g.moveTo(x,0);g.lineTo(x-5,61);g.lineTo(x+2,146);g.lineTo(x-3,256);g.stroke();}
    for(let i=0;i<13;i++){const y=i*22;g.beginPath();g.moveTo(0,y);g.lineTo(74,y+6);g.lineTo(176,y-4);g.lineTo(256,y+1);g.stroke();}
  }
  g.globalAlpha=1;
}
