import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/PointerLockControls.js';

// VoxelCraft Ultra: an original browser voxel sandbox. Visual direction follows the supplied references:
// cinematic skies, strong sun shafts, dense grass/flowers, volumetric-looking fog and high-detail procedural textures.

const X=80,Z=80,H=52, SEA=18, CH=16, REACH=7;
const AIR=0, GRASS=1, DIRT=2, STONE=3, SAND=4, WOOD=5, LEAVES=6, WATER=7, FLOWER=8, GLASS=9, COAL=10, IRON=11, OBSIDIAN=12, NETHERRACK=13, SOUL=14, ENDSTONE=15, BRICK=16, TORCH=17, SNOW=18;
const B={
 [AIR]:{name:'Air',hard:0,drop:null,solid:false,icon:''},[GRASS]:{name:'Grass Block',hard:0.65,drop:GRASS,solid:true,icon:'▦'},[DIRT]:{name:'Dirt',hard:.5,drop:DIRT,solid:true,icon:'▪'},[STONE]:{name:'Stone',hard:1.5,drop:STONE,solid:true,icon:'◆'},[SAND]:{name:'Sand',hard:.35,drop:SAND,solid:true,icon:'◈'},[WOOD]:{name:'Oak Log',hard:2,drop:WOOD,solid:true,icon:'▤'},[LEAVES]:{name:'Leaves',hard:.25,drop:LEAVES,solid:true,icon:'✦'},[WATER]:{name:'Water',hard:0,drop:null,solid:false,fluid:true,icon:'≈'},[FLOWER]:{name:'Wildflower',hard:.1,drop:FLOWER,solid:false,icon:'✿'},[GLASS]:{name:'Glass',hard:.3,drop:GLASS,solid:true,icon:'□'},[COAL]:{name:'Coal Ore',hard:3,drop:COAL,solid:true,icon:'●'},[IRON]:{name:'Iron Ore',hard:3,drop:IRON,solid:true,icon:'●'},[OBSIDIAN]:{name:'Obsidian',hard:8,drop:OBSIDIAN,solid:true,icon:'⬢'},[NETHERRACK]:{name:'Netherrack',hard:.4,drop:NETHERRACK,solid:true,icon:'◆'},[SOUL]:{name:'Soul Soil',hard:.5,drop:SOUL,solid:true,icon:'◆'},[ENDSTONE]:{name:'End Stone',hard:3,drop:ENDSTONE,solid:true,icon:'◇'},[BRICK]:{name:'Brick',hard:2,drop:BRICK,solid:true,icon:'▦'},[TORCH]:{name:'Torch',hard:0,drop:TORCH,solid:false,icon:'♨'}
};
const hot=[GRASS,DIRT,STONE,WOOD,LEAVES,SAND,TORCH,COAL,IRON];
const recipes=[
 {name:'Planks',in:[[WOOD,1]],out:[WOOD,4]},
 {name:'Torch',in:[[COAL,1],[WOOD,1]],out:[TORCH,4]},
 {name:'Glass',in:[[SAND,4]],out:[GLASS,1]},
 {name:'Brick',in:[[STONE,4]],out:[BRICK,4]},
 {name:'Obsidian',in:[[STONE,8]],out:[OBSIDIAN,1]}
];

const scene=new THREE.Scene(); scene.background=new THREE.Color(0x8fb5d5); scene.fog=new THREE.FogExp2(0x8fb5d5,.0095);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.05,180);
camera.position.set(X/2+0.5,28,Z/2+0.5);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.8)); renderer.setSize(innerWidth,innerHeight); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.08; document.querySelector('#game').appendChild(renderer.domElement);

const hemi=new THREE.HemisphereLight(0xb9d9ff,0x172019,.5); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe2b3,2.8); sun.position.set(-45,75,25); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-55;sun.shadow.camera.right=55;sun.shadow.camera.top=55;sun.shadow.camera.bottom=-55;sun.shadow.camera.near=1;sun.shadow.camera.far=170; scene.add(sun);
const moon=new THREE.DirectionalLight(0x5d74b8,0); moon.position.set(20,50,-30); scene.add(moon);
const controls=new PointerLockControls(camera,document.body); scene.add(camera);

const world=new Uint8Array(X*H*Z); const heightMap=new Uint8Array(X*Z); const biomeMap=new Array(X*Z); const chunks=new Map();
const drops=[]; const mobs=[]; const particles=[]; const lights=[];
let selected=0, invOpen=false, paused=false, dead=false, gameTime=.32, day=1, last=performance.now(), damageCooldown=0, seed=472918;
const inventory={}; hot.forEach(id=>inventory[id]=id===GRASS?12:0); inventory[DIRT]=24; inventory[STONE]=16; inventory[WOOD]=6; inventory[SAND]=8;

