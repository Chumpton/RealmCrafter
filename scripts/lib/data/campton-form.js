// THE CAMPTON FORM (creator 2026-10-09: "make this my new character avatar and fully rig it to all animations"):
// his upload (/cdn/model-humanoid-campton-male-casual-r1nq84q7.glb) came with no skeleton, so Savi rigged it in Blender:
// a Mixamo-named skeleton (mixamorig:Hips … Toes), automatic weights, decimated 398k → 56k faces; the upload's 16x UV texture-transform baked into the UVs (the engine drew it all-black). Oct 9 "give my character a matte finish": metal/roughness map dropped, metalness 0, roughness 0.95.
// A Mixamo rig plays every library clip by address (idle, walk, run, emotes, sit on the saddle). Owner-only.
export const CAMPTON_OWNER = 'pa_d69d1b1f0d7352adedf69f2ee39457a4';
export const CAMPTON_MODEL = { model: { id: '/cdn/value.3b58dcd556e25f5f36a371c0149d7151677625268576eb7efade0556551a7f7f.glb', forward: '+z' }, scale: 1.03 };
// his rig carries no clips of its own, so the gait plays the library's by address (locomotion-core reads these)
export const CAMPTON_CLIPS = { idle: 'cdn/clip-idle-loop.glb', walk: 'cdn/clip-walk-loop.glb', run: 'cdn/clip-run-loop.glb', sit: 'cdn/clip-sit-loop.glb' };
