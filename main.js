import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { PointerLockControls } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/PointerLockControls.js";

const W=72,H=44,D=72, SEA=18, CHUNK=12;
const canvas=document.querySelector("#game");
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;

const scene=new THREE.Scene();
scene.background=new THREE.Color("#9bc6e8");
scene.fog=new THREE.FogExp2("#9bc6e8",0.012);

const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.05,700);
camera.position.set(W/2,30,D/2);

const controls=new PointerLockControls(camera,document.body);
const player={pos:camera.position,vel:new THREE.Vector3(),yaw:0,pitch:0,onGround:false,flight:false,health:20,hunger:20,air:20,creative:false,dead:false};
const keys={};
let selected=0, target=null, mineStart=0, mineKey="", dimension="overworld", seed=Date.now()>>>0, day=0.35;
let blocks=new Map(), meshes=new Map(), drops=[], mobs=[], particles=[], waterMeshes=[], portalMeshes=[];
let worldGroup=new THREE.Group(); scene.add(worldGroup);
let mobGroup=new THREE.Group(); scene.add(mobGroup);

const clock=new THREE.Clock();
const raycaster=new THREE.Raycaster();
const center=new THREE.Vector2(0,0);

const BLOCKS={
 grass:{name:"Grass Block",color:"#5d8f3c",hard:0.75,drop:"dirt",transparent:false},
 dirt:{name:"Dirt",color:"#765236",hard:0.65,drop:"dirt"},
 stone:{name:"Stone",color:"#72777a",hard:1.5,drop:"cobblestone"},
 cobblestone:{name:"Cobblestone",color:"#686b6c",hard:1.5,drop:"cobblestone"},
 sand:{name:"Sand",color:"#d8c384",hard:0.45,drop:"sand"},
 gravel:{name:"Gravel",color:"#85837b",hard:0.65,drop:"gravel"},
 wood:{name:"Oak Log",color:"#76502f",hard:1.25,drop:"wood"},
 leaves:{name:"Oak Leaves",color:"#3f713b",hard:0.2,drop:"leaves",alpha:.92},
 planks:{name:"Oak Planks",color:"#a8733e",hard:1.0,drop:"planks"},
 glass:{name:"Glass",color:"#8fc7d9",hard:0.25,drop:"glass",alpha:.32},
 coal:{name:"Coal Ore",color:"#343638",hard:2.0,drop:"coal"},
 iron:{name:"Iron Ore",color:"#9a806a",hard:2.2,drop:"iron"},
 gold:{name:"Gold Ore",color:"#c6a52d",hard:2.5,drop:"gold"},
 diamond:{name:"Diamond Ore",color:"#48cfe0",hard:3.0,drop:"diamond"},
 netherrack:{name:"Netherrack",color:"#783f38",hard:.4,drop:"netherrack"},
 soul:{name:"Soul Soil",color:"#4d403b",hard:.5,drop:"soul"},
 obsidian:{name:"Obsidian",color:"#211b32",hard:7.5,drop:"obsidian"},
 glow:{name:"Glowstone",color:"#e5a72d",hard:.3,drop:"glow"},
 endstone:{name:"End Stone",color:"#d5d09c",hard:1.8,drop:"endstone"},
 portal:{name:"Portal",color:"#6b38aa",hard:999,drop:null},
 water:{name:"Water",color:"#2b78a5",hard:999,drop:null,transparent:true}
};
const ITEMS=["grass","dirt","stone","cobblestone","sand","wood","planks","glass","coal","iron","gold","diamond","netherrack","obsidian","glow","endstone"];
const inv={};
ITEMS.forEach(x=>inv[x]=0);
Object.assign(inv,{grass:4,wood:2,dirt:12,stone:8});