function idx(x,y,z){return x+X*(z+Z*y)} function inWorld(x,y,z){return x>=0&&x<X&&y>=0&&y<H&&z>=0&&z<Z}
function get(x,y,z){return inWorld(x,y,z)?world[idx(x,y,z)]:AIR} function set(x,y,z,v){if(inWorld(x,y,z))world[idx(x,y,z)]=v}
function hash(x,z,s=seed){let n=(x*374761393+z*668265263+s*69069)|0;n=(n^(n>>>13))*1274126177|0;return ((n^(n>>>16))>>>0)/4294967295}
function noise2(x,z){const x0=Math.floor(x),z0=Math.floor(z),fx=x-x0,fz=z-z0;const a=hash(x0,z0),b=hash(x0+1,z0),c=hash(x0,z0+1),d=hash(x0+1,z0+1);const u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);return a+(b-a)*u+((c+(d-c)*u)-(a+(b-a)*u))*v}
function fbm(x,z){let s=0,a=.5,n=0;for(let i=0;i<5;i++){s+=noise2(x,z)*a;n+=a;x*=2.02;z*=2.02;a*=.5}return s/n}
function caveNoise(x,y,z){return (Math.sin(x*.23+y*.13+z*.17)+Math.sin(x*.09-y*.19+z*.27)+Math.sin(x*.31+y*.07-z*.11))/3}

function generateWorld(){
  world.fill(AIR);
  for(let x=0;x<X;x++)for(let z=0;z<Z;z++){
    const n=fbm(x*.035,z*.035), detail=fbm(x*.11+40,z*.11+40); let h=Math.floor(21+n*16+detail*4);
    const temp=fbm(x*.025+200,z*.025+200), wet=fbm(x*.025-100,z*.025-100);
    let biome=temp<.27?'SNOW':temp>.72?'DESERT':wet>.67?'SWAMP':wet<.28?'PLAINS':'FOREST';
    if(h>39)biome='MOUNTAIN'; if(wet>.76&&temp>.6)biome='JUNGLE'; biomeMap[x+X*z]=biome;
    heightMap[x+X*z]=Math.min(H-2,h);
    for(let y=0;y<=h;y++){
      let v=y<h-4?STONE:(y<h-1?(biome==='DESERT'?SAND:DIRT):(biome==='DESERT'?SAND:biome==='SNOW'?SNOW:GRASS));
      if(biome==='MOUNTAIN'&&y>h-3)v=STONE;
      if(y>3&&y<h-3&&y<32&&caveNoise(x,y,z)>.52&&fbm(x*.08+70,z*.08+70)>.43)v=AIR;
      if(v!==AIR)set(x,y,z,v);
      if(y<9&&hash(x+y,z-y)>.965)set(x,y,z,COAL); else if(y<24&&hash(x-y,z+y)>.975)set(x,y,z,IRON);
    }
    if(h<SEA)for(let y=h+1;y<=SEA;y++)set(x,y,z,WATER);
  }
  // vegetation / trees / flowers
  for(let x=2;x<X-2;x++)for(let z=2;z<Z-2;z++){
    const h=heightMap[x+X*z], biome=biomeMap[x+X*z]; if(h<SEA||get(x,h,z)!==GRASS)continue;
    const r=hash(x*3,z*7);
    if((biome==='FOREST'||biome==='JUNGLE')&&r>.86)tree(x,h+1,z,biome==='JUNGLE'?5:4);
    else if(r>.72&&r<.86)set(x,h+1,z,FLOWER);
    else if(r>.62&&r<.69)set(x,h+1,z,FLOWER);
  }
  // Nether and End gateways are represented by naturally reachable portal structures at two corners.
  buildPortal(X/2,SEA+1,Z/2+24,'NETHER');
  buildPortal(X/2+24,SEA+1,Z/2,'END');
  rebuildAll(); spawnInitialMobs();
}
B[SNOW]={name:'Snow Block',hard:.2,drop:SNOW,solid:true,icon:'❄'}; hot.push(SNOW);
function tree(x,y,z,h){for(let i=0;i<h;i++)set(x,y+i,z,WOOD);for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=h-2;dy<=h;dy++){if(Math.abs(dx)+Math.abs(dz)<4&&hash(x+dx*5,z+dz*3+dy)>.12)set(x+dx,y+dy,z+dz,LEAVES)}}
function buildPortal(cx,cy,cz,type){const base=type==='END'?OBSIDIAN:NETHERRACK; for(let x=-2;x<=2;x++)for(let y=0;y<=5;y++){if(x===-2||x===2||y===0||y===5)set(cx+x,cy+y,cz,base)} for(let x=-1;x<=1;x++)for(let y=1;y<=4;y++)set(cx+x,cy+y,cz,type==='END'?ENDSTONE:TORCH);}

