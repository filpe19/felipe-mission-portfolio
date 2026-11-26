// User-supplied MP3, original instrumental stations, and GTA engine/footstep samples.
const ROOT='./assets/audio/';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const frequency=n=>440*2**((n-69)/12);
export class GameAudio {
  constructor(){
    this.settings={enabled:true,effects:.7,music:.42,station:0};
    try{const saved=localStorage.getItem('felipe-audio-v3');Object.assign(this.settings,JSON.parse(saved||localStorage.getItem('felipe-audio-v2')||'{}'));if(!saved)this.settings.station=0;}catch{}
    this.settings.effects=clamp(Number(this.settings.effects)||0,0,1);this.settings.music=clamp(Number(this.settings.music)||0,0,1);this.settings.station=clamp(Math.round(Number(this.settings.station)||0),0,2);
    this.stations=[{name:'Equipe Absoluta',track:'Banda Msynck',file:ROOT+'equipe-absoluta-banda-msynck.mp3'},{name:'Grove FM',track:'Homecoming · instrumental original',bpm:92,roots:[43,43,39,41],lead:[74,77,79,77,74,72,70,72]},{name:'Night Drive',track:'City Lights · instrumental original',bpm:104,roots:[40,36,43,38],lead:[76,79,83,79,74,71,74,78]}];
    this.buffers={};this.loading=null;this.playing=false;this.frame={active:false,inCar:false,speed:0,throttle:0};this.lastStep=0;
  }
  save(){try{localStorage.setItem('felipe-audio-v3',JSON.stringify(this.settings));}catch{}}
  async start(){
    if(!this.context){
      this.context=new (window.AudioContext||window.webkitAudioContext)();const c=this.context;
      this.master=c.createGain();this.effects=c.createGain();this.music=c.createGain();this.analyser=c.createAnalyser();this.analyser.fftSize=1024;
      const limiter=c.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=10;limiter.ratio.value=5;
      this.effects.connect(this.master);this.music.connect(this.master);this.master.connect(limiter);limiter.connect(this.analyser);this.analyser.connect(c.destination);
      this.track=new Audio();this.track.loop=true;this.track.preload='metadata';
      this.trackGain=c.createGain();this.trackGain.gain.value=.55;
      this.trackSource=c.createMediaElementSource(this.track);this.trackSource.connect(this.trackGain);this.trackGain.connect(this.music);
      this.track.addEventListener('error',()=>window.dispatchEvent(new CustomEvent('portfolio-audio-error')));
      const noise=c.createBuffer(1,c.sampleRate,c.sampleRate),samples=noise.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;this.noise=noise;
      this.apply();this.nextBeat=c.currentTime+.15;this.beat=0;
      this.timer=setInterval(()=>this.schedule(),50);
      this.loading=Promise.all(['engine-idle-0.wav','engine-cruise.wav','engine-accel.wav','engine-decel.wav','step-1.wav','step-2.wav','step-3.wav'].map(async name=>{const r=await fetch(ROOT+name);if(!r.ok)throw new Error(name);this.buffers[name]=await c.decodeAudioData(await r.arrayBuffer());})).then(()=>this.engineLoops());
      this.loading.catch(()=>{this.loadFailed=true;});
      document.addEventListener('visibilitychange',()=>{if(document.hidden){this.track.pause();this.context.suspend().catch(()=>{});}else if(this.playing){this.context.resume().catch(()=>{});this.nextBeat=this.context.currentTime+.1;this.syncTrack();}});
    }
    this.playing=true;const resumed=this.context.resume();this.syncTrack();await resumed;this.apply();return this.loading;
  }
  syncTrack(){
    if(!this.track)return;const station=this.stations[this.settings.station];
    if(!station.file||!this.settings.enabled||!this.playing||document.hidden){this.track.pause();return;}
    const url=new URL(station.file,document.baseURI).href;if(this.track.src!==url)this.track.src=url;
    this.track.play().catch(error=>{if(error.name!=='AbortError')window.dispatchEvent(new CustomEvent('portfolio-audio-error'));});
  }
  apply(){if(!this.context)return;const t=this.context.currentTime;this.master.gain.setTargetAtTime(this.settings.enabled?.8:0,t,.05);this.effects.gain.setTargetAtTime(this.settings.effects,t,.08);this.music.gain.setTargetAtTime(this.settings.music*(this.frame.active?1:.35),t,.12);}
  toggle(){this.settings.enabled=!this.settings.enabled;this.save();this.apply();this.syncTrack();return this.settings.enabled;}
  setVolume(type,value){this.settings[type]=clamp(value,0,1);this.save();this.apply();}
  setStation(index){this.settings.station=clamp(Math.round(index),0,this.stations.length-1);this.beat=0;if(this.context)this.nextBeat=this.context.currentTime+.12;this.save();this.syncTrack();}
  engineLoops(){
    const c=this.context;
    for(const [key,file] of [['idle','engine-idle-0.wav'],['cruise','engine-cruise.wav']]){
      const source=c.createBufferSource(),gain=c.createGain();source.buffer=this.buffers[file];source.loop=true;if(key==='cruise')source.loopStart=.156187;gain.gain.value=0;source.connect(gain);gain.connect(this.effects);source.start();this[key]={source,gain};
    }
  }
  update(frame){
    this.frame=frame;if(!this.context)return;const t=this.context.currentTime,active=frame.active&&frame.inCar;
    if(this.idle){
      const moving=clamp(Math.abs(frame.speed)/4,0,1),gear=Math.min(3,Math.floor(Math.abs(frame.speed)/6));
      const rpm=.8+(Math.abs(frame.speed)-gear*6)/6*.72+Math.max(0,frame.throttle)*.16;
      this.idle.gain.gain.setTargetAtTime(active?(.2-moving*.12):0,t,.12);
      this.idle.source.playbackRate.setTargetAtTime(.8+Math.max(0,frame.throttle)*.2,t,.1);
      this.cruise.gain.gain.setTargetAtTime(active?moving*(frame.throttle>.1?.34:.2):0,t,.12);
      this.cruise.source.playbackRate.setTargetAtTime(rpm,t,.14);
      if(this.lastGear!==undefined&&gear>this.lastGear&&active)this.oneShot('engine-decel.wav',.13,1.15);
      this.lastGear=gear;
    }
    this.music.gain.setTargetAtTime(this.settings.music*(frame.active?1:.3),t,.2);
  }
  oneShot(name,volume=.3,rate=1){
    if(!this.context||!this.buffers[name])return;const c=this.context,source=c.createBufferSource(),gain=c.createGain();source.buffer=this.buffers[name];source.playbackRate.value=rate;gain.gain.value=volume;source.connect(gain);gain.connect(this.effects);source.onended=()=>{source.disconnect();gain.disconnect();};source.start();
  }
  step(){if(!this.context)return;this.oneShot('step-'+(1+(this.lastStep++%3))+'.wav',.27,.95+Math.random()*.1);}
  vehicle(enter){if(!this.context)return;this.percussion(this.context.currentTime,.18,'door',this.effects);if(enter)this.oneShot('engine-accel.wav',.13,.85);}
  impact(){if(this.context)this.percussion(this.context.currentTime,.24,'door',this.effects);}
  chime(){if(!this.context)return;[67,71,74,79].forEach((note,i)=>this.note(note,this.context.currentTime+i*.1,.5,.08,'sine',this.effects));}
  note(midi,when,duration,volume,type='triangle',destination=this.music){
    const c=this.context,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=frequency(midi);g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(volume,when+.012);g.gain.exponentialRampToValueAtTime(.0001,when+duration);o.connect(g);g.connect(destination);o.onended=()=>{o.disconnect();g.disconnect();};o.start(when);o.stop(when+duration+.03);
  }
  percussion(when,volume,type,destination=this.music){
    const c=this.context,g=c.createGain();g.connect(destination);
    if(type==='kick'){
      const o=c.createOscillator();o.frequency.setValueAtTime(135,when);o.frequency.exponentialRampToValueAtTime(43,when+.14);g.gain.setValueAtTime(volume,when);g.gain.exponentialRampToValueAtTime(.0001,when+.28);o.connect(g);o.onended=()=>{o.disconnect();g.disconnect();};o.start(when);o.stop(when+.3);
    }else{
      const source=c.createBufferSource(),filter=c.createBiquadFilter();source.buffer=this.noise;filter.type=type==='hat'?'highpass':'bandpass';filter.frequency.value=type==='hat'?7800:type==='door'?320:1700;filter.Q.value=.65;
      const duration=type==='hat'?.055:type==='door'?.17:.16;g.gain.setValueAtTime(volume,when);g.gain.exponentialRampToValueAtTime(.0001,when+duration);source.connect(filter);filter.connect(g);source.onended=()=>{source.disconnect();filter.disconnect();g.disconnect();};source.start(when);source.stop(when+duration+.01);
    }
  }
  schedule(){
    if(!this.context||this.context.state!=='running'||!this.playing)return;
    const c=this.context,station=this.stations[this.settings.station];if(station.file){this.nextBeat=c.currentTime+.12;return;}const step=60/station.bpm/4;
    if(this.nextBeat<c.currentTime)this.nextBeat=c.currentTime+.06;
    while(this.nextBeat<c.currentTime+.3){
      const beat=this.beat%16,bar=Math.floor(this.beat/16)%8,root=station.roots[Math.floor(bar/2)],swing=beat%2?step*.14:0,t=this.nextBeat+swing;
      if(this.settings.enabled&&this.settings.music>0){
        if([0,6,10].includes(beat)||(beat===14&&bar%2))this.percussion(t,.58,'kick');
        if(beat===4||beat===12)this.percussion(t,.24,'snare');
        if(beat%2===0)this.percussion(t,beat%4===0?.09:.06,'hat');
        if([0,3,6,8,11,14].includes(beat))this.note(root+(beat===11?7:beat===14?12:0),t,step*(beat===0?2.8:1.7),.18,'triangle');
        if(beat===0||beat===10)for(const interval of [12,15,19,22])this.note(root+interval,t,step*3,.026,'triangle');
        if(bar%2===1&&[2,5,8,11,14].includes(beat))this.note(station.lead[(Math.floor(beat/2)+bar)%8],t,step*1.5,.035,this.settings.station===2?'triangle':'sine');
      }
      this.beat++;this.nextBeat+=step;
    }
  }
}
