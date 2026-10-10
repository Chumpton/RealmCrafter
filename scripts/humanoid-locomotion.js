// Turns the humanoid avatar and blends its Idle/Walk/Run clips by speed, and holds the sit pose when seated.
// A thin door: the body is scripts/lib/locomotion-core.js, loaded by import() on first need (scripts/lib/lazy-hooks.js);
// ticks wait for it, and a steer that lands before it is dropped (the next input a tick later carries the same axes).
// sit stays here: its clip is addressed as humanoid-locomotion.js#sit.
import { door } from './lib/lazy-hooks.js';
const D = door(() => import('./lib/locomotion-core.js'), 'now');
export const lazyRetry = D.retry;
export function onInput(ctx, input) { const c = D.get(); if (c) return c.onInput(ctx, input); }
export const update = D.tick();

// The seat's held pose. A body attached to something — a hull's seat, a mount, a chair — is seated,
// and this script (the body's one channel writer) holds this pose instead of the gait. A constant
// function of time: the mixer bakes it once, no per-frame code. Values are offsets from the
// T-pose bind. Rotations are degrees in each bone's own frame, the same on every humanoid rig; the
// hip drop is a FRACTION of the rig's hips rest height (sit.units), so the pelvis lands on the seat
// on every avatar, whatever its rig units. Feet stay at the attach point: the seat point is where
// the feet go, and the hips settle about half the body's height above it.
export function sit() {
  return {
    Hips: { position: [0, -0.5, 0] },
    Spine02: { rotation: [-8, 0, 0] },
    LeftUpLeg: { rotation: [-95, 0, 0] },
    RightUpLeg: { rotation: [-95, 0, 0] },
    LeftLeg: { rotation: [85, 0, 0] },
    RightLeg: { rotation: [85, 0, 0] },
    LeftArm: { rotation: [65, 0, 15] },
    RightArm: { rotation: [65, 0, -15] },
    LeftForeArm: { rotation: [60, 0, 30] },
    RightForeArm: { rotation: [60, 0, -30] },
  }
}
sit.units = 'hips'
sit.duration = 0.1
