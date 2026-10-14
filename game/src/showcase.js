// 3D 角色展示：照片浮雕（去背照片 + 深度圖位移）站在全息展示台上。
// 可旋轉縮放、換裝溶解、招牌技能演出、動漫式出場動畫。
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {rarityOf, RARITY_LABEL} from './cards.js';

const params = new URLSearchParams(location.search);
const DOCTOR = params.get('doctor') || 'demo';
const BASE = `./assets/doctors/${DOCTOR}/`;
const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 取得正式資料後放在 assets/doctors/<id>/profile.json 覆蓋這些佔位內容。
const PLACEHOLDER = {
  name: '（姓名）', title: '主治醫師', rank: '主治醫師', dept: '乳房醫學中心', accent: '#ff5fa2',
  specialty: ['（專長一）', '（專長二）', '（專長三）'],
  stats: {手術: 82, 診斷: 88, 溝通: 92, 教學: 85, 研究: 78}, statsNote: '示範數值',
  skill: {name: '（招牌技能）', text: '技能說明待填：取材自醫師的專長與臨床風格。'},
  quote: '（一句想對病人說的話）',
  outfits: {coat: '白袍', scrubs: '刷手服'}
};

const FACE_HEIGHT = 0.24, FACE_Y = 1.62, RELIEF = 0.15, AZIMUTH = 0.5;

let profile, meta, renderer, composer, bloom, scene, camera, controls, clock = new THREE.Clock();
const figures = {}, uniformsShared = {uTime: {value: 0}, uAccent: {value: new THREE.Color('#ff5fa2')}};
let current = 'coat', cameraTween = null, lastInteract = 0, burst = null, particles;

async function init() {
  [meta, profile] = await Promise.all([
    fetch(BASE + 'meta.json').then(r => {if (!r.ok) throw Error('找不到角色素材，請先執行 tools/prepare_portrait.py'); return r.json();}),
    fetch(BASE + 'profile.json').then(r => (r.ok ? r.json() : {})).catch(() => ({}))
  ]);
  profile = {...PLACEHOLDER, ...profile};
  document.documentElement.style.setProperty('--accent', profile.accent);
  uniformsShared.uAccent.value.set(profile.accent);
  fillSheet();

  renderer = new THREE.WebGLRenderer({canvas: $('stage'), antialias: true, preserveDrawingBuffer: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;  // 保留膚色與白袍的真實顏色
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07050c, 0.12);
  camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60);
  camera.position.set(0, 1.38, 3.3);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.3, 0);
  Object.assign(controls, {enableDamping: true, enablePan: false, minDistance: 1.1, maxDistance: 7,
    minPolarAngle: 1.1, maxPolarAngle: 1.75, minAzimuthAngle: -AZIMUTH, maxAzimuthAngle: AZIMUTH});
  // 照片浮雕只有正面資訊，轉超過約 30 度邊緣會被拉長，所以限制水平旋轉角度。
  controls.addEventListener('start', () => {lastInteract = performance.now(); cameraTween = null;});

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.35, 0.5, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  buildBackdrop(); buildPedestal(); buildParticles();
  const loader = new THREE.TextureLoader();
  const names = Object.keys(meta).filter(n => profile.outfits[n] !== undefined);
  for (const name of names) figures[name] = await buildFigure(name, loader);
  for (const b of document.querySelectorAll('[data-outfit]')) {
    if (!figures[b.dataset.outfit]) b.remove();
    else b.textContent = profile.outfits[b.dataset.outfit];
  }
  current = figures.coat ? 'coat' : names[0];
  for (const [n, f] of Object.entries(figures)) {f.mesh.visible = n === current; f.u.uReveal.value = 0;}

  bindUI();
  addEventListener('resize', resize); resize();
  $('loading').remove();
  renderer.setAnimationLoop(tick);
  window.__showcase = {ready: true, play: playSkill, intro: playIntro, setOutfit};
  if (params.get('intro') !== '0') playIntro(); else reveal(figures[current], 1.4);
}

