# Training dummy detail pass (creator 2026-10-10): the kit's padded dummy, its magenta-keyed straw cut out properly,
# standing in a pegged cross-foot timber base with braces, iron bands, a rope lash and fallen straw.
import bpy, bmesh, math, random, os, mathutils
from PIL import Image
SRC = '/tmp/dummy.glb'; OUT = '/tmp/training-dummy'; os.makedirs(OUT, exist_ok=True)
# 1. the keyed texture: magenta = see-through
im = Image.open('/tmp/dum/tex.png').convert('RGBA'); px = im.load()
for y in range(im.size[1]):
    for x in range(im.size[0]):
        r, g, b, a = px[x, y]
        if r > 150 and b > 150 and g < 110: px[x, y] = (200, 160, 70, 0)
im.save(OUT + '/tex.png')
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=SRC)
dummy = [o for o in sc.objects if o.type == 'MESH'][0]
mat = dummy.active_material
img = bpy.data.images.load(OUT + '/tex.png'); img.pack()
for n in mat.node_tree.nodes:
    if n.type == 'TEX_IMAGE': n.image = img; tex = n
bsdf = [n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'][0]
mat.node_tree.links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
mat.blend_method = 'CLIP' if hasattr(mat, 'blend_method') else None
try: mat.surface_render_method = 'DITHERED'
except Exception: pass
# where the post meets the ground
ws = [dummy.matrix_world @ v.co for v in dummy.data.vertices]
low = min(w.z for w in ws); foot = [w for w in ws if w.z < low + 0.15]
cx = sum(w.x for w in foot) / len(foot); cy = sum(w.y for w in foot) / len(foot)
dummy.location.z += 0.32 - low  # stands in the socket, 32 cm up
print('post foot', cx, cy, low)
def M(name, rgb, rough=0.85, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal; return m
WOOD = M('weathered-oak', (0.23, 0.14, 0.07)); WOOD2 = M('oak-endgrain', (0.33, 0.22, 0.12)); IRON = M('black-iron', (0.06, 0.06, 0.065), 0.55, 0.85)
ROPE = M('hemp-rope', (0.55, 0.43, 0.25), 0.95); STRAW = M('straw', (0.78, 0.6, 0.24), 0.9)
parts = []
def box(name, size, loc, rot=(0, 0, 0), mat=WOOD, bevel=0.012):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel: md = o.modifiers.new('b', 'BEVEL'); md.width = bevel; md.segments = 2; bpy.ops.object.modifier_apply(modifier='b')
    o.data.materials.append(mat); parts.append(o); return o
def cyl(name, r, d, loc, rot=(0, 0, 0), mat=IRON, v=16):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d, vertices=v, location=loc, rotation=rot); o = bpy.context.object; o.name = name; o.data.materials.append(mat); parts.append(o); return o
random.seed(7)
# cross-foot: two timbers, one over the other, slightly uneven
box('foot-a', (1.5, 0.16, 0.12), (cx, cy, 0.06), (0, 0, math.radians(3)))
box('foot-b', (0.16, 1.5, 0.12), (cx, cy, 0.17), (0, 0, math.radians(-2)))
# the socket block the post drops into, with an iron band top and bottom
box('socket', (0.24, 0.24, 0.26), (cx, cy, 0.34), mat=WOOD2, bevel=0.02)
for z in (0.25, 0.45): box('band', (0.255, 0.255, 0.035), (cx, cy, z), mat=IRON, bevel=0.004)
# four braces from the foot ends up to the socket
for a in range(4):
    ang = a * math.pi / 2 + math.radians(random.uniform(-3, 3)); dx, dy = math.cos(ang), math.sin(ang)
    p0 = mathutils.Vector((cx + dx * 0.55, cy + dy * 0.55, 0.2)); p1 = mathutils.Vector((cx + dx * 0.12, cy + dy * 0.12, 0.44))
    mid = (p0 + p1) / 2; L = (p1 - p0).length; d = (p1 - p0).normalized()
    hz = math.hypot(d.x, d.y); tilt = math.atan2(hz, d.z)
    o = box('brace', (0.07, 0.07, L), mid, rot=(0, tilt, math.atan2(d.y, d.x)), mat=WOOD)
    # nail heads at both ends of the foot timbers
    for s in (0.62, 0.7): cyl('nail', 0.012, 0.01, (cx + dx * s, cy + dy * s, 0.12 if a % 2 == 0 else 0.235), mat=IRON, v=6)
# a rope lash round the post just over the socket
for i in range(5): bpy.ops.mesh.primitive_torus_add(major_radius=0.075, minor_radius=0.014, location=(cx, cy, 0.52 + i * 0.026), major_segments=16, minor_segments=6); o = bpy.context.object; o.data.materials.append(ROPE); parts.append(o)
# a loose rope tail
bpy.ops.mesh.primitive_torus_add(major_radius=0.12, minor_radius=0.013, location=(cx + 0.25, cy - 0.3, 0.015), major_segments=18, minor_segments=6); o = bpy.context.object; o.scale = (1, 0.7, 0.4); o.data.materials.append(ROPE); parts.append(o)
# fallen straw: thin stalks scattered round the base, thicker where the hits land (front)
bm = bmesh.new()
for i in range(150):
    a = random.uniform(0, 6.283); r = 0.25 + abs(random.gauss(0, 0.35)); x = cx + math.cos(a) * r; y = cy + math.sin(a) * r - (0.15 if math.sin(a) < 0 else 0)
    L = random.uniform(0.09, 0.2); t = random.uniform(0, 6.283); w = 0.006
    h = 0.012 + random.uniform(0, 0.02) * (1 if r < 0.75 else 0) + (0.12 if r < 0.75 and abs(math.cos(a)) < 0.12 else 0)
    vs = [bm.verts.new((x - math.cos(t) * L / 2 + dxx, y - math.sin(t) * L / 2 + dyy, h + dz)) for dxx, dyy, dz in ((-w * math.sin(t), w * math.cos(t), 0), (w * math.sin(t), -w * math.cos(t), 0))]
    vs += [bm.verts.new((x + math.cos(t) * L / 2 + dxx, y + math.sin(t) * L / 2 + dyy, h + 0.01)) for dxx, dyy in ((w * math.sin(t), -w * math.cos(t)), (-w * math.sin(t), w * math.cos(t)))]
    bm.faces.new(vs)
me = bpy.data.meshes.new('straw'); bm.to_mesh(me); o = bpy.data.objects.new('straw', me); sc.collection.objects.link(o); o.data.materials.append(STRAW); parts.append(o)
# one join, origin at the post's foot
for p in parts: p.select_set(True)
dummy.select_set(True); bpy.context.view_layer.objects.active = dummy; bpy.ops.object.join()
o = bpy.context.object; o.name = 'training-dummy'
sc.cursor.location = (cx, cy, 0); bpy.ops.object.origin_set(type='ORIGIN_CURSOR'); o.location = (0, 0, 0)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.export_scene.gltf(filepath=OUT + '/training-dummy.glb', export_apply=True, use_selection=True)
# proof
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 24; sc.render.resolution_x = 640; sc.render.resolution_y = 640
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.5, 0.6, 0.75, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.8
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3; sun.rotation_euler = (0.8, 0.2, 0.7); sc.collection.objects.link(sun)
cam = bpy.data.objects.new('c', bpy.data.cameras.new('c')); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (2.6, -3.4, 2.0); cam.rotation_euler = (mathutils.Vector((0, 0, 1.2)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
sc.render.filepath = OUT + '/proof.png'; bpy.ops.render.render(write_still=True)