const atlas=makeAtlas();
const tex=new THREE.CanvasTexture(atlas); tex.colorSpace=THREE.SRGBColorSpace; tex.magFilter=THREE.LinearFilter; tex.minFilter=THREE.LinearMipmapLinearFilter; tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
const mat=new THREE.MeshStandardMaterial({map:tex,roughness:.88,metalness:.02,vertexColors:true});
const waterMat=new THREE.MeshPhysicalMaterial({color:0x4d9ac0,transparent:true,opacity:.67,roughness:.12,metalness:0,transmission:.08,depthWrite:false});
function makeAtlas(){const s=128,c=document.createElement('canvas');c.width=c.height=s*4;const g=c.getContext('2d');const tile={};let i=0;for(const id of [GRASS,DIRT,STONE,SAND,WOOD,LEAVES,WATER,FLOWER,GLASS,COAL,IRON,OBSIDIAN,NETHERRACK,SOUL,ENDSTONE,BRICK,SNOW]){tile[id]=i++; const ox=(tile[id]%4)*s,oy=Math.floor(tile[id]/4)*s; const base={1:'#4f7c3a',2:'#654b32',3:'#747a7a',4:'#c9b477',5:'#775034',6:'#3d733b',7:'#4b91b7',8:'#6da84c',9:'#cfe4e9',10:'#555b59',11:'#8b8f8c',12:'#252038',13:'#873f32',14:'#5b4036',15:'#d1c58e',16:'#9a5941',18:'#eef4ee'}[id]||'#777';g.fillStyle=base;g.fillRect(ox,oy,s,s);for(let p=0;p<1700;p++){const x=ox+Math.random()*s,y=oy+Math.random()*s;const a=.06+Math.random()*.2;g.fillStyle=`rgba(${Math.random()*255|0},${Math.random()*255|0},${Math.random()*255|0},${a})`;g.fillRect(x,y,1+Math.random()*2,1+Math.random()*2)}if(id===GRASS){g.fillStyle='#6e9b48';g.fillRect(ox,oy,s,8)}if(id===WOOD){g.strokeStyle='rgba(25,12,5,.5)';for(let k=10;k<s;k+=22){g.beginPath();g.moveTo(ox+k,oy);g.lineTo(ox+k+Math.sin(k)*5,oy+s);g.stroke()}}if(id===LEAVES){for(let p=0;p<150;p++){g.fillStyle='rgba(120,180,80,.35)';g.fillRect(ox+Math.random()*s,oy+Math.random()*s,4,4)}}if(id===FLOWER){g.clearRect(ox,oy,s,s);g.fillStyle='#39713c';g.fillRect(61+ox,45+oy,6,75);g.fillStyle='#fff';for(let a=0;a<6;a++){g.beginPath();g.arc(64+ox+Math.cos(a)*14,42+oy+Math.sin(a)*14,8,0,7);g.fill()}g.fillStyle='#e4bd47';g.beginPath();g.arc(64+ox,42+oy,7,0,7);g.fill()}if(id===GLASS){g.clearRect(ox,oy,s,s);g.strokeStyle='rgba(230,255,255,.8)';g.lineWidth=4;g.strokeRect(3+ox,3+oy,s-6,s-6)}}return c}
function uvFor(id,face){const t=(id-1);const tx=t%4,ty=Math.floor(t/4);const u0=tx/4,v0=ty/4,u1=u0+.25,v1=v0+.25;return [u0,v1,u1,v1,u1,v0,u0,v0]}

