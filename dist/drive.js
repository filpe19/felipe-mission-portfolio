import * as THREE from './assets/three.module.js';
import {loadGTA} from './gta-world.js';
import {projects} from './portfolio.js';
import {loadCharacter} from './character.js';

export async function createDriver(canvas,input) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xd4c2a6);scene.fog=new THREE.Fog(0xd4c2a6,150,440);
  const camera=new THREE.PerspectiveCamera(56,innerWidth/innerHeight,.1,700);
  scene.add(new THREE.HemisphereLight(0xffe7c6,0x696c71,2.4));
  const sun=new THREE.DirectionalLight(0xffe5c4,2.5);sun.position.set(-100,180,50);scene.add(sun);
  const [gta,character]=await Promise.all([loadGTA(scene,input.progress),loadCharacter()]);const car=gta.car;scene.add(character.root);
  const position=new THREE.Vector3(-5,0,-2),carPosition=new THREE.Vector3(-2,0,-1),look=new THREE.Vector3(),wanted=new THREE.Vector3();
  let heading=Math.atan2(6,-13),walkHeading=0,speed=0,walkSpeed=0,ground=0,carGround=0,time=0,overhead=false,inCar=false,stepTime=0;
  function reset(){inCar=false;carPosition.set(-2,0,-1);position.set(-5,0,-2);heading=Math.atan2(6,-13);walkHeading=2;speed=0;walkSpeed=0;ground=gta.groundAt(position.x,position.z,0)??0;carGround=gta.groundAt(carPosition.x,carPosition.z,0)??0;position.y=ground;car.position.set(carPosition.x,carGround+gta.carLift,carPosition.z);car.rotation.y=-heading;camera.position.set(-5,5,5);}
  reset();
  function toggleVehicle(){
    if(inCar){
      if(Math.abs(speed)>2){input.message('Pare o carro para sair.');return false;}
      for(const side of [-1,1]){
        const x=carPosition.x+Math.cos(heading)*side*2.2,z=carPosition.z+Math.sin(heading)*side*2.2,y=gta.groundAt(x,z,carGround);
        if(y===null||gta.blocked(carPosition.x,carPosition.z,x,z,carGround,heading,.2,.2))continue;
        position.set(x,y,z);ground=y;walkHeading=heading;inCar=false;speed=0;input.vehicle?.(false);input.message('CJ a pé · WASD para andar · Shift para correr');return true;
      }
      input.message('Não há espaço para sair. Afaste o carro da parede.');return false;
    }
    if(position.distanceTo(carPosition)>4.5){input.message('Chegue perto do Infernus para entrar.');return false;}
    inCar=true;position.copy(carPosition);ground=carGround;speed=0;input.vehicle?.(true);input.message('Infernus · Espaço para frear · F para sair');return true;
  }
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.5,5.9),new THREE.MeshBasicMaterial({color:0x11100c,transparent:true,opacity:.22,depthWrite:false}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);
  const markers=projects.map(p=>{
    const group=new THREE.Group(),height=gta.groundAt(p.x,p.z,0)??0;
    group.position.set(p.x,height+.08,p.z);
    const ring=new THREE.Mesh(new THREE.RingGeometry(2.1,2.5,48),new THREE.MeshBasicMaterial({color:p.color,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;group.add(ring);
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(2.1,2.1,5,32,1,true),new THREE.MeshBasicMaterial({color:p.color,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide}));beam.position.y=2.5;group.add(beam);
    const diamond=new THREE.Mesh(new THREE.OctahedronGeometry(.68),new THREE.MeshBasicMaterial({color:p.color}));diamond.position.y=3.8;group.add(diamond);scene.add(group);return {group,diamond,beam};
  });
  const clock=new THREE.Clock();
  function animate(){
    requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);time+=dt;
    const state=input.state(),active=state.started&&!state.paused;
    let throttle=0,steer=0,braking=false;
    if(active){
      const {keys,stick}=input;
      throttle=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0)-stick.y;
      steer=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+stick.x;
      braking=keys.has(' ')||keys.has('shift');
      if(inCar){
      if(Math.abs(throttle)>.08)speed+=throttle*12*dt;else speed*=Math.exp(-1.15*dt);
      if(keys.has(' ')||keys.has('shift'))speed*=Math.exp(-9*dt);
      speed=THREE.MathUtils.clamp(speed,-7,21);
      if(Math.abs(speed)>.25)heading+=steer*dt*1.2*Math.min(1,Math.abs(speed)/4)*Math.sign(speed);
      const nextX=position.x+Math.sin(heading)*speed*dt,nextZ=position.z-Math.cos(heading)*speed*dt;
      const nextGround=gta.groundAt(nextX,nextZ,ground);
      if(nextGround!==null&&Math.abs(nextGround-ground)<.65&&!gta.blocked(position.x,position.z,nextX,nextZ,ground,heading)){
        position.x=nextX;position.z=nextZ;ground=THREE.MathUtils.lerp(ground,nextGround,Math.min(1,dt*16));
      }else{if(Math.abs(speed)>6)input.bump?.();speed*=-.12;}
      position.y=ground;car.position.set(position.x,ground+gta.carLift,position.z);car.rotation.y=-heading;carPosition.copy(position);carGround=ground;
      }else{
        const amount=Math.min(1,Math.hypot(steer,throttle));walkSpeed=amount*(keys.has('shift')?5.4:2.1);
        if(amount>.08){
          const len=Math.hypot(steer,throttle),dx=steer/len*walkSpeed*dt,dz=-throttle/len*walkSpeed*dt,nx=position.x+dx,nz=position.z+dz,y=gta.groundAt(nx,nz,ground);
          const cx=nx-carPosition.x,cz=nz-carPosition.z,lx=cx*Math.cos(heading)+cz*Math.sin(heading),lz=-cx*Math.sin(heading)+cz*Math.cos(heading);
          const carBlocks=Math.abs(lx)<1.3&&Math.abs(lz)<2.8;
          if(y!==null&&Math.abs(y-ground)<.5&&!carBlocks&&!gta.blocked(position.x,position.z,nx,nz,ground,0,.25,.3)){position.set(nx,y,nz);ground=y;stepTime+=dt;if(stepTime>(walkSpeed>3?.29:.47)){input.step?.();stepTime=0;}}
          else walkSpeed=0;
          walkHeading=Math.atan2(steer,throttle);
        }
      }
    }else{speed*=Math.exp(-5*dt);walkSpeed=0;}
    character.animate(inCar?'sit':walkSpeed>3?'run':walkSpeed>.1?'walk':'idle',dt,walkSpeed>3?1.1:1);
    if(inCar){character.root.position.set(carPosition.x-Math.cos(heading)*.45,carGround+gta.carLift-.18,carPosition.z-Math.sin(heading)*.45);character.root.rotation.y=-heading;}
    else{character.root.position.set(position.x,ground+1.04,position.z);character.root.quaternion.slerp(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-walkHeading),Math.min(1,dt*12));}
    shadow.position.set(carPosition.x,carGround+.045,carPosition.z);shadow.rotation.z=heading;
    if(state.started){
      look.copy(position).add(new THREE.Vector3(0,1,0));
      if(overhead)wanted.copy(position).add(new THREE.Vector3(0,32,23));
      else if(inCar)wanted.copy(position).add(new THREE.Vector3(-Math.sin(heading)*10.5,5.1,Math.cos(heading)*10.5));
      else wanted.copy(position).add(new THREE.Vector3(0,3.4,5.7));
      camera.position.lerp(wanted,1-Math.exp(-dt*4));camera.lookAt(look);
    }else{
      const drift=matchMedia('(prefers-reduced-motion: reduce)').matches?0:Math.sin(time*.05)*3;
      camera.position.set(-38+drift,23,-39);camera.lookAt(3,1,6);
    }
    markers.forEach((m,i)=>{m.diamond.rotation.y=time*.65;m.diamond.position.y=3.8+Math.sin(time*2+i)*.25;m.beam.material.opacity=state.selected===i?.14:.06;});
    input.frame({position,speed:inCar?speed:walkSpeed,heading:inCar?heading:walkHeading,time,active,inCar,closeCar:position.distanceTo(carPosition)<4.5,throttle,braking,steer});renderer.render(scene,camera);
  }
  addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
  requestAnimationFrame(animate);
  return {reset,toggleVehicle,toggleCamera(){overhead=!overhead;},radar:gta.radar,stats:gta.stats};
}
