// A pet's name over its head (Campton 2026-10-09): no box, bold embossed light green letters. Used by Jeffery and Wynx.
export const petPlate = (name, width = 2.4) => `<svg viewBox='0 0 240 56' width='${width}m' billboard='full'>`
  + `<text x='121.5' y='39.5' text-anchor='middle' font-family='serif' font-weight='bold' font-size='34' fill='#16301a' fill-opacity='0.85'>${name}</text>`
  + `<text x='118.8' y='36.8' text-anchor='middle' font-family='serif' font-weight='bold' font-size='34' fill='#effff0' fill-opacity='0.7'>${name}</text>`
  + `<text x='120' y='38' text-anchor='middle' font-family='serif' font-weight='bold' font-size='34' fill='#9fe39a' stroke='#3f7d3e' stroke-width='1' filter='drop-shadow(0 0 2px #0b1a0c)'>${name}</text>`
  + `</svg>`
