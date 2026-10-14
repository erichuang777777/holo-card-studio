// Scene tour (mapview.html): one map's set through the game's own world + post pipeline, no crowd or sim, with a free
// orbit camera and a button per zone. ?map=<id> (default: hospital). Used to iterate on maps and as an environment tour.
import * as THREE from 'three';
import { createPost } from './post/post.js';
import { createWorld } from './world/world.js';
import { MAPS } from './world/maps/index.js';
import { ground } from './world/map.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const id = MAPS[params.get('map')] ? params.get('map') : 'hospital';
const def = MAPS[id];

let vw = innerWidth, vh = innerHeight;
const post = createPost({ canvas: $('c'), width: vw, height: vh });
const scene = new THREE.Scene();
const world = createWorld(scene, post);
world.load(id);
const camera = new THREE.PerspectiveCamera(45, vw / vh, 0.1, 1200);

// orbit round a target on the ground: drag turns, wheel / pinch zooms, WASD / arrows move the target (camera-relative)
const orbit = { yaw: Math.PI, pitch: 0.55, dist: 40, tYaw: Math.PI, tPitch: 0.55, tDist: 40, target: new THREE.Vector3(), goal: new THREE.Vector3() };
const pointers = new Map(), keys = new Set();
let pinch = 0;
const cv = $('c');
cv.addEventListener('pointerdown', (e) => { pointers.set(e.pointerId, [e.clientX, e.clientY]); cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', (e) => {
  const prev = pointers.get(e.pointerId);
  if (!prev) return;
  if (pointers.size === 1) {
    orbit.tYaw -= (e.clientX - prev[0]) * 0.006;
    orbit.tPitch = Math.max(0.08, Math.min(1.45, orbit.tPitch + (e.clientY - prev[1]) * 0.004));
  }
  pointers.set(e.pointerId, [e.clientX, e.clientY]);
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (pinch) orbit.tDist = Math.max(4, Math.min(160, orbit.tDist * pinch / d));
    pinch = d;
  }
});
const up = (e) => { pointers.delete(e.pointerId); pinch = 0; };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('wheel', (e) => { e.preventDefault(); orbit.tDist = Math.max(4, Math.min(160, orbit.tDist * Math.exp(e.deltaY * 0.001))); }, { passive: false });
addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

/** Frame a zone: its centre, pulled back to see its width, looking up the map (+Z). */
function goZone(z) {
  orbit.goal.set(z.x, 0, z.z);
  orbit.tDist = Math.max(18, (z.w || z.r * 2 || 40) * 0.7);
  orbit.tYaw = Math.PI; orbit.tPitch = 0.6;
  $('zone').textContent = z.name.zh;
  $('bar').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.z === z.id)));
}
$('name').textContent = def.name.zh;
$('bar').innerHTML = def.zones.map((z) => `<button data-z="${z.id}">${z.name.zh}</button>`).join('');
$('bar').querySelectorAll('button').forEach((b) => b.onclick = () => goZone(def.zones.find((z) => z.id === b.dataset.z)));
const start = def.zones.find((z) => z.id === params.get('zone')) || def.zones[0];
goZone(start);
orbit.target.copy(orbit.goal);
if (params.has('yaw')) orbit.tYaw = orbit.yaw = Number(params.get('yaw'));
if (params.has('pitch')) orbit.tPitch = orbit.pitch = Number(params.get('pitch'));
if (params.has('dist')) orbit.tDist = orbit.dist = Number(params.get('dist'));

addEventListener('resize', () => { vw = innerWidth; vh = innerHeight; post.setSize(vw, vh); camera.aspect = vw / vh; camera.updateProjectionMatrix(); });

const clock = new THREE.Clock(), fwd = new THREE.Vector3(), side = new THREE.Vector3();
let t = 0;
post.compile(scene, camera).then(() => {
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    const sp = orbit.dist * 0.9 * dt;
    fwd.set(-Math.sin(orbit.yaw), 0, -Math.cos(orbit.yaw)); side.set(fwd.z, 0, -fwd.x);
    if (keys.has('w') || keys.has('arrowup')) orbit.goal.addScaledVector(fwd, sp);
    if (keys.has('s') || keys.has('arrowdown')) orbit.goal.addScaledVector(fwd, -sp);
    if (keys.has('a') || keys.has('arrowleft')) orbit.goal.addScaledVector(side, sp);
    if (keys.has('d') || keys.has('arrowright')) orbit.goal.addScaledVector(side, -sp);
    const e = 1 - Math.exp(-dt * 4);
    orbit.yaw += (orbit.tYaw - orbit.yaw) * e; orbit.pitch += (orbit.tPitch - orbit.pitch) * e; orbit.dist += (orbit.tDist - orbit.dist) * e;
    orbit.target.lerp(orbit.goal, e);
    orbit.target.y = ground(orbit.target.x, orbit.target.z) + 1.5;
    camera.position.set(orbit.target.x + Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * orbit.dist, orbit.target.y + Math.sin(orbit.pitch) * orbit.dist,
      orbit.target.z + Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * orbit.dist);
    camera.lookAt(orbit.target);
    world.update(dt, orbit.target, null);
    post.render(scene, camera, t, orbit.target, 0);
    window.__mapview = { ready: true, orbit, goZone, def };
    requestAnimationFrame(frame);
  }
  frame();
});
