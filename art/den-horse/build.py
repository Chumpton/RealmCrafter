# The armored warhorse, boned and animated (creator 2026-10-10: "animate and bone the horse for running animation").
# Source: the Capital Armored Warhorse static mesh (/cdn/value.c6f0…ce1.glb). This script rigs it whole: a quadruped
# skeleton measured onto the mesh, region weights, and five looping clips the gait code in scripts/den-horse.js plays
# by name: Idle, Walk (2.0 m/s native), Trot (4.33), Gallop (7.2), Jump (once). Rerun whole; never edit the .glb.
import bpy, math, mathutils, sys
SRC = '/workspace/horse/warhorse.glb'
OUT = '/workspace/horse/warhorse-rigged.glb'
FPS = 30
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.fps = FPS
bpy.ops.import_scene.gltf(filepath=SRC)
mesh = [o for o in bpy.data.objects if o.type == 'MESH'][0]
mesh.name = 'warhorse'
V = lambda *a: mathutils.Vector(a)
vs = [mesh.matrix_world @ v.co for v in mesh.data.vertices]
# head is +Y (exports as -Z, the engine's front); hooves at z 0; belly near z 1.1
def legc(front, sx):
    pts = [v for v in vs if v.z < 0.5 and (v.y > 0.3 if front else v.y < -0.2) and (v.x * sx > 0.05)]
    n = max(1, len(pts)); return V(sum(p.x for p in pts) / n, sum(p.y for p in pts) / n, 0)
LEGS = {}
for front, tag in ((True, 'F'), (False, 'B')):
    for sx, side in ((1, 'L'), (-1, 'R')):
        c = legc(front, sx); LEGS[tag + side] = c
        print('leg', tag + side, [round(x, 2) for x in c])
arm = bpy.data.armatures.new('rig'); rig = bpy.data.objects.new('rig', arm); sc.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
E = arm.edit_bones
def bone(name, h, t, parent=None, conn=False):
    b = E.new(name); b.head = h; b.tail = t; b.roll = 0
    if parent: b.parent = E[parent]; b.use_connect = conn
    return b
bone('root', V(0, 0, 0), V(0, 0.5, 0))
bone('body', V(0, -0.75, 1.6), V(0, 0.75, 1.7), 'root')
bone('neck', V(0, 0.8, 1.8), V(0, 1.3, 2.35), 'body')
bone('head', V(0, 1.3, 2.35), V(0, 2.0, 1.95), 'neck', True)
bone('tail', V(0, -1.05, 1.75), V(0, -1.45, 0.65), 'body')
for k, c in LEGS.items():
    top = 1.3 if k[0] == 'F' else 1.35
    bone('leg' + k, V(c.x, c.y, top), V(c.x, c.y, 0.72), 'body')
    bone('shin' + k, V(c.x, c.y, 0.72), V(c.x, c.y, 0.04), 'leg' + k, True)
bpy.ops.object.mode_set(mode='OBJECT')
# weights: each vertex picks its candidate bones by region, then 1/d^4 over the two nearest segments
B = {b.name: (rig.matrix_world @ b.head_local, rig.matrix_world @ b.tail_local) for b in arm.bones}
def segd(p, a, b):
    ab = b - a; t = max(0, min(1, (p - a).dot(ab) / ab.length_squared)); return (p - (a + ab * t)).length
groups = {n: mesh.vertex_groups.new(name=n) for n in B if n != 'root'}
for i, p in enumerate(vs):
    cands = ['body', 'neck', 'head', 'tail']
    if p.z < 1.2:
        k = ('F' if p.y > 0.1 else 'B') + ('L' if p.x > 0 else 'R')
        if abs(p.y - LEGS[k].y) < 0.42 and p.z < 1.15:
            cands = ['leg' + k, 'shin' + k] + (['body'] if p.z > 0.95 else [])
    if p.y > -0.95: cands = [c for c in cands if c != 'tail'] or cands
    if p.y < 0.55: cands = [c for c in cands if c not in ('neck', 'head')] or cands
    ds = sorted((segd(p, *B[c]) + 1e-3, c) for c in cands)[:2]
    ws = [(1 / d ** 4, c) for d, c in ds]; s = sum(w for w, _ in ws)
    for w, c in ws: groups[c].add([i], w / s, 'REPLACE')
mesh.parent = rig; mod = mesh.modifiers.new('rig', 'ARMATURE'); mod.object = rig
# clips
for pb in rig.pose.bones: pb.rotation_mode = 'XYZ'
TAU = math.pi * 2
def clip(name, frames, fn, step=1):
    act = bpy.data.actions.new(name); rig.animation_data_create(); rig.animation_data.action = act
    for f in list(range(0, frames, step)) + [frames]:
        ph = (f % frames) / frames
        for pb in rig.pose.bones: pb.rotation_euler = (0, 0, 0); pb.location = (0, 0, 0)
        fn(ph, rig.pose.bones)
        for pb in rig.pose.bones:
            pb.keyframe_insert('rotation_euler', frame=f + 1); pb.keyframe_insert('location', frame=f + 1)
    tr = rig.animation_data.nla_tracks.new(); tr.name = name; st = tr.strips.new(name, 1, act); st.name = name
    rig.animation_data.action = None
