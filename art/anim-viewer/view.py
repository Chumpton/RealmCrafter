# ANIM VIEWER (creator 2026-10-10: "create your own animation viewer and 3d model viewer you can use to inspect
# and pass through each animation to 'make it make sense'"). Savi's bench tool, headless Blender:
#   blender -b --factory-startup --python-exit-code 1 --python art/anim-viewer/view.py -- \
#       --model model.glb [--clips a.glb b.glb] [--only Name,Name] [--frames 8] [--out /tmp/av] [--size 260]
# For the model: a turntable sheet (front, 3/4, side, back) with its bounds, bones, and every action it carries.
# For each clip (the model's own actions, plus any clip .glb whose bones match by name, mixamo prefix ignored):
#   a filmstrip, N evenly spaced frames x front + side views, a red dot on each hand,
#   and report.json: length, loop seam, the bones that move most, and each hand's height/reach per frame.
import bpy, sys, os, json, math
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(k, d=None, many=False):
    if k not in argv: return d
    i = argv.index(k)
    if not many: return argv[i + 1]
    out = []
    for a in argv[i + 1:]:
        if a.startswith('--'): break
        out.append(a)
    return out
MODEL, CLIPS = arg('--model'), arg('--clips', [], True)
ONLY = set(filter(None, (arg('--only', '') or '').split(',')))
N, OUT, SIZE = int(arg('--frames', 8)), arg('--out', '/tmp/av'), int(arg('--size', 260))
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_WORKBENCH'
if sc.render.engine == 'BLENDER_WORKBENCH':
    sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'TEXTURE'
sc.render.resolution_x = sc.render.resolution_y = SIZE
sc.render.film_transparent = False
w = bpy.data.worlds.new('w'); w.color = (0.12, 0.13, 0.15); sc.world = w
if sc.render.engine != 'BLENDER_WORKBENCH':
    w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.12, 0.13, 0.15, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 1.2
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3.5; sun.rotation_euler = (0.8, 0.2, 0.6); sc.collection.objects.link(sun)

def imp(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]

objs = imp(MODEL)
arm = next((o for o in objs if o.type == 'ARMATURE'), None)
meshes = [o for o in objs if o.type == 'MESH' and o.data.vertices and (not arm or o.parent == arm or o.find_armature() == arm)]
stray = [o.name for o in objs if o.type == 'MESH' and o not in meshes]
strip = lambda n: n.split(':')[-1].replace('mixamorig', '').lstrip('_')
bones = {strip(b.name): b.name for b in arm.pose.bones} if arm else {}

# every action: the model's own, then the clips' (retargeted by bone name)
actions = [a for a in bpy.data.actions]
def rest_world(o_list):
    for o in o_list: o.matrix_basis = o.matrix_basis  # keep
    bpy.context.view_layer.update(); return {o.name: o.matrix_world.to_quaternion() for o in o_list}

def bake_empties(co, name):
    """A library clip is a tree of animated empties whose rest is identity (the canonical T-pose).
    Each empty's world rotation over its rest's is the delta from the T-pose; laid onto the model's
    rest bone in world space, frame by frame, parents first, it becomes a keyed action on the model."""
    emp = [o for o in co if o.type == 'EMPTY' and o.animation_data and o.animation_data.action]
    if not emp or not arm: return None
    act = emp[0].animation_data.action; f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
    saved = {o.name: (o.animation_data.action, getattr(o.animation_data, 'action_slot', None)) for o in emp}
    for o in emp: o.animation_data.action = None; o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = (1, 0, 0, 0)
    r0 = rest_world(emp)
    for o in emp:
        o.animation_data.action = saved[o.name][0]
        try: o.animation_data.action_slot = saved[o.name][1]
        except Exception: pass
    pairs = [(o, bones[strip(o.name)]) for o in emp if strip(o.name) in bones]
    depth = lambda pb: len(pb.parent_recursive)
    pairs.sort(key=lambda x: depth(arm.pose.bones[x[1]]))
    A = bpy.data.actions.new(name); arm.animation_data_create(); arm.animation_data.action = A
    aw = arm.matrix_world.to_quaternion()
    brest = {bn: aw @ arm.data.bones[bn].matrix_local.to_quaternion() for _, bn in pairs}
    for pb in arm.pose.bones: pb.rotation_mode = 'QUATERNION'
    for f in range(f0, f1 + 1):
        sc.frame_set(f)
        want = {bn: (o.matrix_world.to_quaternion() @ r0[o.name].inverted()) @ brest[bn] for o, bn in pairs}
        for pb in arm.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0)
        for o, bn in pairs:
            bpy.context.view_layer.update()
            pb = arm.pose.bones[bn]
            par = (aw @ pb.parent.matrix.to_quaternion()) if pb.parent else aw
            par_rest = (aw @ pb.parent.bone.matrix_local.to_quaternion()) if pb.parent else aw
            # world = par @ (par_rest^-1 @ rest) @ basis  =>  basis = (par @ par_rest^-1 @ rest)^-1 @ want
            pb.rotation_quaternion = (par @ par_rest.inverted() @ brest[bn]).inverted() @ want[bn]
        for o, bn in pairs: arm.pose.bones[bn].keyframe_insert('rotation_quaternion', frame=f)
    arm.animation_data.action = None
    return A