const recipes=[
 {name:"Oak Planks",out:"planks",n:4,need:{wood:1}},
 {name:"Crafting Table",out:"crafting_table",n:1,need:{planks:4}},
 {name:"Glass",out:"glass",n:2,need:{sand:2}},
 {name:"Stone Pickaxe",out:"stone_pickaxe",n:1,need:{planks:3,cobblestone:3}},
 {name:"Torch",out:"torch",n:4,need:{coal:1,planks:1}},
 {name:"Portal Frame",out:"obsidian",n:1,need:{obsidian:1}}
];

const texCache={};
function texture(type){
 if(texCache[type]) return texCache[type];
 const c=document.createElement("canvas"); c.width=c.height=128;
 const x=c.getContext("2d");
 const b=BLOCKS[type]||BLOCKS.stone;
 x.fillStyle=b.color;x.fillRect(0,0,128,128);
 // original procedural high-frequency material detail
 let base=type==="grass"?"#466e2f":type==="dirt"?"#6d4a30":type==="stone"?"#73787a":b.color;
 for(let i=0;i<900;i++){
   const px=Math.random()*128,py=Math.random()*128,r=Math.random()*3;
   x.globalAlpha=.08+Math.random()*.18;
   x.fillStyle=Math.random()>.5?"#fff":"#000";
   x.fillRect(px,py,r,r);
 }
 x.globalAlpha=1;
 if(type==="grass"){x.fillStyle="#6e9f45";for(let i=0;i<35;i++){let px=Math.random()*128; x.fillRect(px,Math.random()*25,1,5)}}
 if(type==="wood"){x.strokeStyle="#3f2819";x.globalAlpha=.45;for(let i=0;i<12;i++){x.beginPath();x.moveTo(Math.random()*128,0);x.lineTo(Math.random()*128,128);x.stroke()}}
 if(type==="leaves"){x.globalAlpha=.75;for(let i=0;i<90;i++){x.fillStyle=Math.random()>.5?"#2f6133":"#4d873c";x.fillRect(Math.random()*128,Math.random()*128,3,3)}}
 if(type==="coal"||type==="iron"||type==="gold"||type==="diamond"){
   const ore=type==="coal"?"#1e2224":type==="iron"?"#d0a989":type==="gold"?"#f4d448":"#72f2ff";
   x.fillStyle=ore;for(let i=0;i<26;i++){x.fillRect(Math.random()*120,Math.random()*120,4+Math.random()*7,4+Math.random()*7)}
 }
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;t.wrapS=t.wrapT=THREE.RepeatWrapping;
 texCache[type]=t;return t;
}
function mat(type){
 const b=BLOCKS[type]||BLOCKS.stone;
 return new THREE.MeshStandardMaterial({map:texture(type),color:0xffffff,roughness:type==="glass"?.08:.82,metalness:type==="gold"?.22:0,transparent:!!b.alpha,opacity:b.alpha||1});
}
const geo=new THREE.BoxGeometry(1,1,1);

function key(x,y,z){return `${x}|${y}|${z}`}
function setBlock(x,y,z,t){
 if(x<0||x>=W||y<0||y>=H||z<0||z>=D)return;
 const k=key(x,y,z); if(t) blocks.set(k,t); else blocks.delete(k);
}
function getBlock(x,y,z){return blocks.get(key(x,y,z))}
function hash(x,z,s=seed){let n=Math.sin(x*127.1+z*311.7+s*0.00001)*43758.5453;return n-Math.floor(n)}
function noise2(x,z){
 const x0=Math.floor(x),z0=Math.floor(z),fx=x-x0,fz=z-z0;
 const a=hash(x0,z0),b=hash(x0+1,z0),c=hash(x0,z0+1),d=hash(x0+1,z0+1);
 const u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
 return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a,b,u),THREE.MathUtils.lerp(c,d,u),v);
}
function fbm(x,z){let v=0,a=.5,f=.045;for(let i=0;i<5;i++){v+=noise2(x*f,z*f)*a;a*=.5;f*=2.03}return v;}

