"""Convert a neighborhood from the owner's local GTA SA installation.

Uses DragonFF (GPL-3.0-or-later) for RenderWare decoding. No game executable
is run. Output contains models/textures from the supplied game installation.
"""
import sys, pathlib, struct, zlib, json, math, argparse
from inspect_assets import GAME, entries, read, defs, instances
from gtaLib import dff, txd

OUT=pathlib.Path(__file__).resolve().parents[1]/'dist/assets/gta'
OUT.mkdir(parents=True,exist_ok=True)
(OUT/'textures').mkdir(exist_ok=True)
blob=bytearray()
def array(values,kind='f'):
    offset=len(blob)
    blob.extend(struct.pack('<'+kind*len(values),*values))
    return [offset,len(values)]
def flatten(values):return [v for row in values for v in row]
def png(name,w,h,data):
    def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
    content=b''.join(b'\0'+bytes(data[y*w*4:(y+1)*w*4]) for y in range(h))
    (OUT/'textures'/name).write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>2I5B',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(content,8))+chunk(b'IEND',b''))

selected=[]
for a,definition,source in instances:
    if not definition:continue
    name,tex=definition
    distance=math.hypot(a[0]-2490,a[1]+1670)
    if name.startswith('lod') or name+'.dff' not in entries:continue
    if distance>340:continue
    if a[7]<10000 and distance>190:continue
    selected.append((a,definition))
# Text IPLs also contain terrain and models that are not streamed.
for path in (GAME/'data/maps').rglob('*.ipl'):
    section=''
    for line in path.read_text(errors='replace').splitlines():
        line=line.strip()
        if line in ['inst','end']:section=line;continue
        if section!='inst' or ',' not in line:continue
        v=[x.strip() for x in line.split(',')]
        if len(v)!=11:continue
        try:
            ident=int(v[0]);a=tuple(map(float,v[3:10]))+(ident,int(v[2]),int(v[10]))
        except ValueError:continue
        definition=defs.get(ident)
        if not definition or definition[0].startswith('lod') or definition[0]+'.dff' not in entries:continue
        if a[8]!=0 or math.hypot(a[0]-2490,a[1]+1670)>340:continue
        selected.append((a,definition))

models={};textures={};texture_lookup={};needed=set();failed=[]
names={name:tex for _,(name,tex) in selected}
names['infernus']='infernus'
for n,(name,texname) in enumerate(sorted(names.items())):
    model=dff.dff();model.load_memory(read(name+'.dff'))
    c=model.clumps[0]
    geos=[]
    for g in c.geometry_list:
        mats=[];groups=[];indices=[]
        for i,m in enumerate(g.materials):
            tex=m.textures[0].name.lower() if m.textures else ''
            if tex:needed.add((texname,tex))
            mats.append({'texture':tex,'dictionary':texname,'color':list(m.color)})
            start=len(indices)
            for tri in g.triangles:
                if tri.material==i:indices.extend([tri.a,tri.b,tri.c])
            groups.append([start,len(indices)-start,i])
        geo={'position':array(flatten(g.vertices)),'index':array(indices,'I'),'materials':mats,'groups':groups}
        if g.normals:geo['normal']=array(flatten(g.normals))
        if g.uv_layers:geo['uv']=array(flatten(g.uv_layers[0]))
        if g.prelit_colors:geo['color']=array([max(.28,min(1,v/255)) for rgba in g.prelit_colors for v in rgba[:3]])
        geos.append(geo)
    frames=[{'name':f.name or '', 'parent':f.parent,'position':list(f.position),'matrix':flatten(f.rotation_matrix)} for f in c.frame_list]
    atoms=[{'frame':a.frame,'geometry':a.geometry} for a in c.atomic_list]
    models[name]={'geometry':geos,'frames':frames,'atomics':atoms}
    if n%50==0:print('Models',n,'/',len(names),flush=True)

def extract_dictionary(name,data):
    t=txd.txd();t.load_memory(data)
    for texture in t.native_textures:
        tex=texture.name.lower();key=name+'/'+tex;filename=name+'__'+tex.replace('/','_')+'.png'
        if key in textures:continue
        try:
            rgba=texture.to_rgba()
            if len(rgba)!=texture.width*texture.height*4:raise ValueError('RGBA length')
            png(filename,texture.width,texture.height,rgba)
            textures[key]=filename;texture_lookup.setdefault(tex,key)
        except Exception as e:failed.append([key,str(e)])

dict_names=set(names.values())|{'radar106','radar107','radar118','radar119','radar117','radar130'}
parents={}
for path in (GAME/'data').rglob('*.ide'):
    section=''
    for line in path.read_text(errors='replace').splitlines():
        line=line.strip()
        if line in ['txdp','end']:section=line;continue
        if section=='txdp' and ',' in line:
            a=[x.strip().lower() for x in line.split(',')];parents[a[0]]=a[1]
for _ in range(5):dict_names.update(parents[k] for k in list(dict_names) if k in parents)
for name in sorted(dict_names):
    if name+'.txd' in entries:extract_dictionary(name,read(name+'.txd'))
for path in [GAME/'models/generic/vehicle.txd',GAME/'models/particle.txd']:
    if path.exists():extract_dictionary(path.stem.lower(),path.read_bytes())

missing=[]
for model in models.values():
    for g in model['geometry']:
        for m in g['materials']:
            name=m.pop('dictionary');tex=m['texture'];key=name+'/'+tex
            if tex and key not in textures:
                parent=parents.get(name)
                if parent and parent+'/'+tex in textures:key=parent+'/'+tex
                else:key=texture_lookup.get(tex,'')
            m['texture']=textures.get(key)
            if tex and not m['texture']:missing.append([name,tex])

placements=[{'model':name,'position':list(a[:3]),'quaternion':[a[3],a[4],a[5],-a[6]]} for a,(name,_) in selected]
output={'origin':[2490,-1670,13],'models':models,'instances':placements,'radar':{name:textures.get(name+'/'+name) for name in dict_names if name.startswith('radar')},'stats':{'models':len(models),'instances':len(placements),'textures':len(textures),'missingTextures':sorted(set(tuple(x) for x in missing)),'decodeErrors':failed}}
(OUT/'scene.json').write_text(json.dumps(output,separators=(',',':')))
(OUT/'meshes.bin').write_bytes(blob)
print(json.dumps(output['stats'],indent=2))
print('Geometry bytes:',len(blob),'JSON bytes:',(OUT/'scene.json').stat().st_size)