for cp in CLIPS:
    nm = os.path.basename(cp).replace('.glb', '')
    before_act = set(bpy.data.actions)
    co = imp(cp)
    A = bake_empties(co, nm)
    if A is None:  # an armature clip: rename curves onto the model's bones
        for a in [a for a in bpy.data.actions if a not in before_act]:
            a.name = nm
            bags = [cb for L in getattr(a, 'layers', []) for st in L.strips for cb in getattr(st, 'channelbags', [])] or [a]
            for bag in bags:
                for fc in list(bag.fcurves):
                    if not fc.data_path.startswith('pose.bones["'): continue
                    bn = fc.data_path.split('"')[1]; tgt = bones.get(strip(bn))
                    if fc.data_path.endswith('location') or fc.data_path.endswith('scale') or not tgt: bag.fcurves.remove(fc); continue
                    fc.data_path = fc.data_path.replace(f'"{bn}"', f'"{tgt}"')
            actions.append(a)
    else: actions.append(A)
    for o in co: bpy.data.objects.remove(o, do_unlink=True)
if ONLY: actions = [a for a in actions if a.name in ONLY or a.name.split(':')[-1] in ONLY]

def bbox():
    dg = bpy.context.evaluated_depsgraph_get()
    pts = [m.matrix_world @ v.co for m in meshes for v in list(m.evaluated_get(dg).to_mesh().vertices)[::7]]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi
lo, hi = bbox(); H = hi.z - lo.z; ctr = (lo + hi) / 2
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = H * 1.35
def aim(yaw_deg):
    r = H * 3; a = math.radians(yaw_deg)
    cam.location = (ctr.x + math.sin(a) * r, ctr.y - math.cos(a) * r, ctr.z)
    d = Vector((ctr.x, ctr.y, ctr.z)) - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
dot = bpy.data.materials.new('dot'); dot.diffuse_color = (1, 0.1, 0.1, 1)
dots = {}
for side in ('Right', 'Left'):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=H * 0.025); d = bpy.context.object; d.data.materials.append(dot); dots[side] = d
hand = {s: bones.get(f'{s}Hand') for s in ('Right', 'Left')}
def place_dots():
    for s, d in dots.items():
        if arm and hand[s]: d.location = arm.matrix_world @ arm.pose.bones[hand[s]].head; d.hide_render = False
        else: d.hide_render = True
def shot(path, yaw):
    aim(yaw); place_dots(); sc.render.filepath = path; bpy.ops.render.render(write_still=True)
fwd = (arm.matrix_world.to_3x3() @ Vector((0, -1, 0))) if arm else Vector((0, -1, 0))

report = {'model': os.path.basename(MODEL), 'heightM': round(H, 3), 'bones': len(bones), 'hands': hand, 'actions': [a.name for a in actions], 'strayMeshes': stray, 'clips': {}}
# the model sheet: rest pose, four sides
if arm: arm.animation_data_create(); arm.animation_data.action = None
if arm:
    for pb in arm.pose.bones: pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0)
    bpy.context.view_layer.update()
for i, y in enumerate((0, 45, 90, 180)): shot(f'{OUT}/model_{i}.png', y)
os.system(f'montage {OUT}/model_[0-3].png -tile 4x1 -geometry +2+2 -background "#222" -title "{os.path.basename(MODEL)}  {H:.2f} m  {len(bones)} bones  {len(actions)} clips" {OUT}/model.png')

for a in actions:
    if not arm: break
    arm.animation_data.action = a
    try: arm.animation_data.action_slot = a.slots[0]
    except Exception: pass
    f0, f1 = (int(a.frame_range[0]), int(a.frame_range[1])); fps = sc.render.fps
    frames = [round(f0 + (f1 - f0) * i / max(1, N - 1)) for i in range(N)]
    track, rot = [], {}
    for f in range(f0, f1 + 1):
        sc.frame_set(f)
        for pb in arm.pose.bones:
            q = pb.rotation_quaternion if pb.rotation_mode == 'QUATERNION' else pb.rotation_euler.to_quaternion()
            ang = math.degrees(2 * math.acos(min(1, abs(q.w)))); r = rot.setdefault(strip(pb.name), [ang, ang]); r[0] = min(r[0], ang); r[1] = max(r[1], ang)
        if f in frames:
            row = {'f': f, 't': round((f - f0) / fps, 2)}
            for s in ('Right', 'Left'):
                if hand[s]:
                    p = arm.matrix_world @ arm.pose.bones[hand[s]].head
                    row[s[0] + 'h'] = round((p.z - lo.z) / H, 2); row[s[0] + 'reach'] = round((p - ctr).dot(fwd) / H, 2)
            track.append(row)
    sc.frame_set(f0); q0 = [pb.matrix.copy() for pb in arm.pose.bones]; sc.frame_set(f1); q1 = [pb.matrix.copy() for pb in arm.pose.bones]
    seam = max(((m0.to_translation() - m1.to_translation()).length for m0, m1 in zip(q0, q1)), default=0) / H
    safe = ''.join(c if c.isalnum() or c in '-_' else '_' for c in a.name)
    for i, f in enumerate(frames):
        sc.frame_set(f); shot(f'{OUT}/{safe}_f{i:02d}.png', 0); shot(f'{OUT}/{safe}_s{i:02d}.png', 90)
    os.system(f'montage {OUT}/{safe}_f*.png {OUT}/{safe}_s*.png -tile {N}x2 -geometry +1+1 -background "#222" -title "{a.name}  {(f1-f0)/fps:.2f}s  seam {seam:.2f}H  (top front, bottom side; red = hands)" {OUT}/clip_{safe}.png; rm {OUT}/{safe}_[fs]*.png')
    movers = sorted(((k, round(v[1] - v[0])) for k, v in rot.items()), key=lambda x: -x[1])[:8]
    report['clips'][a.name] = {'seconds': round((f1 - f0) / fps, 2), 'loopSeamH': round(seam, 3), 'movers': movers, 'hands': track, 'sheet': f'{OUT}/clip_{safe}.png'}
json.dump(report, open(f'{OUT}/report.json', 'w'), indent=1)
print('[av] done', OUT, len(report['clips']), 'clips')