function heightAt(x,z){
 const biome=biomeAt(x,z);
 let h=20+Math.floor(fbm(x,z)*18);
 if(biome==="desert")h=19+Math.floor(fbm(x+30,z+20)*8);
 if(biome==="mountains")h=25+Math.floor(fbm(x,z)*28);
 if(biome==="snow")h=27+Math.floor(fbm(x-20,z+30)*25);
 if(biome==="swamp")h=17+Math.floor(fbm(x+70,z-50)*5);
 return Math.min(H-4,Math.max(5,h));
}
function biomeAt(x,z){
 const n=noise2(x*.08,z*.08);
 const m=noise2((x+900)*.025,(z-400)*.025);
 if(m>.77)return "snow";
 if(n<.18)return "desert";
 if(n>.84)return "mountains";
 if(m<.25)return "swamp";
 return "plains";
}

function carveCaves(){
 // Deterministic tunnel-like cavities. Keep enough rock around the spawn.
 for(let x=2;x<W-2;x++)for(let z=2;z<D-2;z++){
   for(let y=4;y<Math.min(25,heightAt(x,z)-2);y++){
     const c=fbm(x*1.8+y*0.7,z*1.8-y*0.4);
     if(c>.73 && y<heightAt(x,z)-2) blocks.delete(key(x,y,z));
   }
 }
}
function tree(x,y,z){
 const tall=4+Math.floor(hash(x,z)*3);
 for(let i=0;i<tall;i++)setBlock(x,y+i,z,"wood");
 for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++)for(let dy=0;dy<=3;dy++){
   if(Math.abs(dx)+Math.abs(dz)+dy<6 && !getBlock(x+dx,y+tall-2+dy,z+dz))setBlock(x+dx,y+tall-2+dy,z+dz,"leaves");
 }
}
function flower(x,y,z,type){
 // plant blocks are represented as small meshes rather than voxel solids
 plants.push({x,y,z,type});
}
let plants=[];
function generateWorld(){
 blocks.clear();plants=[];drops.forEach(d=>scene.remove(d.mesh));drops=[];mobs.forEach(m=>mobGroup.remove(m.group));mobs=[];
 for(let x=0;x<W;x++)for(let z=0;z<D;z++){
   const bi=biomeAt(x,z),h=heightAt(x,z);
   for(let y=0;y<=h;y++){
     let t=y===h?(bi==="desert"?"sand":bi==="snow"?"snow":bi==="swamp"?"grass":"grass"):y>h-4?"dirt":"stone";
     if(t==="snow")t="grass";
     setBlock(x,y,z,t);
     if(y>4 && y<h-3){
       const r=hash(x*3+y,z*5);
       if(r>.965)t=r>.99?"diamond":r>.975?"gold":r>.965?"iron":"coal";
     }
   }
   if(h<SEA)for(let y=h+1;y<=SEA;y++)setBlock(x,y,z,"water");
   if(bi==="plains"&&hash(x,z)>.84&&h>SEA)tree(x,h+1,z);
   if(bi==="swamp"&&hash(x,z)>.91&&h>SEA)tree(x,h+1,z);
   if((bi==="plains"||bi==="swamp")&&hash(x+50,z-30)>.78&&h>=SEA)flower(x,h+1,z,hash(x,z)>.5?"poppy":"daisy");
 }
 carveCaves();
 buildWorld();
 buildPlants();
 spawnInitialMobs();
}

function visible(x,y,z){
 const n=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
 return n.some(([dx,dy,dz])=>{const t=getBlock(x+dx,y+dy,z+dz);return !t||t==="water"||t==="portal"||t==="glass"});
}
function buildWorld(){
 meshes.forEach(m=>worldGroup.remove(m));meshes.clear();
 const geo2=new THREE.BoxGeometry(1,1,1);
 for(const [k,t] of blocks){
   if(!visible(...k.split("|").map(Number)))continue;
   const [x,y,z]=k.split("|").map(Number);
   const m=new THREE.Mesh(geo2,mat(t));m.position.set(x+.5,y+.5,z+.5);m.castShadow=true;m.receiveShadow=true;m.userData={x,y,z,type:t};
   worldGroup.add(m);meshes.set(k,m);
 }
}
function rebuildAround(x,y,z){
 // Simple robust rebuild; adequate for a small browser prototype.
 buildWorld();
}

