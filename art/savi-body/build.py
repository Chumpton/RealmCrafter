# Savi's body (creator 2026-10-10: "fix your skins textures bones and animations").
# Source: the kit's Human Female 049 with tunic/trousers/boots split as materials (savi-body2-src.glb).
# Its skin bound ~all verts to one joint, so it played clips as a statue: clear the weights, re-skin to the
# same armature with automatic weights, keep every clip, export.
import bpy, sys
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='/workspace/savi-body2-src.glb')
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
mesh = next(o for o in bpy.data.objects if o.type == 'MESH')
print('bones', len(arm.data.bones), 'actions', len(bpy.data.actions))
mesh.vertex_groups.clear()
for m in list(mesh.modifiers):
    if m.type == 'ARMATURE': mesh.modifiers.remove(m)
# rest pose for binding
for a in [arm]: a.animation_data and setattr(a.animation_data, 'action', None)
bpy.ops.object.mode_set(mode='OBJECT') if bpy.context.object and bpy.context.object.mode != 'OBJECT' else None
mw = mesh.matrix_world.copy(); mesh.parent = None; mesh.matrix_world = mw
# weights by distance to the moving bones' segments (bone heat fails on this kit mesh's loose parts)
import mathutils
moving = set()
for act in bpy.data.actions:
    if act.name in ('Run', 'Walk', 'Stand'):
        for fc in getattr(act, 'fcurves', []) or []:
            if fc.data_path.startswith('pose.bones["'): moving.add(fc.data_path.split('"')[1])
        for layer in getattr(act, 'layers', []) or []:
            for strip in layer.strips:
                for cb in strip.channelbags:
                    for fc in cb.fcurves:
                        if fc.data_path.startswith('pose.bones["'): moving.add(fc.data_path.split('"')[1])
print('moving bones', len(moving))
AM = arm.matrix_world
segs = []
for bn in arm.data.bones:
    if bn.name not in moving: continue
    h = AM @ bn.head_local; t = AM @ bn.tail_local
    if (t - h).length < 1e-4: t = h + mathutils.Vector((0, 0, 0.01))
    segs.append((bn.name, h, t))
def dseg(p, h, t):
    ab = t - h; u = max(0.0, min(1.0, (p - h).dot(ab) / ab.dot(ab))); return (p - (h + ab * u)).length
groups = {n: mesh.vertex_groups.new(name=n) for n, _, _ in segs}
MW = mesh.matrix_world
# the head: the moving bone nearest the crown; hair and face ride it and its parents alone
top = max((v.co.z for v in mesh.data.vertices))
crown = MW @ mathutils.Vector((0, 0, top * 0.93))
headbone = min(segs, key=lambda s: (s[1] - crown).length)[0]
chain = set(); b = arm.data.bones[headbone]
for _ in range(2):
    chain.add(b.name); b = b.parent
    if not b: break
chain = {c for c in chain if c in groups}
neckz = (AM @ arm.data.bones[headbone].head_local).z - 0.04
print('head', headbone, chain, round(neckz, 2))
for v in mesh.data.vertices:
    p = MW @ v.co
    pool = [s for s in segs if s[0] in chain] if p.z > neckz else segs
    ds = sorted(((dseg(p, h, t), n) for n, h, t in pool))[:3]
    w = [1.0 / max(d, 0.004) ** 4 for d, _ in ds]; s = sum(w)
    for (d, n), wi in zip(ds, w):
        if wi / s > 0.02: groups[n].add([v.index], wi / s, 'REPLACE')
mod = mesh.modifiers.new('Armature', 'ARMATURE'); mod.object = arm
mesh.parent = arm; mesh.matrix_parent_inverse = arm.matrix_world.inverted()
print('groups', len(mesh.vertex_groups))
# keep every clip on NLA tracks
ad = arm.animation_data or arm.animation_data_create()
for act in bpy.data.actions:
    if not any(s.action == act for t in ad.nla_tracks for s in t.strips):
        t = ad.nla_tracks.new(); t.name = act.name; s = t.strips.new(act.name, int(act.frame_range[0]), act)
bpy.ops.export_scene.gltf(filepath='/tmp/savi/savi-body3.glb', export_animations=True, export_animation_mode='NLA_TRACKS', export_skins=True)
# proof: Run clip mid-stride
ad.action = bpy.data.actions.get('Run') or next(iter(bpy.data.actions))
for t in ad.nla_tracks: t.mute = True
sc = bpy.context.scene; sc.frame_set(int(sum(ad.action.frame_range) / 2))
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (2.6, -2.6, 1.1); cam.rotation_euler = (1.45, 0, 0.785)
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun); sun.rotation_euler = (0.8, 0.2, 0.5); sun.data.energy = 3
sc.world = bpy.data.worlds.new('w'); sc.world.color = (0.5, 0.55, 0.6)
sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
sc.render.resolution_x = 480; sc.render.resolution_y = 600; sc.render.filepath = '/tmp/savi/proof.png'
bpy.ops.render.render(write_still=True)
