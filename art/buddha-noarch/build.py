# Buddha statue without the giant stone arch around it: split loose parts, drop the arch pieces, export.
import bpy, sys, json
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/tmp/buddha.glb")
ob = [o for o in bpy.data.objects if o.type == "MESH"][0]
bpy.context.view_layer.objects.active = ob; ob.select_set(True)
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.separate(type="LOOSE"); bpy.ops.object.mode_set(mode="OBJECT")
from mathutils import Vector
parts = []
for o in [o for o in bpy.data.objects if o.type == "MESH"]:
    vs = [o.matrix_world @ v.co for v in o.data.vertices]
    mn = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs))); mx = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    parts.append((o, mn, mx, len(vs)))
mode = sys.argv[-1]
if mode == "report":
    for o, mn, mx, n in sorted(parts, key=lambda p: -p[3])[:40]:
        print("PART", o.name, n, [round(x,2) for x in mn], [round(x,2) for x in mx])
    print("COUNT", len(parts))
if mode == "render":
    import math
    for o, mn, mx, n in parts: pass
    scn = bpy.context.scene
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scn.collection.objects.link(cam)
    cam.location = (0, -2.2, 0.5); cam.rotation_euler = (math.radians(85), 0, 0); scn.camera = cam
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); scn.collection.objects.link(sun); sun.rotation_euler = (0.6, 0.2, 0.3)
    scn.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else "BLENDER_EEVEE"
    scn.render.resolution_x = 600; scn.render.resolution_y = 600
    scn.render.filepath = "/tmp/bna/proof.png"; bpy.ops.render.render(write_still=True)
