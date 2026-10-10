// Zone places: a quiet rolling field, flat around the arrival gate at the origin. Material id "ground" is each place's own texture.
export function heightAt(x, z) {
  const r = Math.hypot(x, z), k = Math.min(1, Math.max(0, (r - 18) / 30));
  const h = Math.sin(x * 0.045) * 1.6 + Math.cos(z * 0.038) * 1.3 + Math.sin((x + z) * 0.021) * 2.2;
  return k * h;
}
export function materialAt() { return { ground: 1 }; }