const faceDefs=[[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,-1]],[[1,0,0],[1,0,1],[1,1,1],[1,1,0],[1,0,0]],[[0,0,1],[0,0,0],[0,1,0],[0,1,1],[0,0,1]],[[0,1,1],[1,1,1],[1,1,0],[0,1,0],[0,1,0]],[[0,0,1],[1,0,1],[1,0,0],[0,0,0],[0,-1,0]],[[0,1,0],[1,1,0],[1,1,1],[0,1,1],[0,1,0]]];
const normals=[[0,0,-1],[1,0,0],[0,0,1],[-1,0,0],[0,-1,0],[0,1,0]];
function rebuildChunk(cx,cz){const key=cx+','+cz; if(chunks.has(key)){scene.remove(chunks.get(key));chunks.delete(key)} const pos=[],uv=[],norm=[],col=[]; const cgroup=new THREE.Group();
 for(let x=cx*CH;x<Math.min(X,(cx+1)*CH);x++)for(let y=0;y<H;y++)for(let z=cz*CH;z<Math.min(Z,(cz+1)*CH);z++){const id=get(x,y,z);if(!id||id===FLOWER||id===TORCH)continue;for(let f=0;f<6;f++){const n=normals[f],nx=x+n[0],ny=y+n[1],nz=z+n[2];let nb=get(nx,ny,nz);if(id===WATER?nb===WATER:(nb!==AIR&&nb!==FLOWER&&nb!==TORCH&&(!B[nb]?.fluid)))continue;const fd=faceDefs[f][0];const verts=faceDefs[f].slice(0,4);for(const p of verts)pos.push(x+p[0],y+p[1],z+p[2]);for(let k=0;k<4;k++)norm.push(...n);const q=uvFor(id,f);uv.push(q[0],q[1],q[2],q[3],q[4],q[5],q[6],q[7]);const shade=[.72,.86,.72, .65,.56,1][f];for(let k=0;k<4;k++)col.push(shade,shade,shade)}}}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));const idxs=[];for(let i=0;i<pos.length/3;i+=4)idxs.push(i,i+1,i+2,i,i+2,i+3);geo.setIndex(idxs);geo.computeBoundingSphere();const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=true;mesh.receiveShadow=true;cgroup.add(mesh);
 // transparent/plant blocks as tiny crossed cards
 for(let x=cx*CH;x<Math.min(X,(cx+1)*CH);x++)for(let z=cz*CH;z<Math.min(Z,(cz+1)*CH);z++)for(let y=0;y<H;y++){const id=get(x,y,z);if(id===FLOWER){const m=new THREE.Mesh(new THREE.PlaneGeometry(.7,1),new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.2,side:THREE.DoubleSide}));m.position.set(x+.5,y+.5,z+.5);m.rotation.y=Math.PI/4;cgroup.add(m)}if(id===TORCH){const t=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,.55,7),new THREE.MeshStandardMaterial({color:0x8d5a35,roughness:.7}));t.position.set(x+.5,y+.27,z+.5);cgroup.add(t);const l=new THREE.PointLight(0xffbd67,1.7,7,.7);l.position.set(x+.5,y+.65,z+.5);cgroup.add(l)}}
 scene.add(cgroup);chunks.set(key,cgroup)}
function rebuildAll(){for(const c of chunks.values())scene.remove(c);chunks.clear();for(let cx=0;cx<Math.ceil(X/CH);cx++)for(let cz=0;cz<Math.ceil(Z/CH);cz++)rebuildChunk(cx,cz)}
function rebuildAround(x,z){const cx=Math.floor(x/CH),cz=Math.floor(z/CH);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)if(cx+dx>=0&&cz+dz>=0&&cx+dx<Math.ceil(X/CH)&&cz+dz<Math.ceil(Z/CH))rebuildChunk(cx+dx,cz+dz)}

