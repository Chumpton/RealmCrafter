// The den's art palette — one source of truth for the painted-texel look (Valheim-like: low-poly shapes, tiny
// hand-painted textures drawn as crisp texels, modern light). The Blender paint kit reads this same file: keep
// everything between the braces plain JSON (double quotes, no comments, no trailing commas).
export const ART = {
  "texel": { "character": 128, "heroProp": 128, "smallProp": 64, "tilePerMetre": 64, "codeBuiltUpscale": 8 },
  "reference": {
    "note": "measured from the creator's Valheim reference images, meadow daylight set; [hue deg, sat, val, share of frame]",
    "shadow": [177, 0.72, 0.14, 0.16], "mid": [106, 0.30, 0.37, 0.41], "high": [65, 0.18, 0.76, 0.26],
    "satMean": 0.53, "lumP5P50P95": [0.086, 0.447, 0.808],
    "skin": [28, 0.61, 0.65], "grass": [96, 0.46, 0.55], "skyFog": [192, 0.49, 0.44]
  },
  "grade": {
    "outdoor": { "saturation": 1.04, "contrast": 1.24, "temperature": 0.0, "gamma": 1.03,
                 "lift": [-0.05, -0.008, 0.03], "gain": [1.05, 1.0, 0.9],
                 "vignette": 0.26, "vignetteColor": "#0a1418", "grain": 0.018,
                 "greenMute": 0.34, "greenShift": [0.96, 0.98, 0.9],
                 "shafts": { "strength": 0.34, "samples": 28, "decay": 0.97 } },
    "hall":    { "saturation": 1.18, "contrast": 1.1, "temperature": 0.03, "gamma": 1.0,
                 "lift": [-0.018, 0.003, 0.012], "gain": [1.02, 1.0, 0.95],
                 "vignette": 0.24, "vignetteColor": "#140e0b", "grain": 0.012 }
  },
  "bloom": { "strength": 0.72, "radius": 0.7, "threshold": 0.9 },
  "fog": { "day": [0.50, 0.66, 0.70], "dusk": [0.42, 0.47, 0.55], "night": [0.05, 0.10, 0.13],
           "nearScale": 0.55, "farScale": 0.7 },
  "materials": {
    "note": "[hue deg, mean sat, value multiplier] per painted material, tuned toward the reference by eye",
    "wood": [28, 0.55, 1.0], "stone": [196, 0.12, 1.05], "iron": [206, 0.1, 1.0], "wool": [188, 0.34, 1.0],
    "leather": [22, 0.6, 0.9], "beard": [18, 0.78, 1.0], "skin": [26, 0.52, 1.0]
  },
  "eyes": { "glow": [0.35, 0.6, 1.0], "strength": 1.2 }
};
