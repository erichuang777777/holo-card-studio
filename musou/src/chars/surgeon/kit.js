// 外科醫師 SURGEON's kit: like the 示範醫師 it runs on 劉備's twin-weapon kit (his moveset, Musou script, C6 rally and
// twin view from ../liubei), with the surgeon's own model (./model.js) and presentation:
//  · the left hand carries the ultrasonic shears (shearsGeo), turned to the pose's armR blade after every rig pass the
//    way 劉備's second sword is (see ../doctor/kit.js twinSwords);
//  · the neon accents (GLOW) are meshed per joint on the emissive GLOW_MAT;
//  · two surgical LED drones ride on the rig root over his shoulders, bobbing and turning (render-only, onBeforeRender);
//  · the plasma scalpel's blade (weapon mat 'blade') glows green, brighter through a charge and the Musou (heat).
import * as THREE from 'three';
import { defKit } from '../defkit.js';
import { CH } from '../../hero/rig.js';
import { ST } from '../../crowd/crowd.js';
import { SURGEON_DEF, GLOW, GLOW_MAT, shearsGeo, droneGeo } from './model.js';
import { vox, heroLook } from '../../hero/model.js';
import { FV } from '../parts.js';
import * as MOVESET from '../liubei/moves.js';
import { createTwinView, LEFT } from '../liubei/view.js';

const W = Math.PI / 2;
const NAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(150 * Math.PI / 180, 0, 0));   // natural grip (forearm frame)
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');

