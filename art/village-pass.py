# Thistledown design pass (2026-10-10): plans road dressing + groves for thin quarters -> art/village-pass.json
import re, glob, json, math, random
R = random.Random(831)
txt = "".join(open(f).read() for f in glob.glob("places/zone-village/cells/*.scene"))
occ = [(float(a), float(b)) for a, b in re.findall(r"feetPosition: \{x: (-?[\d.]+), y: [^,]*(?:\}|[\d.-]+), z: (-?[\d.]+)\}", txt)]
occ += [(float(a), float(b)) for a, b in re.findall(r"feetPosition: \{x: (-?[\d.]+), y: \{terrain: [\d.-]+\}, z: (-?[\d.]+)\}", txt)]
ROADS = {
 'road-main': [[0,-8],[0,-30],[0,-50]],
 'road-south': [[0,-92],[0,-110],[0,-126],[14,-150],[40,-176],[70,-190]],
 'lane-farm': [[18,-70],[40,-74],[60,-76],[62,-100],[64,-134]],
 'lane-orchard': [[-22,-68],[-42,-70],[-62,-72]],
 'path-chapel': [[-4,-106],[-20,-124],[-30,-136],[-36,-146]],
 'path-quarry': [[-62,-76],[-90,-110],[-108,-150],[-116,-162]],
}
STREAM = [[-210,-110],[-150,-116],[-90,-122],[-40,-118],[0,-118],[40,-124],[90,-128],[150,-122],[210,-134]]
ROOMS = [(0,-2,12),(0,-70,22),(88,-78,24),(-82,-74,20),(-48,-158,16),(48,-142,20),(96,-196,22),(-120,-170,18)]
def dseg(p,a,b):
    dx,dz=b[0]-a[0],b[1]-a[1]; t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz)))
    return math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz)
def dline(p,pts): return min(dseg(p,pts[i-1],pts[i]) for i in range(1,len(pts)))
def droad(p): return min(dline(p,v) for v in ROADS.values())
placed=[]
def free(p, r=2.5, road=4.5, room=True):
    if droad(p) < road or dline(p,STREAM) < 7: return False
    if math.hypot(p[0], p[1]+110) > 158 or math.hypot(p[0],p[1]+2) < 14: return False
    if room and any(math.hypot(p[0]-x,p[1]-z) < rr for x,z,rr in ROOMS): return False
    return all(math.hypot(p[0]-x,p[1]-z) >= r for x,z in occ+placed)
M = dict(tree='/cdn/value.a1be1f6963ed40e1e7a1e01a95ff02329fb7faa15f4dcb461849c5f4dbaff066.glb',
 bush='/cdn/value.1b3c7471e0743bc579e19ef593eff972e05d7835c8ee1062bc15288259815020.glb',
 rock='/cdn/value.8a0ec2f551c63c864f3daa92721cc5471ccdc29e121639c0c73da6d05ed1624b.glb',
 lamp='/cdn/value.778464f2b10f7c33302fc4f18742baf8201059dc89297c62e5b7cb0cb29d3252.glb',
 barrow='/cdn/value.3853fc76d7ed019b6635fe14c91469ef50531fb3a55da49c1cb26eb93b9184e3.glb',
 crate='/cdn/value.efbf4869d4ee43025a7cd80cfbd4f89843f9a24c5a2999a2fb709b859cace575.glb',
 barrel='/cdn/value.3830c24a07361ae1a8d99abd11a7f2f3b0314ca78886a00afc730c88cc4cc948.glb',
 sack='/cdn/value.52cb64a830dab33e6fc76687a54eb5b423d7fc213df02c363b2355fc853b5e1e.glb',
 hay='/cdn/value.c0366fa5e8937b5c46fcafef516e8e3e9d522aac006e3d0e427f34253f65395b.glb',
 wood='/cdn/value.3bbc56aa3372caf1cae47fa7375f8af979fa1d9a503007e0a615210ddcc7e7b0.glb')
out=[]; n=[0]
def add(kind, p, yaw=None, **kw):
    n[0]+=1; placed.append(tuple(p)); s={'id':f'tdd-{kind}{n[0]}','tags':['thistledown','tdd'],'feetPosition':{'x':round(p[0],2),'y':{'terrain':0},'z':round(p[1],2)},'rotation':{'yaw':round(yaw if yaw is not None else R.uniform(0,360),1)}}
    if kind=='tree': s.update(model=M['tree'],scale=round(R.uniform(0.9,1.3),3),physics={'body':'static','collider':'box'},castShadow=True,visibleRange={'max':800})
    elif kind=='bush': s.update(model=M['bush'],scale=round(R.uniform(0.32,0.5),3),visibleRange={'max':250})
    elif kind=='rock': s.update(model=M['rock'],scale=round(R.uniform(0.16,0.34),3),physics={'body':'static','collider':'mesh'},castShadow=True,visibleRange={'max':300})
    elif kind in ('crate','barrel','sack','barrow','hay','wood'):
        sc=dict(crate=1.17,barrel=1,sack=1.1,barrow=0.73,hay=2.5,wood=2)[kind]; s.update(model=M[kind],scale=sc,castShadow=True,visibleRange={'max':250})
        if kind in ('crate','barrel','barrow','hay','wood'): s['physics']={'body':'static','collider':'box'}
    elif kind=='lamp': s.update(model=M['lamp'],scale=1,physics={'body':'static','collider':'box'},castShadow=True,visibleRange={'max':600},children=[{'feetPosition':{'x':0,'y':3.6,'z':0},'light':{'kind':'point','color':'#ffb766','intensity':1.6,'distance':11}}])
    else:
        prm={'kind':kind}; prm.update(kw.get('params',{}))
        s.update(primitive={'kind':'scripted','script':'scripts/gen/sv-props.js','params':prm,'seed':n[0]%7+1},material={'pbr':True},visibleRange={'max':kw.get('vr',200)})
        if kind in ('milestone','zigrail','lanternpost'): s['physics']='static'; s['castShadow']=True
    out.append(s)