function buildPlants(){
 document.querySelectorAll(".plant").forEach(e=>e.remove());
 plants.forEach(p=>{
   const g=new THREE.Group();
   const c=document.createElement("canvas");c.width=c.height=32;const x=c.getContext("2d");
   x.clearRect(0,0,32,32);x.fillStyle=p.type==="poppy"?"#e64b45":"#f6e6b0";
   x.beginPath();x.arc(16,10,6,0,Math.PI*2);x.fill();x.fillStyle="#3e7837";x.fillRect(15,12,2,18);
   const t=new THREE.CanvasTexture(c);const m=new THREE.MeshBasicMaterial({map:t,transparent:true,side:THREE.DoubleSide,depthWrite:false});
   const q=new THREE.Mesh(new THREE.PlaneGeometry(.6,1.1),m);q.position.set(p.x+.5,p.y+.55,p.z+.5);q.rotation.y=Math.random()*Math.PI;g.add(q);
   const q2=q.clone();q2.rotation.y=q.rotation.y+Math.PI/2;g.add(q2);g.userData.plant=true;worldGroup.add(g);
 });
}

function dropItem(type,amount=1,pos=new THREE.Vector3()){
 if(!type||!inv.hasOwnProperty(type))return;
 const g=new THREE.Group();
 const m=new THREE.Mesh(new THREE.BoxGeometry(.25,.25,.25),mat(type));m.castShadow=true;g.add(m);
 g.position.copy(pos);g.position.y+=.25;g.userData={type,amount,vel:new THREE.Vector3((Math.random()-.5)*2,3, (Math.random()-.5)*2),life:0};
 worldGroup.add(g);drops.push({mesh:g,type,amount});
}
function updateDrops(dt){
 drops=drops.filter(d=>{
   const g=d.mesh;g.userData.life+=dt;g.userData.vel.y-=9*dt;g.position.addScaledVector(g.userData.vel,dt);g.userData.vel.multiplyScalar(.985);
   if(g.position.y<0){g.position.y=0;g.userData.vel.y*=-.3}
   if(g.position.distanceTo(player.pos)<1.6){inv[d.type]=(inv[d.type]||0)+d.amount;worldGroup.remove(g);toast(`Picked up ${d.amount} × ${BLOCKS[d.type]?.name||d.type}`);return false}
   if(g.userData.life>120){worldGroup.remove(g);return false} return true;
 });
}

function spawnMob(type,x,z){
 const y=heightAt(Math.floor(x),Math.floor(z))+1;
 const group=new THREE.Group();group.position.set(x,y,z);
 const bodyMat=new THREE.MeshStandardMaterial({color:type==="pig"?"#e28b91":type==="zombie"?"#4f8f5c":type==="piglin"?"#9b685e":type==="ender"?"#11131a":"#8b8b8b",roughness:.75});
 const head=new THREE.Mesh(new THREE.BoxGeometry(.65,.65,.65),bodyMat);head.position.y=1.15;head.castShadow=true;
 const body=new THREE.Mesh(new THREE.BoxGeometry(.75,.9,.45),bodyMat);body.position.y=.55;body.castShadow=true;group.add(head,body);
 if(type==="ender"){head.scale.set(.9,1.25,.9);group.scale.set(1,1.9,1)}
 if(type==="pig"||type==="piglin"){for(const sx of [-.25,.25])for(const sz of [-.15,.15]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.18,.5,.18),bodyMat);leg.position.set(sx,.15,sz);leg.castShadow=true;group.add(leg)}}
 mobGroup.add(group);mobs.push({type,group,hp:type==="ender"?200:20,speed:type==="pig"?1.1:1.7,aggro:type==="pig"||type==="piglin"?false:true,t:Math.random()*10});
}
function spawnInitialMobs(){
 for(let i=0;i<9;i++){let x=8+Math.random()*(W-16),z=8+Math.random()*(D-16);spawnMob(i%3===0?"pig":i%3===1?"zombie":"piglin",x,z)}
 spawnMob("ender",W/2+12,D/2+12);
}
function updateMobs(dt){
 const dayLight=Math.sin(day*Math.PI*2);
 mobs.forEach(m=>{
   m.t+=dt;
   const g=m.group,dx=player.pos.x-g.position.x,dz=player.pos.z-g.position.z,dist=Math.hypot(dx,dz);
   if(m.aggro&&dist<18){g.position.x+=dx/dist*m.speed*dt;g.position.z+=dz/dist*m.speed*dt}
   else {g.position.x+=Math.sin(m.t*.7)*.18*dt;g.position.z+=Math.cos(m.t*.61)*.18*dt}
   g.position.y=heightAt(Math.floor(g.position.x),Math.floor(g.position.z))+1;
   if(m.aggro&&dist<1.4&&Math.random()<dt*.8&&!player.creative)damagePlayer(1,"a hostile mob");
 });
}

