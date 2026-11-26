import * as THREE from './assets/three.module.js';

export async function loadCharacter() {
  const response=await fetch('./assets/character/cj.json');if(!response.ok)throw new Error('CJ indisponível');
  const data=await response.json(),root=new THREE.Group(),space=new THREE.Group();space.rotation.x=-Math.PI/2;root.add(space);root.name='CJ';
  const nodes=data.skeleton.frames.map(f=>{
    const node=new THREE.Bone();node.name='bone_'+f.boneId;const m=f.matrix,p=f.position;
    new THREE.Matrix4().set(m[0],m[3],m[6],p[0],m[1],m[4],m[7],p[1],m[2],m[5],m[8],p[2],0,0,0,1).decompose(node.position,node.quaternion,node.scale);
    node.userData.id=f.boneId;node.userData.restPosition=node.position.clone();return node;
  });
  nodes.forEach((node,i)=>{const parent=data.skeleton.frames[i].parent;(parent<0?space:nodes[parent]).add(node);});
  const byId=new Map(nodes.filter(n=>n.userData.id!==null).map(n=>[n.userData.id,n]));
  // Clothing DFFs parent the chest helpers to the arms. ped.ifp targets the
  // gameplay player.dff hierarchy, where both helpers belong to Spine1 (ID 3).
  // Preserve their bind transforms while matching that animation hierarchy.
  space.updateMatrixWorld(true);
  for(const id of [301,302])if(byId.has(id)&&byId.has(3))byId.get(3).attach(byId.get(id));
  for(const node of nodes)node.userData.restPosition.copy(node.position);
  const skeleton=new THREE.Skeleton(data.skeleton.boneOrder.map(id=>byId.get(id)),data.skeleton.inverses.map(m=>new THREE.Matrix4().fromArray(m)));
  const loader=new THREE.TextureLoader();
  await Promise.all(data.parts.map(async part=>{
    const geometry=new THREE.BufferGeometry();
    for(const [attr,size] of [['position',3],['normal',3],['uv',2],['skinWeight',4]])if(part[attr]?.length)geometry.setAttribute(attr,new THREE.Float32BufferAttribute(part[attr],size));
    geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(part.skinIndex,4));geometry.setIndex(part.index);
    if(!geometry.attributes.normal)geometry.computeVertexNormals();
    const map=await loader.loadAsync('./assets/character/'+part.texture);map.colorSpace=THREE.SRGBColorSpace;map.flipY=false;map.anisotropy=4;
    const mesh=new THREE.SkinnedMesh(geometry,new THREE.MeshLambertMaterial({map,side:THREE.DoubleSide}));mesh.name='CJ_'+part.name;mesh.frustumCulled=false;space.add(mesh);mesh.bind(skeleton,new THREE.Matrix4());mesh.normalizeSkinWeights();
  }));
  const qa=new THREE.Quaternion(),qb=new THREE.Quaternion();let clipName='',clipTime=0;
  function animate(name,dt,speed=1){
    if(clipName!==name){clipName=name;clipTime=0;}clipTime+=dt*speed;
    const clip=data.animations[name]||data.animations.idle,t=clipTime%Math.max(.01,clip.duration);
    for(const track of clip.tracks){const bone=byId.get(track.id);if(!bone)continue;
      // Keep the clothing chest helpers in their bind orientation on the spine;
      // generic ped breast tracks use another rig basis and distort CJ's vest.
      if(track.id===301||track.id===302)continue;
      let i=0;while(i<track.times.length-2&&track.times[i+1]<t)i++;
      const j=Math.min(i+1,track.times.length-1),blend=THREE.MathUtils.clamp((t-track.times[i])/(track.times[j]-track.times[i]||1),0,1);
      qa.fromArray(track.quaternion,i*4).normalize();qb.fromArray(track.quaternion,j*4).normalize();qa.slerp(qb,blend);
      bone.quaternion.slerp(qa,Math.min(1,dt*18));
      if(track.position.length){
        const x=THREE.MathUtils.lerp(track.position[i*3],track.position[j*3],blend),y=THREE.MathUtils.lerp(track.position[i*3+1],track.position[j*3+1],blend),z=THREE.MathUtils.lerp(track.position[i*3+2],track.position[j*3+2],blend);
        if(track.id===0)bone.position.set(0,0,z);else bone.position.set(x,y,z);
      }
    }
  }
  animate('idle',1);
  return {root,animate};
}