function fillSheet() {
  const rarity = rarityOf(profile.rank);
  $('rarity').className = `rarity ${rarity}`;
  $('rarity').textContent = `${RARITY_LABEL[rarity]}・${profile.rank}`;
  $('name').textContent = profile.name;
  $('title').textContent = `${profile.dept}　${profile.title}`;
  $('tags').innerHTML = profile.specialty.map(s => `<span>${s}</span>`).join('');
  $('stats').innerHTML = Object.entries(profile.stats).map(([k, v]) => `<div class="stat">${k}<i><b style="width:${v}%"></b></i><em>${v}</em></div>`).join('');
  $('stat-note').textContent = profile.statsNote || '';
  $('skill-name').textContent = profile.skill.name;
  $('skill-text').textContent = profile.skill.text;
  $('quote').textContent = `「${profile.quote}」`;
  document.title = `${profile.name}・角色展示`;
}

// ---------- 場景 ----------
function buildBackdrop() {
  const geo = new THREE.SphereGeometry(30, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: uniformsShared,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 uAccent; varying vec3 vP;
      void main(){ float h = normalize(vP).y; vec3 top = vec3(.02,.015,.04), mid = mix(vec3(.09,.04,.12), uAccent*.18, .5);
        vec3 c = mix(mid, top, smoothstep(-.05,.5,h)); c = mix(vec3(.01), c, smoothstep(-.4,0.,h)); gl_FragColor = vec4(c,1.); }`
  });
  scene.add(new THREE.Mesh(geo, mat));
}

function buildPedestal() {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.12, 64),
    new THREE.MeshStandardMaterial({color: 0x15101e, metalness: 0.8, roughness: 0.35}));
  base.position.y = 0.06; scene.add(base);
  scene.add(new THREE.HemisphereLight(0x8a7aa8, 0x0a0710, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(2, 4, 3); scene.add(key);
  const ringMat = new THREE.MeshBasicMaterial({color: uniformsShared.uAccent.value, toneMapped: false});
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.012, 8, 128), ringMat);
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.125; scene.add(ring);
  // 旋轉的刻度環：用 canvas 畫弧段當貼圖。
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.translate(256, 256); g.strokeStyle = '#fff';
  for (let i = 0; i < 48; i++) {g.lineWidth = i % 4 ? 2 : 6; g.beginPath(); g.arc(0, 0, 230, i / 48 * Math.PI * 2, (i + 0.55) / 48 * Math.PI * 2); g.stroke();}
  g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 200, 0, Math.PI * 2); g.stroke();
  const dial = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), new THREE.MeshBasicMaterial({map: new THREE.CanvasTexture(c), color: uniformsShared.uAccent.value, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false}));
  dial.rotation.x = -Math.PI / 2; dial.position.y = 0.13; dial.name = 'dial'; scene.add(dial);
  // 由下往上的光柱。
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.98, 2.6, 64, 1, true), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: uniformsShared,
    vertexShader: 'varying vec2 vUv; varying vec3 vN, vV; void main(){ vUv = uv; vN = normalMatrix * normal; vec4 mv = modelViewMatrix * vec4(position,1.); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform vec3 uAccent; uniform float uTime; varying vec2 vUv; varying vec3 vN, vV;
      void main(){ float edge = pow(1. - abs(dot(normalize(vN), normalize(vV))), 2.);  // 只在光柱邊緣發光，不遮住人物
        float a = pow(1.-vUv.y, 2.2) * .3 * edge; a *= .75 + .25*sin(vUv.x*80. + uTime*2.); gl_FragColor = vec4(uAccent, a); }`
  }));
  beam.position.y = 1.4; scene.add(beam);
  burst = new THREE.Mesh(new THREE.RingGeometry(0.96, 1.0, 96), new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false}));
  burst.rotation.x = -Math.PI / 2; burst.position.y = 0.14; scene.add(burst);
}