function makePortal(x,y,z,kind="nether"){
 for(let i=0;i<4;i++){setBlock(x,y+i,z,"obsidian");setBlock(x+3,y+i,z,"obsidian")}
 for(let j=0;j<4;j++){setBlock(x+j,y,z,"obsidian");setBlock(x+j,y+4,z,"obsidian")}
 for(let j=1;j<3;j++)for(let i=1;i<4;i++)setBlock(x+j,y+i,z,"portal");
 rebuildAround(x,y,z);toast(`Portal built: walk into it to enter ${kind.toUpperCase()}.`);
}

function enterDimension(name){
 dimension=name;
 blocks.clear();plants=[];meshes.forEach(m=>worldGroup.remove(m));meshes.clear();
 if(name==="overworld"){generateWorld();player.pos.set(W/2+0.5,heightAt(W/2,D/2)+2,D/2+0.5)}
 else if(name==="nether"){
   for(let x=0;x<W;x++)for(let z=0;z<D;z++){let h=12+Math.floor(fbm(x*1.4,z*1.4)*13);for(let y=0;y<=h;y++)setBlock(x,y,z,y<h-3?"netherrack":"netherrack");if(hash(x,z)>.94)for(let y=h;y<h+5;y++)setBlock(x,y,z,"glow")}
   for(let i=0;i<10;i++){spawnMob("piglin",10+Math.random()*(W-20),10+Math.random()*(D-20))}
   buildWorld();player.pos.set(W/2,24,D/2);
 } else {
   for(let x=0;x<W;x++)for(let z=0;z<D;z++){let r=Math.hypot(x-W/2,z-D/2);if(r<26){let h=Math.max(2,10-Math.floor(r*.18)+Math.floor(fbm(x,z)*6));for(let y=0;y<=h;y++)setBlock(x,y,z,"endstone")}}
   buildWorld();player.pos.set(W/2,18,D/2);
 }
 toast(`Entered ${name.toUpperCase()}`);
}

function updateLighting(dt){
 day=(day+dt*.003)%1;
 const sunY=Math.sin(day*Math.PI*2),sunX=Math.cos(day*Math.PI*2);
 sun.position.set(W/2+sunX*100,40+sunY*80,D/2+20);
 const strength=Math.max(.03,sunY*.7+.25);
 sun.intensity=strength;
 ambient.intensity=.06+Math.max(0,sunY)*.08;
 const c=new THREE.Color().setHSL(.56,.55,.15+.35*Math.max(0,sunY));scene.background.lerp(c,.015);
 scene.fog.color.copy(scene.background);
 document.querySelector("#clock").textContent=`${sunY>0?"DAY":"NIGHT"} ${String(Math.floor(day*24)).padStart(2,"0")}:${String(Math.floor(day*1440)%60).padStart(2,"0")}`;
}
const sun=new THREE.DirectionalLight("#fff4d6",1.1);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-60;sun.shadow.camera.right=60;sun.shadow.camera.top=60;sun.shadow.camera.bottom=-60;sun.shadow.camera.near=1;sun.shadow.camera.far=240;scene.add(sun);
const ambient=new THREE.AmbientLight("#b8d0c2",.09);scene.add(ambient);
const playerLight=new THREE.PointLight("#ffdca0",0,18,2);scene.add(playerLight);

