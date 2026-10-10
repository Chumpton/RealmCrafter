// spawn6 native template "camera"
export const camera = {
  behavior: ["scripts/camera-router.js"],
  kind: "custom",
  orientation: { source: "look" },
  sensitivity: 2,
  pointerLock: true,
  fov: 72,
  clip: { near: 0.06, far: 1800 },
  // The eye opens toward the rear window: the arch up the hill, the way to a first game (radians; π faces +z).
  state: { pitch: 0, yaw: 3.1416 },
};
