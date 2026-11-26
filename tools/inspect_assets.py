import sys, struct, pathlib, collections, math, os
sys.path.insert(0,str(pathlib.Path(__file__).parent/'DragonFF-master'))
from gtaLib import dff, txd
GAME=pathlib.Path(os.environ.get('GTA_GAME_DIR',str(pathlib.Path.home()/'Games/GTA San Andreas/Game')))
archive=open(GAME/'models/gta3.img','rb')
assert archive.read(4)==b'VER2'
entries={}
for _ in range(struct.unpack('<I',archive.read(4))[0]):
    offset,size,_,name=struct.unpack('<IHH24s',archive.read(32))
    entries[name.split(b'\0')[0].decode().lower()]=(offset*2048,size*2048)
def read(name):
    offset,size=entries[name.lower()];archive.seek(offset);return archive.read(size)
defs={}
for path in (GAME/'data').rglob('*.ide'):
    for line in path.read_text(errors='replace').splitlines():
        a=[x.strip() for x in line.split(',')]
        if len(a)>=4 and a[0].isdigit():
            defs[int(a[0])]=(a[1].lower(),a[2].lower())
instances=[]
for name in entries:
    if name.endswith('.ipl'):
        data=read(name)
        if data[:4]!=b'bnry':continue
        count=struct.unpack_from('<i',data,4)[0];offset=struct.unpack_from('<i',data,28)[0]
        for i in range(count):
            a=struct.unpack_from('<7f3i',data,offset+i*40)
            if abs(a[0]-2490)<370 and abs(a[1]+1670)<370 and a[8]==0:
                instances.append((a,defs.get(a[7]),name))
if __name__=='__main__':
    print('Instances',len(instances),'models',len(set(x[1] for x in instances)))
    print('Nearest',sorted(instances,key=lambda x:math.hypot(x[0][0]-2490,x[0][1]+1670))[:12])
    for name in ['infernus.dff','carlshou1_lae2.dff','fam1.dff']:
        model=dff.dff();model.load_memory(read(name));c=model.clumps[0]
        print(name,'geom',len(c.geometry_list),'atoms',len(c.atomic_list))
        print('frames',[(i,f.name,tuple(f.position),f.parent) for i,f in enumerate(c.frame_list)])
        g=c.geometry_list[0];print('firstgeo',len(g.vertices),'tri',len(g.triangles),g.triangles[:1],'v',g.vertices[:1],'tex',[[t.name for t in m.textures] for m in g.materials])
        print('firstmatrix',c.frame_list[0].rotation_matrix)
    for name in ['infernus.txd','radar118.txd','ganton01_lae2.txd']:
        if name not in entries:continue
        t=txd.txd();t.load_memory(read(name));print(name,[(x.name,x.width,x.height,len(x.to_rgba())) for x in t.native_textures])