const player={vel:new THREE.Vector3(),onGround:false,health:20,food:20,oxygen:20,speed:5.2,height:1.75,radius:.32};
const keys={};addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='KeyE')toggleInventory();if(e.code==='KeyQ'&&!invOpen)dropSelected();if(e.code.startsWith('Digit')){const n=+e.code.slice(5)-1;if(n>=0&&n<9){selected=n;renderHotbar()}}if(e.code==='Escape'&&controls.isLocked){controls.unlock();paused=true;show('pause')}});addEventListener('keyup',e=>keys[e.code]=false);
renderer.domElement.addEventListener('click',()=>{if(!invOpen&&!dead){controls.lock();hide('pause')}});
let pointerDown=false;renderer.domElement.addEventListener('mousedown',e=>{if(!controls.isLocked)return;if(e.button===0){pointerDown=true;mineOrAttack()}if(e.button===2)placeBlock()});renderer.domElement.addEventListener('mouseup',e=>{if(e.button===0){pointerDown=false;keys.Mouse0=false;mining=null}});renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
function selectedId(){return hot[selected]||GRASS}
function mineOrAttack(){const hit=raycast();if(!hit)return;const {x,y,z,id}=hit;if(id===WATER||id===AIR)return;const mob=rayMob();if(mob){damageMob(mob,4);return}startMining(x,y,z,id)}
let mining=null;
function startMining(x,y,z,id){if(mining&&mining.x===x&&mining.y===y&&mining.z===z)return;mining={x,y,z,id,t:0,max:Math.max(.18,B[id].hard*.55)};document.body.classList.add('minePulse')}
function updateMining(dt){if(!mining)return;const h=raycast();if(!h||h.x!==mining.x||h.y!==mining.y||h.z!==mining.z){mining=null;return}if(pointerDown||keys.Mouse0)mining.t+=dt;else{mining.t+=dt*.35}if(mining.t>=mining.max){breakBlock(mining.x,mining.y,mining.z,mining.id);mining=null}}
function breakBlock(x,y,z,id){set(x,y,z,AIR);rebuildAround(x,z);const drop=B[id]?.drop;if(drop)spawnDrop(x+.5,y+.45,z+.5,drop,1);spawnParticles(new THREE.Vector3(x+.5,y+.5,z+.5),id);}
function placeBlock(){const id=selectedId();if((inventory[id]||0)<=0)return;const h=raycast();if(!h)return;let x=h.x+h.n[0],y=h.y+h.n[1],z=h.z+h.n[2];if(!inWorld(x,y,z)||get(x,y,z)!==AIR)return;if(x===Math.floor(camera.position.x)&&z===Math.floor(camera.position.z))return;set(x,y,z,id);inventory[id]--;rebuildAround(x,z);renderHotbar()}
function raycast(){const o=camera.position.clone(),d=new THREE.Vector3();camera.getWorldDirection(d);let p=o.clone();for(let i=0;i<REACH*20;i++){p.addScaledVector(d,.05);const x=Math.floor(p.x),y=Math.floor(p.y),z=Math.floor(p.z);const id=get(x,y,z);if(id&&id!==FLOWER&&id!==TORCH)return {x,y,z,id,n:faceNormal(p,x,y,z)}}return null}
function faceNormal(p,x,y,z){const dx=Math.min(Math.abs(p.x-x),Math.abs(p.x-(x+1))),dy=Math.min(Math.abs(p.y-y),Math.abs(p.y-(y+1))),dz=Math.min(Math.abs(p.z-z),Math.abs(p.z-(z+1)));if(dx<dy&&dx<dz)return [p.x<x+.5?-1:1,0,0];if(dy<dz)return [0,p.y<y+.5?-1:1,0];return [0,0,p.z<z+.5?-1:1]}

function spawnDrop(x,y,z,id,count){const g=new THREE.Group();const m=new THREE.Mesh(new THREE.BoxGeometry(.22,.22,.22),new THREE.MeshStandardMaterial({map:tex,roughness:.8}));m.position.y=0;g.add(m);g.position.set(x,y,z);g.userData={id,count,vel:new THREE.Vector3((Math.random()-.5)*2,3,(Math.random()-.5)*2)};scene.add(g);drops.push(g)}
function updateDrops(dt){for(let i=drops.length-1;i>=0;i--){const d=drops[i],v=d.userData.vel;v.y-=9*dt;d.position.addScaledVector(v,dt);d.rotation.x+=dt*3;d.rotation.y+=dt*5;const by=Math.floor(d.position.y-.2);if(by>=0&&get(Math.floor(d.position.x),by,Math.floor(d.position.z))!==AIR){d.position.y=by+1.05;v.y=0}const dist=d.position.distanceTo(camera.position);if(dist<1.4){const id=d.userData.id;inventory[id]=(inventory[id]||0)+d.userData.count;scene.remove(d);drops.splice(i,1);renderHotbar();renderInventory()}}}
function dropSelected(){const id=selectedId();if((inventory[id]||0)<=0)return;inventory[id]--;spawnDrop(camera.position.x,camera.position.y-0.6,camera.position.z,id,1);renderHotbar();renderInventory()}
function spawnParticles(pos,id){for(let i=0;i<9;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.07,.07,.07),new THREE.MeshBasicMaterial({map:tex}));m.position.copy(pos);m.userData={v:new THREE.Vector3((Math.random()-.5)*3,Math.random()*3,(Math.random()-.5)*3),life:.55};scene.add(m);particles.push(m)}}
function updateParticles(dt){for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.userData.life-=dt;p.userData.v.y-=7*dt;p.position.addScaledVector(p.userData.v,dt);p.scale.multiplyScalar(.96);if(p.userData.life<=0){scene.remove(p);particles.splice(i,1)}}}