function solidAt(x,y,z){const t=getBlock(Math.floor(x),Math.floor(y),Math.floor(z));return t&&t!=="water"&&t!=="portal"&&t!=="leaves"&&t!=="glass"}
function movePlayer(dt){
 if(player.dead)return;
 const speed=player.flight?9:5.2;
 const dir=new THREE.Vector3();
 if(keys.KeyW)dir.z-=1;if(keys.KeyS)dir.z+=1;if(keys.KeyA)dir.x-=1;if(keys.KeyD)dir.x+=1;
 dir.normalize().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),camera.rotation.y));
 if(player.flight){player.vel.x=dir.x*speed;player.vel.z=dir.z*speed;player.vel.y=(keys.Space?speed:0)+(keys.ShiftLeft?-speed:0);camera.position.addScaledVector(player.vel,dt);return}
 player.vel.x*=Math.pow(.001,dt);player.vel.z*=Math.pow(.001,dt);player.vel.y-=18*dt;
 player.vel.x+=dir.x*speed*dt*6;player.vel.z+=dir.z*speed*dt*6;
 if(keys.Space&&player.onGround){player.vel.y=7.4;player.onGround=false}
 const next=camera.position.clone().addScaledVector(player.vel,dt);
 if(next.y<1.7){next.y=1.7;player.vel.y=0;player.onGround=true}
 // simple capsule collision
 for(const ax of ["x","z"]){
   const test=next.clone();
   if(solidAt(test.x,test.y-1.5,test.z)||solidAt(test.x,test.y-.4,test.z)){test[ax]=camera.position[ax];player.vel[ax]=0}
   next[ax]=test[ax];
 }
 camera.position.copy(next);
 const bx=Math.floor(camera.position.x),by=Math.floor(camera.position.y-1.6),bz=Math.floor(camera.position.z);
 const inWater=getBlock(bx,by,bz)==="water";
 const inPortal=getBlock(bx,Math.floor(camera.position.y),bz)==="portal" || getBlock(bx,by,bz)==="portal";
 if(inPortal && !movePlayer.portalCooldown){
   movePlayer.portalCooldown=2.0;
   enterDimension(dimension==="overworld"?"nether":"overworld");
   return;
 }
 movePlayer.portalCooldown=Math.max(0,(movePlayer.portalCooldown||0)-dt);
 if(inWater){player.vel.y=Math.max(player.vel.y,-1);if(keys.Space)player.vel.y=3;player.air=Math.min(20,player.air+dt*1.5)}else player.air=Math.min(20,player.air+dt*1.2);
 if(camera.position.y<0)damagePlayer(20,"falling into the void");
 if(!player.creative)player.hunger=Math.max(0,player.hunger-dt*.012);
 if(player.hunger===0)damagePlayer(dt*.15,"starvation");
 if(inWater)player.air-=dt*1.5;
 if(player.air<=0)damagePlayer(dt*.5,"drowning");
 playerLight.position.copy(camera.position);playerLight.intensity=dimension==="nether"?.35:0;
}
function damagePlayer(n,why){if(player.creative||player.dead)return;player.health-=n;if(player.health<=0){player.health=0;player.dead=true;document.querySelector("#death").classList.remove("hidden");document.querySelector("#death-reason").textContent=why}}
function respawn(){player.dead=false;player.health=20;player.hunger=20;player.air=20;camera.position.set(W/2+.5,heightAt(W/2,D/2)+3,D/2+.5);document.querySelector("#death").classList.add("hidden")}