function buildParticles() {
  const n = 260, pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {const a = Math.random() * Math.PI * 2, r = 0.5 + Math.random() * 0.6; pos.set([Math.cos(a) * r, Math.random() * 2.8, Math.sin(a) * r], i * 3); seed[i] = Math.random();}
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const u = {...uniformsShared, uSpeed: {value: 1}};
  particles = new THREE.Points(geo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: u,
    vertexShader: `uniform float uTime, uSpeed; attribute float seed; varying float vA;
      void main(){ vec3 p = position; float t = fract(seed + uTime*.06*uSpeed); p.y = t*2.8;
        float ang = uTime*.2*uSpeed + seed*6.28; p.xz = mat2(cos(ang),-sin(ang),sin(ang),cos(ang)) * p.xz;
        vA = sin(t*3.14159); vec4 mv = modelViewMatrix * vec4(p,1.); gl_PointSize = (2. + seed*3.) * 3. / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uAccent; varying float vA; void main(){ float d = length(gl_PointCoord-.5); if(d>.5) discard; gl_FragColor = vec4(mix(uAccent, vec3(1.), .5), vA*(1.-d*2.)); }`
  }));
  scene.add(particles);
}

// ---------- 人物浮雕 ----------
async function buildFigure(name, loader) {
  const [map, depth] = await Promise.all([loader.loadAsync(BASE + `${name}.png`), loader.loadAsync(BASE + `${name}-depth.png`)]);
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const {size: [w, h], face: [fx, fy, fw, fh]} = meta[name];
  const k = FACE_HEIGHT / (fh * h), W = w * k, H = h * k;
  const u = {...uniformsShared, map: {value: map}, depthMap: {value: depth}, uRelief: {value: RELIEF}, uReveal: {value: 1}, uBreath: {value: 1}};
  const mat = new THREE.ShaderMaterial({
    uniforms: u, side: THREE.DoubleSide, transparent: true,
    vertexShader: `uniform sampler2D depthMap; uniform float uRelief, uTime, uBreath; varying vec2 vUv; varying vec3 vView; varying float vDepth;
      void main(){ vUv = uv; float d = texture2D(depthMap, uv).r; vDepth = d; vec3 p = position;
        p.z += d * uRelief;
        float upper = smoothstep(.25, .75, uv.y);
        p.y += sin(uTime*1.7) * .006 * upper * uBreath;           // 呼吸
        p.z += sin(uTime*1.7 + 1.2) * .004 * upper * uBreath;
        vec4 mv = modelViewMatrix * vec4(p,1.); vView = mv.xyz; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 uAccent; uniform float uReveal, uTime; varying vec2 vUv; varying vec3 vView; varying float vDepth;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
      void main(){
        vec4 c = texture2D(map, vUv);
        float fade = smoothstep(0., .14, vUv.y);                   // 下緣淡出，像從光柱中浮現
        // 由下往上掃描出現；邊緣帶雜訊與發光。
        float edge = vUv.y + (noise(vUv*38.)-.5)*.08;
        float th = uReveal*1.2 - .1;
        if (edge > th) discard;
        float glow = 1. - smoothstep(0., .035, th - edge);
        float a = c.a * fade;
        if (a < .03) discard;
        vec3 n = normalize(cross(dFdx(vView), dFdy(vView)));
        float rim = pow(1. - abs(dot(n, normalize(-vView))), 3.);
        vec3 col = c.rgb * (.9 + .08*vDepth);
        if (!gl_FrontFacing) {                                       // 背面：全息剪影
          float scan = .6 + .4*sin(vUv.y*400. - uTime*6.);
          col = mix(vec3(.04,.03,.08), uAccent*.5, .3) * scan; rim *= 2.;
        }
        col += uAccent * rim * .3 + uAccent * glow * 2.5;
        gl_FragColor = vec4(col, max(a, glow*c.a));
      }`
  });
  mat.extensions = {derivatives: true};
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H, 220, Math.round(220 * H / W)), mat);
  mesh.position.set((0.5 - (fx + fw / 2)) * W, FACE_Y + ((fy + fh / 2) - 0.5) * H, 0);
  // 底部比展示台高時稍微下移，避免懸空。
  const bottom = mesh.position.y - H / 2;
  if (bottom > 0.35) mesh.position.y -= bottom - 0.35;
  mesh.renderOrder = 2;  // 在光柱與粒子之後繪製，避免被染色
  scene.add(mesh);
  return {mesh, u, faceY: mesh.position.y + (0.5 - (fy + fh / 2)) * H};
}