function makeMob(type,x,y,z){const g=new THREE.Group();g.position.set(x,y,z);g.userData={type,hp:type==='ender_dragon'?200:20,speed:type==='piglin'?.9:type==='zombie'?1.1:.75,phase:Math.random()*9};const bodyMat=new THREE.MeshStandardMaterial({color:type==='pig'?0xd8919b:type==='cow'?0x4d382c:type==='zombie'?0x638c72:type==='skeleton'?0xc8c7bd:type==='piglin'?0xb35d53:type==='ender_dragon'?0x292333:0x333333,roughness:.8});
 const body=new THREE.Mesh(new THREE.BoxGeometry(type==='ender_dragon'?3.6:1.1,type==='ender_dragon'?1.2:1.2,type==='ender_dragon'?5.4:0.75),bodyMat);body.position.y=type==='ender_dragon'?2.8:0.75;g.add(body);
 const head=new THREE.Mesh(new THREE.BoxGeometry(type==='ender_dragon'?1.6:.85,type==='ender_dragon'?.95:.85,type==='ender_dragon'?1.6:.85),bodyMat);head.position.set(0,type==='ender_dragon'?3.0:1.55,type==='ender_dragon'?-2.4:-.18);g.add(head);
 if(type==='ender_dragon'){for(const s of [-1,1]){const wing=new THREE.Mesh(new THREE.BufferGeometry(),bodyMat);const v=new Float32Array([0,3,0,s*3.8,4.5,-.8,s*4.2,2.1,1.4]);wing.geometry.setAttribute('position',new THREE.BufferAttribute(v,3));wing.geometry.computeVertexNormals();g.add(wing)}}else{for(const s of [-1,1])for(const z0 of [-.23,.23]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.22,.75,.22),bodyMat);leg.position.set(s*.3,.38,z0);g.add(leg)}}
 scene.add(g);mobs.push(g);return g}
function spawnInitialMobs(){for(const m of mobs)scene.remove(m);mobs.length=0;const types=['pig','cow','zombie','skeleton','piglin'];for(let i=0;i<18;i++){let x=8+Math.random()*(X-16),z=8+Math.random()*(Z-16),y=heightMap[Math.floor(x)+X*Math.floor(z)]+1;const biome=biomeMap[Math.floor(x)+X*Math.floor(z)];let t=types[i%types.length];if(t==='piglin'&&biome!=='DESERT')t='pig';makeMob(t,x,y,z)}makeMob('ender_dragon',X/2+10,40,Z/2+10)}
function rayMob(){const o=camera.position,d=new THREE.Vector3();camera.getWorldDirection(d);let best=null,bd=REACH;for(const m of mobs){const to=m.position.clone().sub(o),dist=to.length();if(dist>REACH)continue;if(to.normalize().dot(d)>.96&&dist<bd){best=m;bd=dist}}return best}
function damageMob(m,amount){m.userData.hp-=amount;m.scale.setScalar(1.08);setTimeout(()=>m.scale.setScalar(1),70);if(m.userData.hp<=0){spawnDrop(m.position.x,m.position.y+.5,m.position.z,m.userData.type==='ender_dragon'?OBSIDIAN:FOOD_ID(),m.userData.type==='ender_dragon'?8:1);scene.remove(m);mobs.splice(mobs.indexOf(m),1)}}
function FOOD_ID(){return mFood[Math.floor(Math.random()*mFood.length)]} const mFood=[GRASS,SAND,WOOD];
function updateMobs(dt){for(const m of mobs){const u=m.userData;u.phase+=dt;const dist=m.position.distanceTo(camera.position);if(u.type==='ender_dragon'){m.position.y=35+Math.sin(u.phase*.55)*8;m.position.x=X/2+Math.cos(u.phase*.18)*25;m.position.z=Z/2+Math.sin(u.phase*.18)*25;m.lookAt(camera.position.x,m.position.y,camera.position.z);continue}if(dist<18&&u.type!=='pig'&&u.type!=='cow'){const dir=camera.position.clone().sub(m.position);dir.y=0;if(dir.length()>1.7){dir.normalize();m.position.addScaledVector(dir,u.speed*dt);m.rotation.y=Math.atan2(-dir.x,-dir.z)}else if(damageCooldown<=0){player.health-=u.type==='piglin'?3:1;damageCooldown=.9;updateBars()}}else{m.position.x+=Math.sin(u.phase*.7)*dt*.18;m.position.z+=Math.cos(u.phase*.61)*dt*.18}m.position.y=Math.floor(m.position.y-.1)>=0?heightMap[Math.max(0,Math.min(X-1,Math.floor(m.position.x)))+X*Math.max(0,Math.min(Z-1,Math.floor(m.position.z)))]+1:m.position.y}}

