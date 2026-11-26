"""Extract CJ, locomotion clips and Infernus samples from the owner's game.
GPL-3.0-or-later. RenderWare decoding uses the bundled DragonFF parser.
ANP3 and SFX layouts are documented by tmfksoft/ifp-reader and gta-reversed.
"""
import pathlib, struct, json, zlib, wave, sys
from inspect_assets import GAME, dff, txd
OUT=pathlib.Path(__file__).resolve().parents[1]/'dist/assets'
(OUT/'character').mkdir(exist_ok=True)
(OUT/'audio').mkdir(exist_ok=True)
archive=open(GAME/'models/player.img','rb');assert archive.read(4)==b'VER2';entries={}
for _ in range(struct.unpack('<I',archive.read(4))[0]):
    offset,size,_,name=struct.unpack('<IHH24s',archive.read(32))
    entries[name.split(b'\0')[0].decode().lower()]=(offset*2048,size*2048)
def read(name):
    offset,size=entries[name];archive.seek(offset);return archive.read(size)
def flatten(a):return [v for row in a for v in row]
def texture(dictionary,name=None):
    t=txd.txd();t.load_memory(read(dictionary+'.txd'))
    tex=next((x for x in t.native_textures if x.name==name),t.native_textures[0]);return tex.width,tex.height,tex.to_rgba()
def png(name,w,h,data):
    def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
    rows=b''.join(b'\0'+bytes(data[y*w*4:(y+1)*w*4]) for y in range(h))
    (OUT/'character'/name).write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>2I5B',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(rows,8))+chunk(b'IEND',b''))
def composite(base,overlay):
    w,h,b=base;ow,oh,o=overlay;assert (w,h)==(ow,oh);out=bytearray(len(b))
    for i in range(0,len(b),4):
        a=o[i+3]/255
        for c in range(3):out[i+c]=round(o[i+c]*a+b[i+c]*(1-a))
        out[i+3]=255
    return w,h,out
for name,tex in [('face.png',composite(texture('player_face'),texture('head'))),('torso.png',composite(texture('player_torso','torso'),texture('vest'))),('legs.png',texture('jeansdenim')),('feet.png',texture('sneakerbincblk')),('hands.png',texture('player_torso','torso'))]:png(name,*tex)
parts=[];skeleton=None
for name,tex in [('head','face'),('vest','torso'),('hands','hands'),('legs','legs'),('sneaker','feet')]:
    model=dff.dff();model.load_memory(read(name+'.dff'));c=next(c for c in model.clumps if c.frame_list[1].name.lower()=='normal');g=c.geometry_list[0];skin=g.extensions['skin']
    if skeleton is None:
        bone_map={b.index:b.id for f in c.frame_list if f.bone_data for b in f.bone_data.bones}
        skeleton={'frames':[{'name':f.name,'parent':f.parent,'position':list(f.position),'matrix':flatten(f.rotation_matrix),'boneId':f.bone_data.header.id if f.bone_data else None} for f in c.frame_list],'boneOrder':[bone_map[i] for i in range(len(bone_map))],'inverses':[flatten(m) for m in skin.bone_matrices]}
    parts.append({'name':name,'texture':tex+'.png','position':flatten(g.vertices),'normal':flatten(g.normals),'uv':flatten(g.uv_layers[0]),'index':[i for t in g.triangles for i in [t.a,t.b,t.c]],'skinIndex':flatten(skin.vertex_bone_indices),'skinWeight':flatten(skin.vertex_bone_weights)})
b=(GAME/'anim/ped.ifp').read_bytes();assert b[:4]==b'ANP3';pos=36;animations={}
wanted={'idle_stance':'idle','walk_player':'walk','run_player':'run','sprint_civi':'sprint','car_sit':'sit','car_getinlhs':'enter'}
for _ in range(struct.unpack_from('<I',b,32)[0]):
    name=b[pos:pos+24].split(b'\0')[0].decode().lower();count,size,flag=struct.unpack_from('<III',b,pos+24);pos+=36;tracks=[];duration=0
    for j in range(count):
        bone=b[pos:pos+24].split(b'\0')[0].decode();typ,n,bid=struct.unpack_from('<III',b,pos+24);pos+=36;times=[];quats=[];positions=[]
        for k in range(n):
            a=struct.unpack_from('<8h' if typ==4 else '<5h',b,pos);pos+=16 if typ==4 else 10
            times.append(a[4]/60);quats.extend(v/4096 for v in a[:4]);duration=max(duration,times[-1])
            if typ==4:positions.extend(v/4096 for v in a[5:])
        tracks.append({'id':bid,'name':bone,'times':times,'quaternion':quats,'position':positions})
    if name in wanted:animations[wanted[name]]={'duration':duration,'tracks':tracks}
assert pos==len(b)
(OUT/'character/cj.json').write_text(json.dumps({'skeleton':skeleton,'parts':parts,'animations':animations},separators=(',',':')))

audio=GAME/'audio';lookup=(audio/'CONFIG/BankLkup.dat').read_bytes();packs=(audio/'CONFIG/PakFiles.dat').read_bytes();metadata={}
def bank(bank_id):
    pak,offset,size=struct.unpack_from('<B3xII',lookup,bank_id*12);name=packs[pak*52:pak*52+12].split(b'\0')[0].decode()
    with open(audio/'SFX'/name,'rb') as f:f.seek(offset);header=f.read(4804);data=f.read(size)
    n=struct.unpack_from('<h',header)[0];items=[struct.unpack_from('<IiHh',header,4+i*12) for i in range(max(1,n))];result=[]
    for i,(offset,loop,rate,headroom) in enumerate(items):
        end=items[i+1][0] if i+1<len(items) else size;result.append((data[offset:end],rate,loop,headroom))
    return result
def save_audio(name,sample):
    pcm,rate,loop,headroom=sample
    with wave.open(str(OUT/'audio'/name),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(pcm)
    metadata[name]={'sampleRate':rate,'duration':len(pcm)/2/rate,'loopStart':max(0,loop)/2/rate,'headroom':headroom}
# Infernus model 411 uses COBRA player bank 38 and dummy bank 37.
for i,sample in enumerate(bank(38)):save_audio(['engine-accel.wav','engine-cruise.wav','engine-decel.wav'][i],sample)
for i,sample in enumerate(bank(37)):save_audio('engine-idle-'+str(i)+'.wav',sample)
for i,sample in enumerate(bank(0)[:4]):save_audio('step-'+str(i)+'.wav',sample)
(OUT/'audio/samples.json').write_text(json.dumps(metadata,indent=2))
print('CJ:',len(parts),'parts;',len(skeleton['frames']),'frames; clips:',list(animations))
print(json.dumps(metadata,indent=2))