// ---------- 動畫 ----------
const tweens = [];
function tween(dur, fn, done) {tweens.push({t: 0, dur, fn, done}); }
const ease = t => 1 - Math.pow(1 - t, 3);

function reveal(fig, dur = 1.2, out = false) {
  fig.mesh.visible = true;
  tween(reduced ? 0.01 : dur, t => {fig.u.uReveal.value = out ? 1 - t : t;}, () => {if (out) fig.mesh.visible = false;});
}

function setOutfit(name) {
  if (name === current || !figures[name]) return;
  reveal(figures[current], 0.7, true);
  const next = name; current = name;
  setTimeout(() => reveal(figures[next], 1.0), reduced ? 0 : 450);
  document.querySelectorAll('[data-outfit]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.outfit === name)));
  pulse(0.6);
}

function moveCamera(pos, target, dur = 1.1) {
  const p0 = camera.position.clone(), t0 = controls.target.clone();
  cameraTween = {t: 0, dur: reduced ? 0.01 : dur, p0, t0, p1: new THREE.Vector3(...pos), t1: new THREE.Vector3(...target)};
}
const VIEWS = {
  front: () => [[0, 1.38, 3.3], [0, 1.3, 0]],
  face: () => [[0, figures[current].faceY + 0.02, 1.05], [0, figures[current].faceY, 0]],
  side: () => [[3.3 * Math.sin(AZIMUTH * 0.9), 1.45, 3.3 * Math.cos(AZIMUTH * 0.9)], [0, 1.3, 0]]
};

function pulse(strength = 1) {
  burst.material.opacity = 0.9 * strength; burst.scale.setScalar(1);
  tween(1.2, t => {burst.scale.setScalar(1 + ease(t) * 4); burst.material.opacity = 0.9 * strength * (1 - t); bloom.strength = 0.35 + 0.7 * strength * (1 - t);});
}

function playSkill() {
  const [p, t] = VIEWS.face();
  moveCamera(p, t, 0.9);
  particles.material.uniforms.uSpeed.value = 6;
  pulse(1);
  setTimeout(() => pulse(0.7), 350);
  $('banner-skill').textContent = profile.skill.name;
  $('banner-quote').textContent = `「${profile.quote}」`;
  const b = $('skill-banner'); b.hidden = false;
  b.querySelectorAll('span').forEach(s => {s.style.animation = 'none'; void s.offsetWidth; s.style.animation = '';});
  setTimeout(() => {b.hidden = true; particles.material.uniforms.uSpeed.value = 1; const [p2, t2] = VIEWS.front(); moveCamera(p2, t2, 1.4);}, reduced ? 1500 : 2600);
}

// 動漫式出場：速度線 → 眼神特寫 → 剪影 → 斬光 → 名字砸下 → 白閃 → 3D 掃描出現。
let introTimer = null, speedRAF = null;
function playIntro() {
  const el = $('intro');
  Object.values(figures).forEach(f => {f.mesh.visible = false; f.u.uReveal.value = 0;});
  $('intro-name').textContent = profile.name;
  $('intro-dept').textContent = profile.dept;
  $('intro-title').textContent = `${profile.title}・${profile.skill.name}`;
  const src = BASE + `${current}.png`;
  $('silhouette').src = src;
  $('eyes').style.backgroundImage = `url(${src})`;
  el.hidden = false; el.classList.remove('play', 'shake'); void el.offsetWidth; el.classList.add('play', 'shake');
  positionEyes();
  runSpeedLines();
  clearTimeout(introTimer);
  introTimer = setTimeout(endIntro, reduced ? 300 : 3800);
}
function positionEyes() {
  // 背景圖寬 = 面板寬 × zoom；眼睛的像素位置換算成面板中心對齊。
  const eyes = $('eyes'), fig = meta[current], [fx, fy, fw, fh] = fig.face;
  const box = eyes.getBoundingClientRect(), zoom = 1 / (fw * 1.3);
  const imgW = box.width * zoom, imgH = imgW * fig.size[1] / fig.size[0];
  const ex = (fx + fw / 2) * imgW, ey = (fy + fh * 0.42) * imgH;
  eyes.style.backgroundSize = `${imgW}px ${imgH}px`;
  eyes.style.backgroundPosition = `${box.width / 2 - ex}px ${box.height / 2 - ey}px`;
}
function endIntro() {
  clearTimeout(introTimer); cancelAnimationFrame(speedRAF);
  $('intro').hidden = true;
  const [p, t] = VIEWS.front();
  camera.position.set(0, 1.2, 6.5); controls.target.set(0, 1.2, 0);
  moveCamera(p, t, 1.8);
  reveal(figures[current], 1.6);
  pulse(1);
}
function runSpeedLines() {
  const c = $('speed'), g = c.getContext('2d');
  const draw = time => {
    c.width = innerWidth; c.height = innerHeight;
    const cx = c.width / 2, cy = c.height * 0.45, R = Math.hypot(c.width, c.height);
    g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 140; i++) {
      const a = (i / 140) * Math.PI * 2 + Math.sin(i * 12.9) * 0.05, inner = R * (0.18 + 0.15 * Math.abs(Math.sin(i * 7.3 + time * 0.02)));
      g.strokeStyle = i % 5 ? 'rgba(255,255,255,.55)' : getComputedStyle(document.documentElement).getPropertyValue('--accent');
      g.lineWidth = 1 + (i % 3);
      g.beginPath(); g.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke();
    }
    speedRAF = requestAnimationFrame(draw);
  };
  speedRAF = requestAnimationFrame(draw);
}