const craftGrid=document.querySelector('#craftGrid'),recipeList=document.querySelector('#recipeList'),backpack=document.querySelector('#backpack');
function toggleInventory(){invOpen=!invOpen;document.querySelector('#inventory').classList.toggle('hidden',!invOpen);if(invOpen){controls.unlock();renderInventory()}}
function renderHotbar(){const el=document.querySelector('#hotbar');el.innerHTML='';for(let i=0;i<9;i++){const id=hot[i]||GRASS;const d=document.createElement('div');d.className='hotSlot '+(i===selected?'sel':'');d.innerHTML=`<span class="num">${i+1}</span><span>${B[id]?.icon||''}</span><span class="small">${B[id]?.name||''}</span><span class="count">${inventory[id]||0}</span>`;d.onclick=()=>{selected=i;renderHotbar()};el.appendChild(d)}}
function renderInventory(){backpack.innerHTML='';const ids=Object.keys(B).map(Number).filter(id=>id!==AIR&&id!==WATER);for(const id of ids){const d=document.createElement('div');d.className='slot';d.innerHTML=`<span>${B[id].icon}</span><span class="name">${B[id].name}</span><span class="count">${inventory[id]||0}</span>`;d.onclick=()=>{if((inventory[id]||0)>0){const k=hot.indexOf(id);if(k>=0)selected=k;else hot[selected]=id;renderHotbar()}};backpack.appendChild(d)}recipeList.innerHTML='<h3>RECIPES</h3>';for(const r of recipes){const d=document.createElement('div');d.className='recipe';d.innerHTML=`<span>${r.in.map(a=>`${B[a[0]].icon}×${a[1]}`).join(' + ')}</span><b>→</b><span>${B[r.out[0][0]].icon}×${r.out[0][1]}</span><small>${r.name}</small>`;d.onclick=()=>craft(r);recipeList.appendChild(d)}craftGrid.innerHTML='';for(let i=0;i<9;i++){const d=document.createElement('div');d.className='slot';d.textContent='+';craftGrid.appendChild(d)}}
function craft(r){for(const [id,n] of r.in)if((inventory[id]||0)<n)return;for(const [id,n] of r.in)inventory[id]-=n;inventory[r.out[0][0]]=(inventory[r.out[0][0]]||0)+r.out[0][1];renderInventory();renderHotbar()}

function updatePlayer(dt){const speed=keys.ShiftLeft?8.2:5.2;const forward=new THREE.Vector3();camera.getWorldDirection(forward);forward.y=0;forward.normalize();const right=new THREE.Vector3().crossVectors(forward,camera.up).normalize();const wish=new THREE.Vector3();if(keys.KeyW)wish.add(forward);if(keys.KeyS)wish.sub(forward);if(keys.KeyD)wish.add(right);if(keys.KeyA)wish.sub(right);if(wish.length())wish.normalize();const water=get(Math.floor(camera.position.x),Math.floor(camera.position.y),Math.floor(camera.position.z))===WATER;player.vel.x=THREE.MathUtils.damp(player.vel.x,wish.x*speed,water?5:12,dt);player.vel.z=THREE.MathUtils.damp(player.vel.z,wish.z*speed,water?5:12,dt);player.vel.y-=(water?2.2:18)*dt;if(keys.Space){if(water)player.vel.y=3.2;else if(player.onGround){player.vel.y=7.4;player.onGround=false}}let np=camera.position.clone().addScaledVector(player.vel,dt);if(!collides(np)){camera.position.copy(np);player.onGround=false}else{if(player.vel.y<0)player.onGround=true;player.vel.y=0}if(camera.position.y<0)camera.position.y=1; if(camera.position.x<1)camera.position.x=1;if(camera.position.z<1)camera.position.z=1;if(camera.position.x>X-1)camera.position.x=X-1;if(camera.position.z>Z-1)camera.position.z=Z-1;
 const inWater=get(Math.floor(camera.position.x),Math.floor(camera.position.y),Math.floor(camera.position.z))===WATER;if(inWater){player.oxygen=Math.max(0,player.oxygen-dt);if(player.oxygen<=0&&damageCooldown<=0){player.health--;damageCooldown=.8}}else player.oxygen=Math.min(20,player.oxygen+dt*4);player.food=Math.max(0,player.food-dt*.003);if(player.food>17)player.health=Math.min(20,player.health+dt*.015);updateBars()}
function collides(p){const r=player.radius;const minX=Math.floor(p.x-r),maxX=Math.floor(p.x+r),minZ=Math.floor(p.z-r),maxZ=Math.floor(p.z+r),minY=Math.floor(p.y-player.height),maxY=Math.floor(p.y);for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++)for(let z=minZ;z<=maxZ;z++){const id=get(x,y,z);if(B[id]?.solid||id===GLASS||id===OBSIDIAN)return true}return false}

