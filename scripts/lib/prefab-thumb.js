// Build-card pictures (creator 2026-10-10: "make sure all models have a thumbnail of their 3d model in the window"):
// every model card has a rendered 3/4 picture packed in atlas sheets (scripts/lib/data/prefab-thumbs.js, made in the workshop
// from each card's own .glb). thumb(id, px) is the CSS for a px-square picture of that card, or '' when it has none.
import { TH } from './data/prefab-thumbs.js';
export const hasThumb = (id) => TH.at[id] != null;
export function thumb(id, px) {
  const n = TH.at[id]; if (n == null) return '';
  const per = TH.cols * TH.cols, s = Math.floor(n / per), i = n % per, c = i % TH.cols, r = Math.floor(i / TH.cols);
  return `background:url(${TH.sheets[s]}) ${-c * px}px ${-r * px}px / ${TH.cols * px}px ${TH.cols * px}px no-repeat`;
}