// ---------- UI ----------
function bindUI() {
  document.querySelectorAll('[data-outfit]').forEach(b => b.onclick = () => setOutfit(b.dataset.outfit));
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => {const [p, t] = VIEWS[b.dataset.view](); moveCamera(p, t);});
  $('act-skill').onclick = playSkill;
  $('act-intro').onclick = playIntro;
  $('skip').onclick = endIntro;
  $('intro').addEventListener('click', e => {if (e.target.id !== 'skip') endIntro();});
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h);
  camera.aspect = w / h;
  // 窄螢幕時把人物往上、往遠移，避開下方面板。
  camera.setViewOffset(w, h, w > 820 ? w * 0.09 : 0, w > 820 ? 0 : h * 0.18, w, h);
  camera.updateProjectionMatrix();
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05), now = performance.now();
  uniformsShared.uTime.value += dt;
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i]; tw.t = Math.min(1, tw.t + dt / tw.dur); tw.fn(ease(tw.t));
    if (tw.t >= 1) {tweens.splice(i, 1); tw.done?.();}
  }
  if (cameraTween) {
    const c = cameraTween; c.t = Math.min(1, c.t + dt / c.dur); const e = ease(c.t);
    camera.position.lerpVectors(c.p0, c.p1, e); controls.target.lerpVectors(c.t0, c.t1, e);
    if (c.t >= 1) cameraTween = null;
  }
  // 閒置時人物輕微左右轉動，展示立體感。
  // 鏡頭越近擺幅越小：近看時浮雕側面的拉伸最明顯。
  const idle = !reduced && now - lastInteract > 4000 && !cameraTween;
  const sway = 0.15 * THREE.MathUtils.smoothstep(camera.position.distanceTo(controls.target), 1.4, 3.2);
  for (const f of Object.values(figures)) f.mesh.rotation.y += ((idle ? Math.sin(uniformsShared.uTime.value * 0.35) * sway : 0) - f.mesh.rotation.y) * 0.03;
  scene.getObjectByName('dial').rotation.z += dt * 0.15;
  controls.update();
  composer.render();
}

init().catch(err => {console.error(err); $('loading').textContent = '角色載入失敗：' + err.message; window.__showcase = {ready: false, error: err.message};});
