import bpy, math, mathutils, os
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='/tmp/kit/mellowbrook-savi-port-kit/human_male_spellcasting.glb')
src=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]; src.name='SRC'
for o in list(bpy.data.objects):
    if o.type=='MESH': bpy.data.objects.remove(o)
src.rotation_euler[2]+=math.pi; bpy.context.view_layer.update()
acts=[a for a in bpy.data.actions]
bpy.ops.import_scene.gltf(filepath='/tmp/kit/campton.glb')
tgt=[o for o in bpy.data.objects if o.type=='ARMATURE' and o!=src][0]
for o in list(bpy.data.objects):
    if o.type=='MESH': bpy.data.objects.remove(o)
M={'Hips':'bone_021_key5','Spine':'bone_020_key4','Spine2':'bone_022','Neck':'bone_048','Head':'bone_064_key6',
 'LeftShoulder':'bone_049_key2','LeftArm':'bone_065_key0','LeftForeArm':'bone_078','LeftHand':'bone_095',
 'RightShoulder':'bone_050_key3','RightArm':'bone_066_key1','RightForeArm':'bone_079','RightHand':'bone_097',
 'LeftUpLeg':'bone_025','LeftLeg':'bone_053','LeftFoot':'bone_068','LeftToeBase':'bone_080',
 'RightUpLeg':'bone_026','RightLeg':'bone_054','RightFoot':'bone_070','RightToeBase':'bone_081'}
M={'mixamorig:'+k:v for k,v in M.items()}
order=[b.name for b in tgt.data.bones]  # parents first
sc=bpy.context.scene
def wrest(arm,b): return (arm.matrix_world@arm.data.bones[b].matrix_local).to_quaternion()
def sdir(arm,b):
    bb=arm.data.bones[b]; mw=arm.matrix_world
    kids=[c for c in bb.children if (c.head_local-bb.head_local).length>0.03]
    end=kids[0].head_local if kids else bb.tail_local
    return ((mw@end)-(mw@bb.head_local)).normalized()
def tdir(arm,b):
    bb=arm.data.bones[b]; mw=arm.matrix_world; return ((mw@bb.tail_local)-(mw@bb.head_local)).normalized()
align={}
for t,s in M.items():
    if 'Hips' in t or 'Spine' in t or 'Neck' in t or 'Head' in t: align[t]=mathutils.Quaternion()
    else: align[t]=tdir(tgt,t).rotation_difference(sdir(src,s))
sh=(src.matrix_world@src.data.bones['bone_018_key26'].head_local); th=(tgt.matrix_world@tgt.data.bones['mixamorig:Hips'].head_local)
ratio=th.z/sh.z
names={'ReadySpellDirected':'ready spell directed','ReadySpellOmni':'ready spell omni','SpellCastDirected':'spell cast directed','SpellCastOmni':'spell cast omni','ChannelCastDirected':'channel cast directed','ChannelCastOmni':'channel cast omni'}
os.makedirs('/tmp/kit/clips',exist_ok=True)
for a in acts:
    src.animation_data.action=a
    f0,f1=[int(x) for x in a.frame_range]
    na=bpy.data.actions.new(a.name); tgt.animation_data_create(); tgt.animation_data.action=na
    for pb in tgt.pose.bones: pb.rotation_mode='QUATERNION'
    sc.frame_set(f0); bpy.context.view_layer.update()
    d0=(src.matrix_world@src.pose.bones['bone_021_key5'].matrix).to_quaternion()@wrest(src,'bone_021_key5').inverted()
    fwd=d0@mathutils.Vector((0,-1,0)); yaw=math.atan2(fwd.x,-fwd.y)
    fix=mathutils.Quaternion((0,0,1),-yaw)
    print(a.name,'yaw0',math.degrees(yaw))
    for f in range(f0,f1+1):
        sc.frame_set(f)
        for pb in tgt.pose.bones: pb.matrix_basis=mathutils.Matrix()
        bpy.context.view_layer.update()
        for t in order:
            if t not in M: continue
            s=M[t]; spb=src.pose.bones[s]
            sw=(src.matrix_world@spb.matrix).to_quaternion()
            d=fix@sw@wrest(src,s).inverted()
            want=d@align[t]@wrest(tgt,t)
            pb=tgt.pose.bones[t]
            cur=(tgt.matrix_world@pb.matrix)
            m=mathutils.Matrix.LocRotScale(cur.to_translation(),want,cur.to_scale())
            if t=='mixamorig:Hips':
                sp=src.matrix_world@src.pose.bones['bone_018_key26'].head
                off=(fix@(sp-sh))*ratio
                m=mathutils.Matrix.LocRotScale(th+off,want,cur.to_scale())
            pb.matrix=tgt.matrix_world.inverted()@m
            bpy.context.view_layer.update()
        for t in M:
            pb=tgt.pose.bones[t]
            pb.keyframe_insert('rotation_quaternion',frame=f)
            if 'Hips' in t: pb.keyframe_insert('location',frame=f)
    loop=a.name.startswith('Channel') or a.name.startswith('Ready')
    for o in bpy.data.objects: o.select_set(o==tgt)
    bpy.context.view_layer.objects.active=tgt
    for o in [src]: o.animation_data.action=None
    tgt.animation_data.action=na
    out=f"/tmp/kit/clips/{a.name}.glb"
    bpy.ops.export_scene.gltf(filepath=out,use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True)
    print('WROTE',out,f1-f0,'loop' if loop else 'once')
    src.animation_data.action=a
