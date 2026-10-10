# Savi's body: re-weight Human Female 049 to its own skeleton (its shipped weights tied most of the body to the head bone,
# so clips moved nothing). Bind-space joint positions come from the inverse bind matrices; each vertex takes its
# 3 nearest animated bone segments; above the neck only the head chain. Input/outputs: /workspace/savi-body2-src.glb -> /tmp/savi/savi-body3.glb
import json, struct, numpy as np
d = open('/workspace/savi-body2-src.glb', 'rb').read()
n = struct.unpack('<I', d[12:16])[0]; j = json.loads(d[20:20 + n]); bl = struct.unpack('<I', d[20 + n:24 + n])[0]; b = bytearray(d[28 + n:28 + n + bl])
CT = {5126: 'f4', 5123: 'u2', 5125: 'u4', 5121: 'u1'}; K = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
def acc(i):
    a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]; ct = CT[a['componentType']]; k = K[a['type']]
    off = v.get('byteOffset', 0) + a.get('byteOffset', 0); isz = np.dtype(ct).itemsize * k; st = v.get('byteStride') or isz
    raw = np.frombuffer(bytes(b), dtype='u1', count=st * (a['count'] - 1) + isz, offset=off)
    return np.stack([raw[i * st:i * st + isz] for i in range(a['count'])]).copy().view(ct).reshape(a['count'], k)
prim0 = j['meshes'][0]['primitives'][0]; A = prim0['attributes']
P = acc(A['POSITION']).astype(float)
sk = j['skins'][0]; joints = sk['joints']
IBM = acc(sk['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)  # column-major
JP = np.array([np.linalg.inv(m)[:3, 3] for m in IBM])  # joint bind positions in mesh space
node2j = {nd: i for i, nd in enumerate(joints)}
anim = set()
for a in j['animations']:
    if a.get('name') in ('Run', 'Walk', 'Stand', 'Jump', 'SpellCastOmni'):
        anim |= {c['target']['node'] for c in a['channels'] if c['target']['path'] == 'rotation'}
par = {}
for i, nd in enumerate(j['nodes']):
    for c in nd.get('children', []): par[c] = i
segs = []  # (joint index, head, tail)
for nd in anim:
    if nd not in node2j: continue
    ji = node2j[nd]; kids = [node2j[c] for c in j['nodes'][nd].get('children', []) if c in node2j]
    h = JP[ji]
    tails = [JP[k] for k in kids if np.linalg.norm(JP[k] - h) > 0.02]
    if not tails: segs.append((ji, h, h + np.array([0, 0.03, 0])))
    else:
        for t in tails: segs.append((ji, h, t))
# head: animated joint nearest the crown
crown = np.array([0, P[:, 1].max() * 0.9, 0])
hj = min([i for i in {s[0] for s in segs} if len(j['nodes'][joints[i]].get('children', [])) >= 3], key=lambda i: np.linalg.norm(JP[i] - crown))  # the skull: the branching joint nearest the crown
neck_y = JP[hj][1] - 0.03
headset = {hj} | {node2j[c] for c in j['nodes'][joints[hj]].get('children', []) if c in node2j and c in anim}
x = joints[hj]
if x in par and par[x] in node2j and par[x] in anim: headset.add(node2j[par[x]])
print('segments', len(segs), 'head joint', hj, 'neck y', round(neck_y, 3), 'top', round(P[:, 1].max(), 3))
H = np.array([s[1] for s in segs]); T = np.array([s[2] for s in segs]); SJ = np.array([s[0] for s in segs])
AB = T - H
def dists(p):
    u = np.clip(((p - H) * AB).sum(1) / (AB * AB).sum(1), 0, 1)
    return np.linalg.norm(p - (H + AB * u[:, None]), axis=1)
NJ = np.zeros((len(P), 4), np.uint8); NW = np.zeros((len(P), 4), np.uint8)
headmask = np.isin(SJ, list(headset))
for vi, p in enumerate(P):
    dd = dists(p)
    if p[1] > neck_y: dd = np.where(headmask, dd, 1e9)
    best = {}
    for si in np.argsort(dd):
        if SJ[si] not in best: best[SJ[si]] = dd[si]
        if len(best) == 3: break
    ks = list(best); w = np.array([1 / max(best[k], 0.006) ** 4 for k in ks]); w /= w.sum()
    w = np.where(w < 0.03, 0, w); w /= w.sum(); q = np.round(w * 255).astype(int); q[np.argmax(q)] += 255 - q.sum()
    NJ[vi, :len(ks)] = ks; NW[vi, :len(ks)] = q
def addview(data):
    while len(b) % 4: b.append(0)
    off = len(b); b.extend(data); j['bufferViews'].append({'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}); return len(j['bufferViews']) - 1
j['accessors'].append({'bufferView': addview(NJ.tobytes()), 'componentType': 5121, 'count': len(P), 'type': 'VEC4'}); ja = len(j['accessors']) - 1
j['accessors'].append({'bufferView': addview(NW.tobytes()), 'componentType': 5121, 'normalized': True, 'count': len(P), 'type': 'VEC4'}); wa = len(j['accessors']) - 1
for pr in j['meshes'][0]['primitives']: pr['attributes']['JOINTS_0'] = ja; pr['attributes']['WEIGHTS_0'] = wa
while len(b) % 4: b.append(0)
j['buffers'][0]['byteLength'] = len(b)
js = json.dumps(j, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
import os; os.makedirs('/tmp/savi', exist_ok=True)
open('/tmp/savi/savi-body3.glb', 'wb').write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(b)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(b), 0x004E4942) + bytes(b))
print('weighted joints', len(set(NJ[NW > 0].tolist())))