/** The shears on the left hand, turned to the pose's armR blade after every rig pass; the glow accents; the drones. */
function surgeonParts(rig, m) {
  const hand = rig.joints.handL, fore = rig.joints.foreArmL, root = rig.root, apply = rig.apply.bind(rig);
  shearsGeo().forEach((w, i) => {
    const s = new THREE.Mesh(w.geo, typeof w.mat === 'string' ? (w.mat === 'metal' ? m.meshes.weapon1.material : m.material) : w.mat);
    s.castShadow = true; s.receiveShadow = true;
    hand.add(s); m.meshes['swordL' + i] = s;
  });
  for (const [joint, boxes] of Object.entries(GLOW())) {
    if (!rig.joints[joint]) continue;
    const g = new THREE.Mesh(vox(boxes, FV, { off: [0, 0, 0], jitter: 0, ao: 0 }), GLOW_MAT);
    rig.joints[joint].add(g); m.meshes['glow_' + joint] = g;
  }
  heroLook(m.material, 0.4, 0.4);                         // a softer warm rim: the black undersuit stays black
  m.blade.emissive.setHex(0x3dff8a); m.blade.emissiveIntensity = 0.9;   // (the kit's heat takes over in battle)
  const { hull, glow } = droneGeo(), hullMat = m.meshes.weapon1.material;
  [-1, 1].forEach((sx, k) => {
    const d = new THREE.Group(), h = new THREE.Mesh(hull, hullMat), l = new THREE.Mesh(glow, GLOW_MAT);
    h.castShadow = true; d.add(h, l);
    const light = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 16, 1, true), new THREE.MeshBasicMaterial({
      color: 0x8affc0, transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    light.position.y = -0.09; d.add(light);
    root.add(d); m.meshes['drone' + k] = d;
    h.onBeforeRender = () => {
      const t = performance.now() / 1000 + k * 1.7;
      d.position.set(sx * (0.34 + 0.03 * Math.sin(t * 0.7)), 1.62 + 0.04 * Math.sin(t * 2.1), -0.12 + 0.03 * Math.cos(t * 0.9));
      d.rotation.set(0.25 * sx * 0.5, t * 0.6 * sx, sx * 0.18);
      d.updateMatrixWorld(true);
    };
  });
  rig.apply = (pose, pos, yaw, h) => {
    apply(pose, pos, yaw, h);
    const k = Math.min(1, Math.max(0, pose[CH.armR + 3] / W));
    fore.getWorldQuaternion(_q).multiply(NAT);
    if (k > 0) {
      root.getWorldQuaternion(_q2).multiply(_q3.setFromEuler(_e.set(-pose[CH.armR + 1], pose[CH.armR], pose[CH.armR + 2])));
      _q.slerp(_q2, k);
    }
    hand.quaternion.copy(fore.getWorldQuaternion(_q2).invert().multiply(_q));
    hand.updateMatrixWorld(true);
  };
  return m;
}

/** 仁德: once per C6, on its shock frame. */
function rally(game, mu) {
  const step = mu.step, reset = mu.reset;
  let seq = -1;
  mu.reset = () => { seq = -1; reset(); };
  mu.step = () => {
    step();
    const h = game.hero, c = game.crowd;
    if (h.state !== 'attack' || h.move !== 'c6' || h.moveT < h.kit.moves.c6.hits[0].f[0] || h.moveSeq === seq) return;
    seq = h.moveSeq;
    h.hp = Math.min(h.hpMax, h.hp + Math.round(h.hpMax * 0.05));
    for (let i = c.N; i < c.T; i++) {
      if (c.st[i] === ST.OFF || c.st[i] === ST.DEAD || (c.x[i] - h.x) ** 2 + (c.z[i] - h.z) ** 2 > 400) continue;
      c.hp[i] = c.hpMax[i];
      c.raiseF[i] = game.frame + 70 - (i % 5) * 5;
    }
  };
  return mu;
}

const kit = defKit({
  ...SURGEON_DEF,
  reach: { tip: 0.9, butt: 0.16 },
  trail: { base: 0.3, baseHeavy: 0.2, tip: 0.9 },
  weight: 1.05,
  voice: { pitch: 0.84, fk: 0.92, growl: 0.06, gain: 1 },
  heat: [0x3dff8a, 0.9, 1.4, 1.8],
  view(model) { LEFT.blade = model.meshes.swordL1; },           // the shears' ribbon (liubei/view.js)
  fx: {
    needle: [[0.9, 2.4, 1.3], [0.6, 2.0, 1.6], [1.4, 2.6, 1.9]],
    hot: [[0.12, 0.5, 0.26], [0.1, 0.42, 0.4], [0.2, 0.6, 0.34], [1.2, 2.2, 1.5]],
    burst: [0.14, 0.46, 0.26], flash: [1.1, 2.3, 1.4], slash: [0.9, 2.5, 1.4], pulse: [0.7, 1.9, 1.3],
    light: [0.5, 1, 0.7], crack: [0.7, 2.2, 1.2], wall: [0.4, 1.05, 0.7], ring: [0.8, 2.1, 1.4], shard: [1.1, 2.3, 1.6],
    glint: [1.5, 2.6, 1.9], glitter: [1.4, 2.5, 1.8],
    glow: [0x0e4a2a, 0x7affb8, 0.4],
    trail: { white: [0.9, 1.08, 0.96], fringe: [0.2, 1.0, 0.5], hot: [0.9, 1.8, 1.2], glow: [0.35, 1.5, 0.75], grad: true },
    ghost: [0x1f6a4a, 0x3dcf8a, 0xd8ffe8, 0x8affc0, 0x2aa070],
    mu: { crack: [0.7, 2.2, 1.2], wall: [0.35, 1.0, 0.6], light: [0.5, 1, 0.75] },
  },
  look: {
    cut: { sub: '精準切除・前線裁決', seal: '刃', art: 'assets/portraits/surgeon-cut.png', band: 'rgba(61,255,138,.4)', css: {
      big: 'color: #effff6; text-shadow: 0 0 2px #04140c, 6px 8px 0 rgba(2,12,8,.55), 0 0 28px rgba(60,255,140,.6);',
      sub: 'color: #dcffe9; text-shadow: 0 0 10px rgba(60,255,140,.75), 2px 2px 0 rgba(0,0,0,.6);' } },
    pal: { rays: [0.5, 1.4, 0.8], ring: [0.8, 2.1, 1.3], bolt: null, burst: [0.8, 1.9, 1.1], ko: [0.4, 0.95, 0.6], glow: 0x9affc8,
      mote: [0.9, 1.4, 1.1], rib: [0.4, 1.7, 0.9], rib2: [0.6, 1.4, 1.6], aura: [0.3, 0.95, 0.55],
      dim: [[150, 196, 170], [86, 128, 108], [40, 72, 58]], cool: [200, 240, 220], wash: [[236, 252, 244], [200, 244, 220], [140, 214, 176]] },
  },
  sig: { roar: [0.7, 2.0, 1.1], core: [1.5, 2.5, 1.9], wave: [0.5, 2.0, 1.4], beam: [0.9, 2.1, 1.4], charge: [0.8, 2.1, 1.2] },
}, MOVESET);

const model = kit.model, createMusou = kit.createMusou, createMusouView = kit.createMusouView;
kit.model = (rig) => surgeonParts(rig, model(rig));
kit.createMusou = (game) => rally(game, createMusou(game));
kit.createMusouView = (scene, game, camera) => {
  const a = createMusouView(scene, game, camera), b = createTwinView(scene, game);
  return { update(dt) { a.update(dt); b.update(dt); }, dispose() { a.dispose(); b.dispose(); } };
};
export const SURGEON_KIT = kit;
