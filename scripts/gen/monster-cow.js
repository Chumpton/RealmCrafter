// The starter cow (S12): the farm cow's body and walk skeleton, plus a collider so it can be picked and fought. Faces -Z.
import { frame, box } from './yard-kit.js';
export { skeleton, geometry } from './herd-cow.js';
export function collider(ctx) { frame(); box(ctx, 0, 0, 0, 0.85, 1.35, 2.3, 0, { bottom: true }); frame(); }