function rayBlock(){
 raycaster.setFromCamera(center,camera);
 const hit=raycaster.intersectObjects([...meshes.values()],false)[0];
 if(!hit)return null;
 const m=hit.object,u=m.userData;
 const normal=hit.face.normal.clone().transformDirection(m.matrixWorld);
 return {mesh:m,x:u.x,y:u.y,z:u.z,type:u.type,normal};
}
function mineStartNow(){
 const t=rayBlock();if(!t||t.type==="water"||t.type==="portal")return;
 target=t;mineKey=key(t.x,t.y,t.z);mineStart=performance.now();
 document.querySelector("#mine-wrap").classList.add("mine-on");
 document.querySelector("#mine-label").textContent=BLOCKS[t.type].name;
}
function mineUpdate(){
 if(!target)return;
 const live=rayBlock();if(!live||key(live.x,live.y,live.z)!==mineKey){target=null;document.querySelector("#mine-wrap").classList.remove("mine-on");return}
 const elapsed=(performance.now()-mineStart)/1000;
 const speed=player.creative?0.05:(BLOCKS[target.type]?.hard||1.0)*(hasToolFor(target.type)?0.45:1);
 const p=Math.min(1,elapsed/speed);document.querySelector("#mine-progress").style.width=`${p*100}%`;
 if(p>=1){breakBlock(target);target=null;document.querySelector("#mine-wrap").classList.remove("mine-on")}
}
function hasToolFor(t){return false}
function breakBlock(t){
 const drop=BLOCKS[t.type].drop;
 setBlock(t.x,t.y,t.z,null);if(drop)dropItem(drop,1,new THREE.Vector3(t.x+.5,t.y+.5,t.z+.5));
 rebuildAround(t.x,t.y,t.z);
}
function placeBlock(){
 const t=rayBlock();if(!t)return;
 const type=ITEMS[selected];if((inv[type]||0)<=0)return;
 const p={x:t.x+Math.round(t.normal.x),y:t.y+Math.round(t.normal.y),z:t.z+Math.round(t.normal.z)};
 if(getBlock(p.x,p.y,p.z))return;
 if(Math.abs(p.x-camera.position.x)<1&&Math.abs(p.z-camera.position.z)<1&&p.y>camera.position.y-2&&p.y<camera.position.y+2)return;
 setBlock(p.x,p.y,p.z,type);inv[type]--;rebuildAround(p.x,p.y,p.z);updateHUD();
}
function dropSelected(){
 const type=ITEMS[selected];if((inv[type]||0)<=0)return;inv[type]--;dropItem(type,1,camera.position.clone().add(new THREE.Vector3(0,-.5,0)));updateHUD();
}

