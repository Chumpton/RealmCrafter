export const meta = { filter: "linear" };
export function texture(ctx) {
  const g = ctx.canvas(128, 128);
  g.fillStyle = "#979483"; g.fillRect(0, 0, 128, 128);
  const colors = ["#b7b09b", "#a9a593", "#848a80", "#c3bba6", "#9ca293", "#b1ac96"];
  for (let i = 0; i < 420; i++) {
    const x = ctx.random() * 128, y = ctx.random() * 128, r = 0.5 + ctx.random() * 3.5;
    for (let u = -1; u <= 1; u++) for (let v = -1; v <= 1; v++) {
      const a = x + u * 128, b = y + v * 128, m = r * 1.2 + 1; // ponytail: a wrap copy wholly off the canvas paints nothing, so skip it (same pixels, ~8x fewer paths)
      if (a + m < 0 || a - m > 128 || b + m < 0 || b - m > 128) continue;
      g.fillStyle = "#797e74"; g.beginPath(); g.ellipse(a, b + 0.55, r * 1.16, r * 0.75, i, 0, Math.PI * 2); g.fill();
      g.fillStyle = colors[i % colors.length]; g.beginPath(); g.moveTo(a-r,b); g.lineTo(a-r*0.3,b-r*0.72); g.lineTo(a+r*0.7,b-r*0.48); g.lineTo(a+r,b+r*0.2); g.lineTo(a,b+r*0.58); g.closePath(); g.fill();
      if (r > 2) { g.strokeStyle = "#cfccb5"; g.globalAlpha = 0.4; g.beginPath(); g.moveTo(a-r*0.7,b-r*0.05); g.lineTo(a-r*0.18,b-r*0.5); g.lineTo(a+r*0.48,b-r*0.28); g.stroke(); g.globalAlpha = 1; }
    }
  }
}
