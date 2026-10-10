export const meta = { filter: "linear" };
export function texture(ctx) {
  const g = ctx.canvas(128, 128), far = ctx.params.tone === "mountain";
  g.fillStyle = far ? "#9baead" : "#b9c2b9"; g.fillRect(0, 0, 128, 128);
  const palette = far ? ["#b0c0b9", "#829d9e", "#a3b8b5", "#bfc9c0", "#92acab"] : ["#d1d5c5", "#9eafa9", "#c2cec4", "#d9decd", "#a6b9b0"];
  for (let i = 0; i < 75; i++) {
    const x = ctx.random() * 128, y = ctx.random() * 128, w = 7 + ctx.random() * 28, h = 3 + ctx.random() * 14;
    g.globalAlpha = 0.28; g.fillStyle = palette[i % 5];
    for (let u = -1; u <= 1; u++) for (let v = -1; v <= 1; v++) { const a=x+u*128,b=y+v*128; g.beginPath(); g.moveTo(a-w,b); g.lineTo(a-w*0.4,b-h); g.lineTo(a+w*0.7,b-h*0.65); g.lineTo(a+w,b+h*0.3); g.lineTo(a-w*0.2,b+h); g.closePath(); g.fill(); }
  }
  g.globalAlpha = 0.22; g.lineWidth = 0.65;
  for (let i = 0; i < 23; i++) {
    const x=ctx.random()*128, y=ctx.random()*128, l=8+ctx.random()*26;
    g.strokeStyle = far ? "#6c8d90" : "#798f89";
    for (let u=-1;u<=1;u++) for(let v=-1;v<=1;v++) { const a=x+u*128,b=y+v*128; g.beginPath(); g.moveTo(a,b); g.lineTo(a+l*0.28,b+l*0.14); g.lineTo(a+l*0.55,b+l*0.08); g.lineTo(a+l,b+l*0.23); g.stroke(); }
  }
  g.globalAlpha = 0.2;
  for (let i=0;i<320;i++) { g.fillStyle = i%3===0 ? palette[3] : palette[1]; g.fillRect(ctx.random()*128,ctx.random()*128,ctx.random()*1.4+0.3,0.6); }
  g.globalAlpha = 1;
}