function updateSky(dt){gameTime+=dt*.003; if(gameTime>=1){gameTime-=1;day++}const a=gameTime*Math.PI*2-Math.PI/2;const sunY=Math.sin(a),sunX=Math.cos(a);sun.position.set(sunX*55,Math.max(4,sunY*75),25+sunX*25);const daylight=Math.max(0,Math.min(1,(sunY+.12)*1.3));sun.intensity=.15+2.8*daylight;hemi.intensity=.15+.5*daylight;moon.intensity=.12*(1-daylight);scene.background.setHSL(.58,.38,.28+.3*daylight);scene.fog.color.copy(scene.background);scene.fog.density=.007+.006*(1-daylight);document.querySelector('#clock').textContent=`DAY ${day} · ${String(Math.floor(gameTime*24)).padStart(2,'0')}:${String(Math.floor((gameTime*24%1)*60)).padStart(2,'0')}`}
function updateBiome(){const x=Math.max(0,Math.min(X-1,Math.floor(camera.position.x))),z=Math.max(0,Math.min(Z-1,Math.floor(camera.position.z)));document.querySelector('#biomeLabel').textContent=biomeMap[x+X*z]||'UNKNOWN'}
function updateBars(){document.querySelector('#healthFill').style.width=(player.health/20*100)+'%';document.querySelector('#foodFill').style.width=(player.food/20*100)+'%';document.querySelector('#oxygenFill').style.width=(player.oxygen/20*100)+'%';if(player.health<=0&&!dead){dead=true;controls.unlock();show('death');document.querySelector('#deathReason').textContent=player.oxygen<=0?'You ran out of air.':'A hostile mob defeated you.'}}
function show(id){document.querySelector('#'+id).classList.remove('hidden')}function hide(id){document.querySelector('#'+id).classList.add('hidden')}

document.querySelector('#closeInv').onclick=()=>toggleInventory();document.querySelector('#resume').onclick=()=>{paused=false;hide('pause');controls.lock()};document.querySelector('#respawn').onclick=()=>{dead=false;player.health=20;player.food=20;player.oxygen=20;camera.position.set(X/2+.5,30,Z/2+.5);hide('death');renderHotbar();controls.lock()};
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});

// Mobile touch controls
let joyActive=false,joyX=0,joyY=0;const joy=document.querySelector('#joy'),knob=document.querySelector('#knob');joy?.addEventListener('touchstart',e=>{joyActive=true;e.preventDefault()},{passive:false});joy?.addEventListener('touchmove',e=>{if(!joyActive)return;const r=joy.getBoundingClientRect(),t=e.touches[0],dx=t.clientX-(r.left+r.width/2),dy=t.clientY-(r.top+r.height/2),l=Math.min(38,Math.hypot(dx,dy)),a=Math.atan2(dy,dx);joyX=Math.cos(a)*l/38;joyY=Math.sin(a)*l/38;knob.style.transform=`translate(${joyX*38}px,${joyY*38}px)`;keys.KeyW=joyY<-.25;keys.KeyS=joyY>.25;keys.KeyA=joyX<-.25;keys.KeyD=joyX>.25;e.preventDefault()},{passive:false});joy?.addEventListener('touchend',()=>{joyActive=false;joyX=joyY=0;knob.style.transform='';for(const k of ['KeyW','KeyS','KeyA','KeyD'])keys[k]=false});document.querySelectorAll('.mobileBtns button[data-key]').forEach(b=>{b.addEventListener('touchstart',()=>keys[b.dataset.key]=true);b.addEventListener('touchend',()=>keys[b.dataset.key]=false)});document.querySelector('#mobileInv')?.addEventListener('touchstart',toggleInventory);

// Simple in-world interaction: continuous LMB mining and animation overlay.
addEventListener('mousedown',e=>{if(e.button===0)keys.Mouse0=true});addEventListener('mouseup',e=>{if(e.button===0)keys.Mouse0=false});

generateWorld();renderHotbar();renderInventory();

function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;if(!dead&&!invOpen&&!paused){damageCooldown=Math.max(0,damageCooldown-dt);updatePlayer(dt);updateMining(dt);updateDrops(dt);updateParticles(dt);updateMobs(dt);updateSky(dt);updateBiome();if(pointerDown||keys.Mouse0)mineOrAttack()}renderer.render(scene,camera)}requestAnimationFrame(loop);
