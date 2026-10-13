// Lightweight officer viewer (viewer.html): one officer's voxel model on its own rig, posed from its clips, on a plain
// stage with orbit controls. No map, crowd or post-processing, so it runs on phones and in software rendering.
// ?char=<id> picks the officer (default: the first in CHAR_ORDER).
import * as THREE from 'three';
import { CHARS, CHAR_ORDER } from './chars/index.js';
import { sampleClip, POSE_SIZE } from './hero/rig.js';
import { standOfficer, poseOfficer } from './ui/stage.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
let id = CHARS[params.get('char')] ? params.get('char') : CHAR_ORDER[0];

const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x120d0b);
scene.fog = new THREE.Fog(0x120d0b, 6, 14);
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
camera.position.set(1.2, 1.4, 4.2);
// Orbit: drag to turn (any angle round), wheel or pinch to zoom; eased toward the target values every frame.
const orbit = { yaw: 0.28, pitch: 0.12, dist: 4.4, tYaw: 0.28, tPitch: 0.12, tDist: 4.4, target: new THREE.Vector3(0, 1.0, 0) };
const pointers = new Map();
let pinch = 0;
const cv = renderer.domElement;
cv.addEventListener('pointerdown', (e) => { pointers.set(e.pointerId, [e.clientX, e.clientY]); cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', (e) => {
  const prev = pointers.get(e.pointerId);
  if (!prev) return;
  if (pointers.size === 1) {
    orbit.tYaw -= (e.clientX - prev[0]) * 0.008;
    orbit.tPitch = Math.max(-0.3, Math.min(0.9, orbit.tPitch + (e.clientY - prev[1]) * 0.005));
  }
  pointers.set(e.pointerId, [e.clientX, e.clientY]);
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (pinch) zoom(pinch / d);
    pinch = d;
  }
});
const up = (e) => { pointers.delete(e.pointerId); pinch = 0; };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('wheel', (e) => { e.preventDefault(); zoom(Math.exp(e.deltaY * 0.001)); }, { passive: false });
function zoom(k) {
  orbit.tDist = Math.max(1.0, Math.min(8, orbit.tDist * k));
  // closer in, the orbit centre rises toward the face
  orbit.target.y = 1.0 + 0.55 * (1 - Math.min(1, (orbit.tDist - 1) / 3.4));
}
const _t = new THREE.Vector3();
function updateCamera(dt) {
  const e = 1 - Math.exp(-dt * 10);
  orbit.yaw += (orbit.tYaw - orbit.yaw) * e; orbit.pitch += (orbit.tPitch - orbit.pitch) * e; orbit.dist += (orbit.tDist - orbit.dist) * e;
  _t.lerp(orbit.target, e);
  camera.position.set(_t.x + Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * orbit.dist, _t.y + Math.sin(orbit.pitch) * orbit.dist,
    _t.z + Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * orbit.dist);
  camera.lookAt(_t);
}
_t.copy(orbit.target);

scene.add(new THREE.HemisphereLight(0xfff0dc, 0x2a1c14, 1.4));
const key = new THREE.DirectionalLight(0xffe2b8, 2.4);
key.position.set(2.5, 4, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -2, right: 2, top: 3, bottom: -1 });
scene.add(key);
const rim = new THREE.DirectionalLight(0x9ad0ff, 1.2); rim.position.set(-3, 2.5, -3); scene.add(rim);
const floor = new THREE.Mesh(new THREE.CircleGeometry(1.6, 64), new THREE.MeshStandardMaterial({ color: 0x2a1f19, roughness: 0.9 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const ring = new THREE.Mesh(new THREE.RingGeometry(1.55, 1.6, 96), new THREE.MeshBasicMaterial({ color: 0xe8789e }));
ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; scene.add(ring);

const stage = new THREE.Group(); scene.add(stage);
const pose = new Float32Array(POSE_SIZE), origin = new THREE.Vector3(0, 0, 0);
let officer = null, clipId = 'idle', clipT = 0;

// Playable moves shown as buttons: idle, the normal string, the charges and the Musou opener when the kit has them.
const MOVES = [['idle', '待機'], ['n1', '一段'], ['n3', '三段'], ['n6', '六段'], ['c1', '蓄力一'], ['c3', '蓄力三'], ['c6', '蓄力六'], ['dash', '突進'], ['jatk', '空中']];

function paintPortrait(c) {
  const g = $('portrait').getContext('2d');
  g.clearRect(0, 0, 20, 20);
  c.portrait.face.forEach((row, y) => [...row].forEach((k, x) => { if (k !== '.') { g.fillStyle = c.portrait.pal[k]; g.fillRect(x, y, 1, 1); } }));
}

function load(next) {
  id = next;
  stage.clear();
  officer = standOfficer(id, stage);
  officer.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const c = CHARS[id];
  document.documentElement.style.setProperty('--accent', c.accent);
  ring.material.color.set(c.accent);
  $('name').textContent = c.name.zh;
  $('title').textContent = `${c.title.zh}　${c.courtesy?.zh ? '字' + c.courtesy.zh : ''}`;
  $('bio').textContent = c.bio.zh.join('');
  $('weapon').textContent = `兵器：${c.weapon.zh}　無雙：${c.musou.zh}`;
  paintPortrait(c);
  $('bar').innerHTML = MOVES.filter(([m]) => officer.K.clips[m]).map(([m, label]) => `<button data-m="${m}" aria-pressed="${m === clipId}">${label}</button>`).join('');
  $('bar').querySelectorAll('button').forEach((b) => b.onclick = () => play(b.dataset.m));
  history.replaceState(null, '', `?char=${id}`);
}
function play(m) {
  clipId = m; clipT = 0;
  $('bar').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === m)));
}

$('who').innerHTML = CHAR_ORDER.map((k) => `<option value="${k}" ${k === id ? 'selected' : ''}>${CHARS[k].name.zh}</option>`).join('');
$('who').onchange = (e) => load(e.target.value);
load(id);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const loopClip = clipId === 'idle';
  clipT += dt / (loopClip ? 2.5 : 1.3);
  if (!loopClip && clipT > 1.25) { clipT = 0; clipId = 'idle'; play('idle'); }
  sampleClip(officer.K.clips[clipId], loopClip ? clipT % 1 : Math.min(1, clipT), pose);
  poseOfficer(officer, pose, origin, 0, dt);
  updateCamera(dt);
  renderer.render(scene, camera);
  window.__viewer = { ready: true, id, officer, THREE, orbit };
});