function updateHUD(){
 document.querySelector("#health").style.width=`${player.health/20*100}%`;
 document.querySelector("#hunger").style.width=`${player.hunger/20*100}%`;
 document.querySelector("#air").style.width=`${player.air/20*100}%`;
 document.querySelector("#coords").textContent=`${Math.floor(camera.position.x)}, ${Math.floor(camera.position.y)}, ${Math.floor(camera.position.z)}`;
 document.querySelector("#dimension").textContent=dimension.toUpperCase();
 document.querySelector("#biome").textContent=dimension==="overworld"?biomeAt(Math.floor(camera.position.x),Math.floor(camera.position.z)).toUpperCase():dimension==="nether"?"NETHER WASTES":"THE END";
 const hot=document.querySelector("#hotbar");hot.innerHTML="";
 ITEMS.slice(0,9).forEach((type,i)=>{const s=document.createElement("div");s.className="slot"+(i===selected?" sel":"");s.innerHTML=`<div class="name">${BLOCKS[type].name}</div><div class="swatch" style="background:${BLOCKS[type].color}"></div><div class="count">${inv[type]||0}</div>`;hot.appendChild(s)});
}
function updateInventory(){
 const g=document.querySelector("#grid");g.innerHTML="";
 ITEMS.forEach(type=>{const s=document.createElement("div");s.className="invslot";s.innerHTML=`<div class="nm">${BLOCKS[type].name}</div><div class="swatch" style="background:${BLOCKS[type].color};margin-top:8px"></div><div class="count">${inv[type]||0}</div>`;g.appendChild(s)});
 const list=document.querySelector("#recipe-list");list.className="recipes";list.innerHTML="";
 recipes.forEach((r,i)=>{const e=document.createElement("div");e.className="recipe";const req=Object.entries(r.need).map(([k,n])=>`${n}× ${BLOCKS[k]?.name||k}`).join(" + ");e.innerHTML=`<div><b>${r.name}</b><small>${req} → ${r.n}× ${r.out}</small></div><button data-i="${i}">CRAFT</button>`;list.appendChild(e)});
 list.querySelectorAll("button").forEach(b=>b.onclick=()=>craft(+b.dataset.i));
}
function craft(i){const r=recipes[i];if(!Object.entries(r.need).every(([k,n])=>(inv[k]||0)>=n)){document.querySelector("#craft-msg").textContent="Missing materials.";return}Object.entries(r.need).forEach(([k,n])=>inv[k]-=n);if(inv[r.out]===undefined)inv[r.out]=0;inv[r.out]+=r.n;document.querySelector("#craft-msg").textContent=`Crafted ${r.n} × ${r.out}`;updateInventory();updateHUD()}

function toast(t){const e=document.querySelector("#toast");e.textContent=t;e.style.opacity=1;clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.opacity=0,1800)}

document.querySelector("#start").onclick=()=>{document.querySelector("#boot").remove();controls.lock()};
document.querySelector("#closeInv").onclick=()=>document.querySelector("#inventory").classList.add("hidden");
document.querySelector("#respawn").onclick=respawn;
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
addEventListener("keydown",e=>{
 keys[e.code]=true;
 if(e.code==="KeyE"){const p=document.querySelector("#inventory");p.classList.toggle("hidden");if(!p.classList.contains("hidden")){controls.unlock();updateInventory()};else controls.lock()}
 if(e.code==="KeyQ")dropSelected();
 if(e.code==="KeyF"){player.flight=!player.flight;toast(player.flight?"Flight ON":"Flight OFF")}
 if(e.code==="KeyN"){seed=(Math.random()*2**32)>>>0;generateWorld();toast(`New world seed: ${seed}`)}
 if(e.code==="KeyP"){makePortal(Math.floor(camera.position.x)+4,Math.floor(camera.position.y-2),Math.floor(camera.position.z));}
 if(e.code.startsWith("Digit")){let n=+e.code.slice(5)-1;if(n>=0&&n<9)selected=n;updateHUD()}
 if(e.code==="Escape"){document.querySelector("#inventory").classList.add("hidden")}
});
addEventListener("keyup",e=>keys[e.code]=false);
addEventListener("mousedown",e=>{if(document.querySelector("#inventory").classList.contains("hidden")&&document.querySelector("#death").classList.contains("hidden")){if(e.button===0)mineStartNow();if(e.button===2)placeBlock()}});
addEventListener("mouseup",e=>{if(e.button===0)target=null;});
addEventListener("contextmenu",e=>e.preventDefault());
addEventListener("wheel",e=>{selected=(selected+(e.deltaY>0?1:ITEMS.length-1))%9;updateHUD()});
controls.addEventListener("lock",()=>{});
controls.addEventListener("unlock",()=>{});

generateWorld();
updateHUD();

function animate(){
 requestAnimationFrame(animate);
 const dt=Math.min(.05,clock.getDelta());
 updateLighting(dt);movePlayer(dt);mineUpdate();updateDrops(dt);updateMobs(dt);updateHUD();
 renderer.render(scene,camera);
}
animate();