R = math.radians
def legs(P, ph, offs, swing, knee, lift_bias=0.0):
    for k, o in offs.items():
        a = TAU * (ph + o)
        hind = k[0] == 'B'
        P['leg' + k].rotation_euler.x = R(swing * (0.7 if hind else 1) * math.sin(a) + (6 if hind else 0))
        fold = max(0.0, math.cos(a))  # the leg folds while it swings forward
        P['shin' + k].rotation_euler.x = (R(0.6 * knee * fold) if hind else -R(knee * fold + lift_bias))  # a hind hock folds the cannon forward, a fore knee folds it back
def idle(ph, P):
    a = TAU * ph
    P['body'].rotation_euler.x = R(0.6 * math.sin(a)); P['root'].location.z = 0.012 * math.sin(a)  # breathing
    P['neck'].rotation_euler.x = R(-3 + 3 * math.sin(a * 2 + 0.6)); P['head'].rotation_euler.x = R(2 * math.sin(a * 2 + 1.2))
    P['head'].rotation_euler.z = R(4 * math.sin(a)); P['tail'].rotation_euler.z = R(7 * math.sin(a * 3)); P['tail'].rotation_euler.x = R(2 * math.sin(a * 3))
    P['shinBR'].rotation_euler.x = -R(6 + 3 * math.sin(a))  # one hind hoof cocked at rest
def walk(ph, P):
    a = TAU * ph
    legs(P, ph, {'BL': 0, 'FL': 0.25, 'BR': 0.5, 'FR': 0.75}, 18, 35)
    P['root'].location.z = 0.025 * math.sin(a * 2); P['body'].rotation_euler.z = R(1.5 * math.sin(a))
    P['neck'].rotation_euler.x = R(-4 * math.sin(a * 2)); P['head'].rotation_euler.x = R(3 * math.sin(a * 2 + 0.5)); P['tail'].rotation_euler.z = R(6 * math.sin(a))
def trot(ph, P):
    a = TAU * ph
    legs(P, ph, {'FL': 0, 'BR': 0, 'FR': 0.5, 'BL': 0.5}, 26, 55)
    P['root'].location.z = 0.06 * abs(math.sin(a)); P['body'].rotation_euler.x = R(1.2 * math.sin(a * 2))
    P['neck'].rotation_euler.x = R(-3 - 3 * math.sin(a * 2)); P['head'].rotation_euler.x = R(2 * math.sin(a * 2 + 0.6)); P['tail'].rotation_euler.x = R(10 + 4 * math.sin(a * 2))
def gallop(ph, P):
    a = TAU * ph
    legs(P, ph, {'BL': 0, 'BR': 0.08, 'FL': 0.42, 'FR': 0.5}, 42, 80)
    P['root'].location.z = 0.11 * (0.5 + 0.5 * math.sin(a - 0.6)); P['body'].rotation_euler.x = R(5 * math.sin(a + 0.4))
    P['neck'].rotation_euler.x = R(-8 - 10 * math.sin(a + 1.4)); P['head'].rotation_euler.x = R(6 * math.sin(a + 2.0))
    P['tail'].rotation_euler.x = R(35 + 8 * math.sin(a)); P['tail'].rotation_euler.z = R(4 * math.sin(a * 2))
def jump(ph, P):
    t = math.sin(math.pi * ph)
    for k in ('FL', 'FR'): P['leg' + k].rotation_euler.x = R(40 * t); P['shin' + k].rotation_euler.x = -R(100 * t)
    for k in ('BL', 'BR'): P['leg' + k].rotation_euler.x = R(-30 * t); P['shin' + k].rotation_euler.x = -R(45 * t)
    P['body'].rotation_euler.x = R(12 * math.sin(math.pi * min(1, ph * 1.4)) - 6 * t * (ph > 0.6))
    P['neck'].rotation_euler.x = R(-10 * t); P['tail'].rotation_euler.x = R(45 * t)
clip('Idle', 120, idle, 4); clip('Walk', 36, walk, 2); clip('Trot', 18, trot); clip('Gallop', 15, gallop); clip('Jump', 30, jump)
# proof: a side strip of the gallop + one walk frame
if '--proof' in sys.argv:
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 12
    sc.render.resolution_x = 640; sc.render.resolution_y = 420
    w = bpy.data.worlds.new('w'); w.color = (0.6, 0.65, 0.7); sc.world = w
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 4; sun.rotation_euler = (0.7, 0.2, 0.6); sc.collection.objects.link(sun)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.location = (7.5, 0.3, 1.5); cam.rotation_euler = (math.radians(88), 0, math.radians(90))
    tracks = {t.name: t for t in rig.animation_data.nla_tracks}
    for name, frames in (('Gallop', [1, 4, 8, 12]), ('Walk', [1, 10])):
        for t in tracks.values(): t.mute = t.name != name
        for f in frames:
            sc.frame_set(f); sc.render.filepath = f'/tmp/horse/{name}_{f:02d}.png'; bpy.ops.render.render(write_still=True)
for t in rig.animation_data.nla_tracks: t.mute = False
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=True, export_animation_mode='NLA_TRACKS', export_apply=False, export_skins=True)
print('EXPORTED', OUT)
