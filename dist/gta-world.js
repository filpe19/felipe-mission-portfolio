import * as THREE from './assets/three.module.js';

const ROOT = './assets/gta/';
const basis = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
const ray = new THREE.Raycaster();
const down = new THREE.Vector3(0,-1,0);

export async function loadGTA(scene, onProgress) {
  const responses = await Promise.all(['scene.json','meshes.bin'].map(name=>fetch(ROOT+name)));
  if(responses.some(r=>!r.ok))throw new Error('Não foi possível carregar a Grove Street.');
  const [data,buffer]=await Promise.all([responses[0].json(),responses[1].arrayBuffer()]);
  const loader=new THREE.TextureLoader(), textures=new Map(), materials=new Map();
  const used=new Set(Object.values(data.models).flatMap(m=>m.geometry.flatMap(g=>g.materials.map(m=>m.texture))).filter(Boolean));
  let done=0;const jobs=[...used];
  await Promise.all(Array.from({length:10},async()=>{
    while(jobs.length){const name=jobs.pop();const texture=await loader.loadAsync(ROOT+'textures/'+name);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.flipY=false;texture.anisotropy=4;textures.set(name,texture);onProgress(++done,used.size);}
  }));
  function material(spec,isCar,hasColors){
    const key=JSON.stringify([spec,isCar,hasColors]);
    if(materials.has(key))return materials.get(key);
    let [r,g,b,a]=spec.color||[255,255,255,255];
    if(isCar&&((g===255&&r===60&&b===0)||(r===255&&g===0&&b===175)))[r,g,b]=[180,43,36];
    const color=new THREE.Color().setRGB(r/255,g/255,b/255,THREE.SRGBColorSpace);
    const options={color,map:textures.get(spec.texture)||null,side:THREE.DoubleSide,vertexColors:hasColors,alphaTest:.45};
    if(a<245&&isCar){options.transparent=true;options.opacity=Math.max(.28,a/255);options.alphaTest=0;options.depthWrite=false;}
    const mat=isCar?new THREE.MeshStandardMaterial({...options,roughness:.37,metalness:.18}):new THREE.MeshBasicMaterial(options);
    materials.set(key,mat);return mat;
  }
  const templates=new Map();
  function model(name){
    if(templates.has(name))return templates.get(name).clone(true);
    const spec=data.models[name],isCar=name==='infernus';
    const nodes=spec.frames.map(f=>{
      const node=new THREE.Group();node.name=f.name;
      const m=f.matrix,p=f.position;
      node.matrix.set(m[0],m[3],m[6],p[0],m[1],m[4],m[7],p[1],m[2],m[5],m[8],p[2],0,0,0,1);
      node.matrix.decompose(node.position,node.quaternion,node.scale);return node;
    });
    const root=new THREE.Group();
    nodes.forEach((node,i)=>{const p=spec.frames[i].parent;(p>=0?nodes[p]:root).add(node);});
    const geometries=spec.geometry.map(g=>{
      const geo=new THREE.BufferGeometry();
      for(const [key,size] of [['position',3],['normal',3],['uv',2],['color',3]])if(g[key])geo.setAttribute(key,new THREE.BufferAttribute(new Float32Array(buffer,g[key][0],g[key][1]),size));
      geo.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer,g.index[0],g.index[1]),1));
      g.groups.forEach(group=>geo.addGroup(...group));
      if(!geo.attributes.normal)geo.computeVertexNormals();geo.computeBoundingBox();
      return [geo,g.materials.map(m=>material(m,isCar,!!g.color&&!isCar))];
    });
    for(const a of spec.atomics){if(/_dam|_vlo|^extra/i.test(spec.frames[a.frame].name))continue;const [geo,mats]=geometries[a.geometry];const mesh=new THREE.Mesh(geo,mats);mesh.name=name;nodes[a.frame].add(mesh);}
    if(isCar){const wheel=nodes.find(n=>n.name==='wheel');if(wheel)for(const n of nodes.filter(n=>/^wheel_.._dummy$/.test(n.name)&&n!==wheel.parent)){const clone=wheel.clone(true);n.add(clone);}}
    templates.set(name,root);return root.clone(true);
  }
  const cells=new Map(),renderBatches=new Map();
  const cell=(x,z)=>`${Math.floor(x/24)},${Math.floor(z/24)}`;
  const footprints=[];
  for(const inst of data.instances){
    const group=model(inst.model),p=inst.position;
    group.position.set(p[0]-data.origin[0],p[1]-data.origin[1],p[2]-data.origin[2]);group.quaternion.fromArray(inst.quaternion);
    group.updateMatrix();group.applyMatrix4(basis);group.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(group);
    if(bounds.max.y>4&&bounds.max.y-bounds.min.y>4)footprints.push([bounds.min.x,bounds.min.z,bounds.max.x,bounds.max.z]);
    group.traverse(mesh=>{
      if(!mesh.isMesh)return;
      // Static meshes retain their original transforms for precise road/wall rays.
      const b=new THREE.Box3().setFromObject(mesh);
      for(let x=Math.floor(b.min.x/24);x<=Math.floor(b.max.x/24);x++)for(let z=Math.floor(b.min.z/24);z<=Math.floor(b.max.z/24);z++){const k=`${x},${z}`;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(mesh);}
      // Merge the static scene by material to keep the original city affordable on mobile.
      const geo=mesh.geometry,index=geo.index.array,pos=geo.attributes.position,uv=geo.attributes.uv,col=geo.attributes.color;
      const vertex=new THREE.Vector3();
      for(const group of geo.groups){const mat=mesh.material[group.materialIndex];if(!renderBatches.has(mat))renderBatches.set(mat,{position:[],uv:[],color:[]});const batch=renderBatches.get(mat);
        for(let i=group.start;i<group.start+group.count;i++){const j=index[i];vertex.fromBufferAttribute(pos,j).applyMatrix4(mesh.matrixWorld);batch.position.push(vertex.x,vertex.y,vertex.z);batch.uv.push(uv?uv.getX(j):0,uv?uv.getY(j):0);if(mat.vertexColors)batch.color.push(col.getX(j),col.getY(j),col.getZ(j));}
      }
    });
  }
  const world=new THREE.Group();world.name='Grove Street — original GTA San Andreas';
  for(const [mat,batch] of renderBatches){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(batch.position,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(batch.uv,2));if(batch.color.length)geometry.setAttribute('color',new THREE.Float32BufferAttribute(batch.color,3));geometry.computeBoundingSphere();world.add(new THREE.Mesh(geometry,mat));}
  scene.add(world);
  const car=new THREE.Group(),vehicle=model('infernus');vehicle.applyMatrix4(basis);car.add(vehicle);scene.add(car);car.name='Infernus';
  const carBox=new THREE.Box3().setFromObject(car),carLift=-carBox.min.y+.03;
  const radar=new Map();await Promise.all(Object.entries(data.radar).filter(([,v])=>v).map(async([name,file])=>{const img=new Image();img.src=ROOT+'textures/'+file;await img.decode();radar.set(Number(name.slice(5)),img);}));
  const candidates=(x,z)=>cells.get(cell(x,z))||[];
  function groundAt(x,z,current=0){
    ray.set(new THREE.Vector3(x,current+2.6,z),down);ray.far=9;
    const hits=ray.intersectObjects(candidates(x,z),false);
    for(const h of hits){const n=h.face.normal.clone().transformDirection(h.object.matrixWorld);if(n.y>.48)return h.point.y;}
    return null;
  }
  function blocked(x,z,nextX,nextZ,ground,heading,radius=.8,reach=2.25){
    const dx=nextX-x,dz=nextZ-z,distance=Math.hypot(dx,dz);
    if(!distance)return false;
    if(nextX< -215||nextX>145||nextZ< -185||nextZ>155)return true;
    const dir=new THREE.Vector3(dx/distance,0,dz/distance),side=new THREE.Vector3(-dir.z,0,dir.x);
    const candidatesSet=new Set();for(const [xx,zz] of [[x,z],[nextX,nextZ],[nextX+side.x*1.4,nextZ+side.z*1.4],[nextX-side.x*1.4,nextZ-side.z*1.4]])for(const m of candidates(xx,zz))candidatesSet.add(m);
    for(const offset of [-radius,0,radius]){
      ray.set(new THREE.Vector3(x+side.x*offset,ground+.7,z+side.z*offset),dir);ray.far=distance+reach;
      const hits=ray.intersectObjects([...candidatesSet],false);
      if(hits.some(h=>Math.abs(h.face.normal.clone().transformDirection(h.object.matrixWorld).y)<.5))return true;
    }
    return false;
  }
  return {car,carLift,groundAt,blocked,radar,footprints,stats:data.stats};
}