def along(pts, step, fn):
    acc=0
    for i in range(1,len(pts)):
        a,b=pts[i-1],pts[i]; L=math.hypot(b[0]-a[0],b[1]-a[1]); ux,uz=(b[0]-a[0])/L,(b[1]-a[1])/L; t=step/2 if i==1 else acc
        while t<L:
            fn((a[0]+ux*t,a[1]+uz*t),(ux,uz)); t+=step
        acc=t-L
def yaw_of(u): return math.degrees(math.atan2(-u[0],-u[1]))
# --- roads: each gets lamps/posts, milestones, rail runs, wildflowers, weeds, bushes, rocks ---
def dress(name, w, lamp_step, rail=True, side=1):
    pts=ROADS[name]; k=[0]
    def f(p,u):
        k[0]+=1; nx,nz=-u[1],u[0]; sd=side if k[0]%2 else -side; off=w/2+1.6
        q=(p[0]+nx*off*sd,p[1]+nz*off*sd)
        if k[0]%lamp_step==1 and free(q,2,road=w/2+1.2,room=False):
            add('lamp' if name in('road-south','lane-farm') else 'lanternpost', q, yaw_of(u)+(90 if sd>0 else -90))
        for j in range(2):
            d=R.uniform(w/2+1.4,w/2+4.5)*(1 if j==0 else -1); q2=(p[0]+nx*d+u[0]*R.uniform(-3,3),p[1]+nz*d+u[1]*R.uniform(-3,3))
            if free(q2,1.6,road=w/2+1.2,room=False): add(['wildflowers','weeds','bush','wildflowers','rock','weeds'][(k[0]+j)%6], q2, params={'r':round(R.uniform(1.4,2.4),2)} if (k[0]+j)%6 in(0,3) else {'n':6,'r':0.9})
        if rail and k[0]%3==2:
            d=w/2+3.2; q3=(p[0]+nx*d*sd,p[1]+nz*d*sd)
            if free(q3,3.6,road=w/2+2.4,room=False): add('zigrail', q3, yaw_of(u)+90, params={'len':7.2}, vr=300)
    if rail:
        kk=[0]
        def g(p,u):
            kk[0]+=1; sd=1 if kk[0]%2 else -1; d=w/2+3; q=(p[0]-u[1]*d*sd,p[1]+u[0]*d*sd)
            if free(q,3,road=w/2+2.2,room=False): add('zigrail', q, yaw_of(u)+90, params={'len':7.2}, vr=300)
        along(pts, 16, g)
    along(pts, 9, f)
    # a milestone at each bend
    for i in range(1,len(pts)-1):
        p=pts[i]; u=(pts[i+1][0]-p[0],pts[i+1][1]-p[1]); L=math.hypot(*u); u=(u[0]/L,u[1]/L)
        q=(p[0]-u[1]*(w/2+1.3),p[1]+u[0]*(w/2+1.3))
        if free(q,1.5,road=w/2+0.8,room=False): add('milestone', q, yaw_of(u)+180, vr=250)
dress('road-south',5,3); dress('lane-farm',3.4,3); dress('path-chapel',2.6,2,rail=False); dress('path-quarry',2.4,3)
# --- groves for thin quarters: trees in a clump, underbrush, rocks, a flower drift ---
def grove(c, trees=6, rad=11):
    for i in range(trees*6):
        if sum(1 for s in out if s['id'].startswith('tdd-tree') and math.hypot(s['feetPosition']['x']-c[0],s['feetPosition']['z']-c[1])<rad+1)>=trees: break
        a=R.uniform(0,6.283); r=rad*math.sqrt(R.random()); p=(c[0]+math.cos(a)*r,c[1]+math.sin(a)*r)
        if free(p,4.2): add('tree',p)
    for kind,cnt,sp in (('bush',trees+3,rad+3),('rock',3,rad+2),('wildflowers',3,rad+5),('weeds',3,rad)):
        for i in range(cnt*5):
            if cnt<=0: break
            a=R.uniform(0,6.283); r=sp*math.sqrt(R.random()); p=(c[0]+math.cos(a)*r,c[1]+math.sin(a)*r)
            if free(p,1.8): add(kind,p, params={'r':2.2} if kind=='wildflowers' else {'n':6,'r':1}); cnt-=1
for c in [(-90,-140,6),(-28,-205,6),(-75,-205,5),(85,-30,6),(115,-45,5),(140,-145,6),(-140,-100,6),(-95,-28,5),(30,-205,5),(150,-60,4)]: grove(c[:2],c[2])
# --- farm life on the lane: a wood pile, barrow and sacks at the lane's turn ---
for kind,p,y in (('wood',(53,-86),20),('barrow',(57,-90),70),('sack',(55.8,-88.4),0),('crate',(56,-81),15),('hay',(67,-110),30),('barrel',(-30,-145),0),('crate',(-112,-152),40),('sack',(-110,-150),0),('barrow',(-113,-156),200)):
    if free(p,1.5,road=2.5,room=False): add(kind,p,y)
json.dump(out, open('art/village-pass.json','w'))
from collections import Counter
print(len(out), Counter(s['id'].rstrip('0123456789') for s in out))
