// THE SAVI FORM (creator 2026-10-10: "make yourself one of our human female models instead and bone and animate yourself").
// Savi's builder body wears the kit's Human Female 049 (sk_char_human_female_049, mellowbrook-kit.js). It ships skinned
// (one skin, numbered joints) with 37 clips of its own, so the gait plays them by name, not the library's Mixamo clips.
export const SAVI_BODY = 'pa_230bca8f04b34f34ea797ba2bbaa6c9b';
export const SAVI_MODEL = { model: { id: '/cdn/value.c64da68091b3da790be5cf96b83c3527e24e7f3884e372253a833816ab5a0f94.glb', forward: '+z' }, scale: 0.92 };
export const SAVI_CLIPS = { idle: 'Stand', walk: 'Walk', run: 'Run', sit: 'EmoteSitGround' };
// 2026-10-10 "recreate yourself 1:1": the port kit's human_female_spellcasting.glb as it ships (its own skin and weights, no reweighting) + Human Female 049's 31 clips on the same 117 joints, dressed in a teal linen bodysuit painted onto its own texture.
// her own clips for moments: cast, wave, cheer, dance, point
export const SAVI_MOVES = { cast: 'SpellCastOmni', castDirected: 'SpellCastDirected', wave: 'EmoteWave', cheer: 'EmoteCheer', dance: 'EmoteDance', point: 'EmotePoint', jump: 'Jump' };
