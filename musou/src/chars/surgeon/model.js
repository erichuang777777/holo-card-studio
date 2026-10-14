// 外科醫師 SURGEON (def-kit model: src/chars/defkit.js header), fine voxels (chars/parts.js FV) on the shared rig, built
// from a multi-view character sheet (front / left / back / right / ¾): the 示範醫師's face (doctor/model.js head) with an
// earpiece; a navy long tunic with short sleeves, a high collar and neon-green seams; white armour plates over the
// shoulders (a MED cross on the left), forearms, thighs and shins with silver trim; a black undersuit and black gloves;
// a belt of hemostatic-clip canisters; a drainage / filtration module on the back (glass cells, green tubes, the winged
// emblem). Weapons: a plasma scalpel in the right hand (a green glowing blade: the kit heats the 'blade' material) and
// ultrasonic shears in the left (kit.js). Secondary: two navy coat tails with a green hem, and two floating surgical LED
// drones over the shoulders (kit.js). Glowing accents are their own meshes (GLOW, kit.js) on an emissive material.
import * as THREE from 'three';
import { vox, B, P, md, mirX } from '../../hero/model.js';
import { hash01 } from '../../core/rng.js';
import { FV, glove, boot } from '../parts.js';
import { head as doctorHead, HV } from '../doctor/model.js';

export { HV };
/** The neon accents' material: vertex-coloured greens lit from within (bloom picks them up). */
export const GLOW_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0, flatShading: true, emissive: 0x3dff8a, emissiveIntensity: 1.6 });
export const C = {
  navy: 0x1f2a52, navyD: 0x141b38, navyL: 0x2e3c70, black: 0x15161a, blackL: 0x24262c,
  armor: 0xeef0f2, armorD: 0xc2c8d0, silver: 0xa6b0bc, silverD: 0x6a7480, steel: 0xd4dce4,
  green: 0x3dff8a, greenD: 0x1a9a52, glass: 0x9ee8c4, glassD: 0x4a8a72,
  ear: 0x2a2c32, plasma: 0xd8ffe8, plasmaE: 0x8affc0,
};
/** Tunic cloth: a faint twill so the navy reads as fabric. */
const cloth = (x, y, z) => (md(x * 2 + y + z * 3, 11) === 0 ? C.navyL : md(x - y * 2 + z, 9) === 0 ? C.navyD : C.navy);
/** White armour plate: panel lines every few rows, a darker underside. */
const plate = (x, y, z) => (md(y, 6) === 0 ? C.armorD : md(x + z, 13) === 0 ? C.silver : C.armor);

// ---------------------------------------------------------------- body (FV, centred on the joints)
function torso() {
  const T = {};
  T.hips = [
    B([-12, -10, -8], [12, 6, 8], C.black),
    B([-13, -6, -9], [13, 6, 9], (x, y, z) => (Math.abs(x) < 2 && z > 0 ? C.navyD : cloth(x, y, z))),   // the tunic's skirt
    // the belt: black strap, a silver buckle, hemostatic-clip canisters round it (silver bodies; green caps are GLOW)
    B([-14, 0, -10], [14, 3, 10], (x, y) => (y === 1 ? C.blackL : C.black)),
    B([-3, -1, 9], [3, 4, 11], (x, y) => (y === -1 || y === 3 ? C.silverD : C.silver)),
    ...[-12, -8, 6, 10].map((x) => B([x, -4, 9], [x + 3, 3, 12], (xx, y) => (y === -4 ? C.silverD : C.steel))),
    ...[-14, 13].map((x) => B([x, -4, -4], [x + 2, 3, 4], (xx, y, z) => (md(z, 3) === 0 ? C.silverD : C.steel))),
  ];
  T.spine = [B([-11, -6, -9], [11, 14, 9], cloth)];
  T.chest = [
    B([-13, -4, -10], [13, 18, 10], cloth),
    B([-10, 15, -9], [10, 20, 9], cloth),
    // the tunic's front closure: a straight placket just left of centre, silver snaps beside it
    B([1, -4, 10], [3, 18, 11], C.navyD),
    ...[0, 5, 10, 15].map((y) => B([3, y, 10], [5, y + 2, 11], C.silver)),
    // a white chest plate high on the right breast
    B([-11, 9, 10], [-3, 16, 12], (x, y) => (y === 9 ? C.armorD : x === -11 ? C.silver : C.armor)),
    // the high collar: stands up round the neck, open at the throat
    B([-8, 18, -8], [8, 24, 8], (x, y, z) => {
      if (Math.abs(x) < 6 && Math.abs(z) < 6) return null;
      if (z > 4 && Math.abs(x) < 4) return null;
      return y === 23 ? C.navyL : cloth(x, y, z);
    }),
    // the drainage / filtration module on the back: a white housing with silver ribs
    B([-10, -2, -16], [10, 18, -10], (x, y, z) => {
      if (z === -16 && Math.abs(x) < 8 && y > 0 && y < 16) return md(y, 5) === 0 ? C.silver : C.armorD;
      return md(y, 5) === 0 ? C.silver : C.armor;
    }),
    B([-12, 4, -15], [-10, 14, -11], C.silverD), B([10, 4, -15], [12, 14, -11], C.silverD),
    B([-6, 18, -15], [6, 21, -11], C.silverD),                                   // the top cap
    B([-8, 15, -10], [8, 18, -9], C.black),                                      // harness strap across the shoulders
  ];
  T.neck = [B([-5, -2, -5], [5, 6, 5], 0xbf8a78), P([-5, 1, 4], [5, 6, 5], 0xe8b9a4)];
  return T;
}

function limbs(T) {
  for (const [s, sx] of [['R', -1], ['L', 1]]) {
    // short navy sleeve, black undersuit below
    T['upperArm' + s] = [
      B([-5, -24, -5], [6, 2, 6], (x, y, z) => (Math.abs(x) + Math.abs(z) > 8 ? null : md(y, 5) === 0 ? C.blackL : C.black)),
      B([-6, -11, -6], [7, 3, 7], (x, y, z) => (y === -11 ? C.navyD : cloth(x, y, z))),
    ];
    // white forearm armour over the undersuit, a silver cuff at the wrist
    T['foreArm' + s] = [
      B([-4, -23, -4], [5, 1, 5], C.black),
      B([-5, -20, -5], [6, -3, 6], (x, y, z) => (Math.abs(x) + Math.abs(z) > 8 ? null : y === -20 || y === -4 ? C.silver : plate(x, y, z))),
      B([-4, -23, -4], [5, -20, 5], C.silverD),
    ];
    T['hand' + s] = glove(sx, C.black, C.blackL);
    // black undersuit legs, a white plate down the front of the thigh, white greaves with a silver knee cap
    T['thigh' + s] = [
      B([-7, -36, -7], [7, 2, 7], (x, y, z) => (md(y + (x & 1), 7) === 0 ? C.blackL : C.black)),
      B([-6, -30, 6], [6, -8, 8], (x, y) => (y === -30 || Math.abs(x) === 5 ? C.armorD : plate(x, y, 6))),
      B(sx > 0 ? [6, -24, -2] : [-7, -24, -2], sx > 0 ? [7, -10, 4] : [-6, -10, 4], C.silverD),   // silver strip, outside
    ];
    T['shin' + s] = [
      B([-6, -34, -6], [6, 0, 6], C.black),
      B([-7, -30, -7], [7, -4, 7], (x, y, z) => (Math.abs(x) + Math.abs(z) > 11 ? null : z < -3 ? C.armorD : plate(x, y, z))),
      B([-5, -5, 6], [5, 2, 9], (x, y) => (y === -5 ? C.silverD : C.silver)),          // knee cap
      B([-7, -34, -7], [7, -31, 7], C.silverD),
    ];
    T['foot' + s] = boot(C.armor, C.black, C.blackL, { trim: C.silver });
  }
  return T;
}

/** Shoulder plates: a white shell in two overlapping tiers with a silver rim; the MED cross badge sits on the left one
 *  (GLOW). Authored with +x outward. */
const pauldron = (sx) => [
  B([-2, 0, -8], [9, 6, 8], (x, y, z) => (y === 0 ? C.silver : plate(x, y, z))),
  B([0, 5, -7], [8, 8, 7], (x, y, z) => (y === 7 && md(z, 3) === 0 ? C.silver : C.armor)),
  B([7, -4, -7], [9, 1, 7], C.armorD),
].map((b) => mirX(b, sx));

// ---------------------------------------------------------------- head: the doctor's, plus an earpiece on his right ear
function head() {
  return [
    ...doctorHead(),
    B([-9, 6, -1], [-6, 10, 3], (x, y) => (y === 9 ? C.silver : C.ear)),
    B([-9, 3, 2], [-8, 7, 3], C.ear),                                              // the boom toward the mouth
  ];
}

// ---------------------------------------------------------------- glowing accents (FV boxes per joint; meshed on an
// emissive material by kit.js). Colours are near-white greens so bloom reads them as light.
export const GLOW = () => {
  const G = {}, g = C.green;
  G.chest = [
    B([0, -4, 10], [1, 18, 11], g),                                            // closure seam
    B([-8, 24, -8], [8, 25, 8], (x, y, z) => (Math.abs(x) >= 6 || Math.abs(z) >= 6) && !(z > 4 && Math.abs(x) < 4) ? g : null),  // collar rim
    // the back module: three glass filter cells, the winged emblem between them
    ...[-7, 4].map((x) => B([x, 3, -17], [x + 3, 14, -16], (xx, y) => (md(y, 4) === 0 ? C.greenD : C.glass))),
    B([-3, 5, -17], [3, 13, -16], (x, y) => {                                  // caduceus staff + wings
      if (x === 0 || x === -1) return y > 5 ? g : null;
      if (y >= 10 && y <= 11) return g;
      if (y === 9 && Math.abs(x + 0.5) > 1.5) return g;
      return null;
    }),
    // tubes from the module round the ribs to the belt
    ...[-1, 1].flatMap((sx) => [B(sx < 0 ? [-14, 4, -10] : [13, 4, -10], sx < 0 ? [-13, 6, 1] : [14, 6, 1], g),
      B(sx < 0 ? [-14, -4, -1] : [13, -4, -1], sx < 0 ? [-13, 4, 1] : [14, 4, 1], g)]),
  ];
  G.spine = [B([-11, -6, 9], [11, 14, 10], (x) => (x === 4 ? g : null))];
  G.hips = [...[-12, -8, 6, 10].map((x) => B([x, 3, 9], [x + 3, 4, 12], g)), B([-1, 0, 11], [1, 3, 12], g)];
  for (const [s, sx] of [['R', -1], ['L', 1]]) {
    G['foreArm' + s] = [B([-5, -19, 5], [6, -4, 6], (x) => (x === 0 ? g : null))];
    G['shin' + s] = [B([-1, -28, 7], [1, -6, 8], g)];
    G['thigh' + s] = [B([-1, -28, 8], [1, -10, 9], g)];
  }
  // the MED cross on the left shoulder (pauldron joints exist: build() has a pauldron)
  G.pauldronL = [B([9, 1, -3], [10, 6, 2], (x, y, z) => (y === 3 || z === -1 ? g : null))];
  G.pauldronR = [B([-9, 3, -6], [-8, 4, 6], g)];
  return G;
};

// ---------------------------------------------------------------- weapons (shaft +Z, origin = the grip centre)
const SV = 0.01;
const o = { off: [-0.5, -0.5, 0], jitter: 0.03, ao: 0.25 };
/** Plasma scalpel: a black-and-silver grip, a heavy emitter guard with green vents, a long glowing blade with the
 *  scalpel's belly near the tip (pale-green voxels on the 'blade' material, heated green by kit.js). */
export function scalpelGeo() {
  const grip = vox([B([-2, -2, -14], [3, 3, 8], (x, y, z) => (md(z, 3) === 0 ? C.silverD : C.black))], SV, o);
  const fit = vox([
    B([-3, -3, -18], [4, 4, -14], (x, y, z) => (z === -18 ? C.silverD : C.silver)),
    B([-4, -3, 8], [5, 4, 13], (x, y, z) => (Math.abs(x) === 4 ? C.silverD : C.steel)),
    B([-2, -4, 13], [3, 5, 16], C.silverD),
  ], SV, o);
  const vent = vox([B([-5, -2, 9], [6, 3, 12], (x, y, z) => (Math.abs(x) === 5 && md(z, 2) === 0 ? C.green : null))], SV, o);
  const boxes = [];
  for (let z = 16; z < 92; z++) {
    const u = (z - 16) / 76;
    const lo = u < 0.82 ? -3 : Math.min(3, -3 + Math.round((u - 0.82) * 32));
    const hi = u < 0.5 ? 3 : u < 0.82 ? 3 + Math.round(Math.sin((u - 0.5) / 0.32 * Math.PI / 2) * 2) : Math.max(lo, Math.round(5 - (u - 0.82) * 30));
    if (hi < lo) continue;
    boxes.push(B([lo, 0, z], [hi + 1, 1, z + 1], (x) => (x === lo || x === hi ? C.plasmaE : C.plasma)));
    if (hi - lo > 2) boxes.push(B([lo + 1, -1, z], [hi, 2, z + 1], C.plasma));
  }
  const blade = vox(boxes, SV, { off: [-0.5, -0.5, 0], jitter: 0.02, ao: 0.05 });
  return [{ geo: grip, mat: 'body' }, { geo: fit, mat: 'metal' }, { geo: vent, mat: GLOW_MAT }, { geo: blade, mat: 'blade' }];
}

/** Ultrasonic shears (the left hand, kit.js): a silver grip, a transducer collar with green rings, and two curved jaws
 *  that open into a claw, their inner edges glowing. */
export function shearsGeo() {
  const grip = vox([B([-2, -2, -12], [3, 3, 6], (x, y, z) => (md(z, 4) === 0 ? C.silverD : C.black))], SV, o);
  const body = [B([-4, -4, 6], [5, 5, 16], (x, y, z) => (md(z, 3) === 0 ? C.silverD : C.steel))];
  const glow = [...[8, 12].map((z) => B([-5, -5, z], [6, 6, z + 1], (x, y) => (Math.abs(x) === 5 || Math.abs(y) === 5 ? C.green : null)))];
  for (const sg of [-1, 1]) {
    for (let z = 16; z < 52; z++) {
      const u = (z - 16) / 36, x = sg * Math.round(1 + Math.sin(u * Math.PI * 0.85) * 7), w = u > 0.85 ? 1 : 2;
      body.push(B([x - (sg > 0 ? 0 : w), -2, z], [x + (sg > 0 ? w : 0) + 1, 3, z + 1], u > 0.9 ? C.silverD : C.steel));
      if (md(z, 2) === 0 && u < 0.92) glow.push(B([x - sg, -1, z], [x - sg + 1, 2, z + 1], C.green));
    }
  }
  return [{ geo: grip, mat: 'body' }, { geo: vox(body, SV, o), mat: 'metal' }, { geo: vox(glow, SV, o), mat: GLOW_MAT }];
}

/** A surgical LED drone (local, 0.012 m voxels): a white disc hull with a silver rim, a ring of green LEDs underneath and
 *  two short rotor arms. → { hull, glow } geometries. */
export function droneGeo() {
  const DV = 0.012, hull = [], glow = [];
  for (let x = -7; x <= 7; x++) for (let z = -7; z <= 7; z++) {
    const r = Math.hypot(x, z);
    if (r > 7.2) continue;
    hull.push(B([x, 0, z], [x + 1, r > 6 ? 2 : 3, z + 1], r > 6 ? C.silver : r < 2 ? C.silverD : C.armor));
    if (r > 4.4 && r < 6) glow.push(B([x, -1, z], [x + 1, 0, z + 1], C.green));
  }
  hull.push(B([-11, 1, -1], [-7, 2, 1], C.silverD), B([7, 1, -1], [11, 2, 1], C.silverD), B([-1, 3, -1], [1, 5, 1], C.silverD));
  return { hull: vox(hull, DV, { off: [0, 0, 0], jitter: 0.02, ao: 0.2 }), glow: vox(glow, DV, { off: [0, 0, 0], jitter: 0, ao: 0 }) };
}

// ---------------------------------------------------------------- chain segments (local −Y along the chain)
/** A navy coat tail: twill cloth, white piping on the outer edge, a green hem on the last link. */
const tail = (sx) => (i, n) => {
  const w = 5 + Math.floor(i / 2), last = i === n - 1;
  return vox([B([-w, -5, 0], [w, 0, 1], (x, y) => {
    if (last && y === -5 && hash01(x, i, 3) < 0.25) return null;
    if (last && y === -4) return C.green;
    if (x * sx === w - 1 || x * sx === -w) return x * sx === w - 1 ? C.armorD : C.navyD;
    return cloth(x, y, i);
  })], 0.025, { off: [0, 0, -0.5], jitter: 0.04, ao: 0.25 });
};

export const SURGEON_DEF = {
  build: () => ({ parts: limbs(torso()), head: head(), bv: FV, hv: HV, pauldron, weapon: scalpelGeo() }),
  chains() {
    const legs = [['thighL', 0.03], ['thighR', 0.03], ['kneeL', 0.03], ['kneeR', 0.03]];
    return [-1, 1].map((sx) => ({
      joint: 'hips', anchor: [sx * 0.08, 0.02, -0.12], rest: [sx * 0.15, -1, -0.15], n: 6, len: 0.11, stiff: 0.18, drag: 0.22, wind: 1.0,
      cone: 70, sway: 0.18, seg: tail(sx), hit: ['hips', ...legs],
    }));
  },
};

// ---------------------------------------------------------------- HUD portrait (20 × 20): the doctor's face and glasses
// over the navy high collar with green trim
export const FACE = [
  '....................',
  '......KKKKKKKK......',
  '....KKKKKKKKKKKK....',
  '...KKKKKKKKKKKKKK...',
  '...KKKKKKKKKKKKKKK..',
  '...KKKKKKKKKKKKKKK..',
  '..KKSSKKKKKKKKKKKK..',
  '..SKSSSSSSSKKKSSKS..',
  '..SSFFFFFFSFFFFFFS..',
  '.eSSFwELLFFLwELLFS..',
  '.esSFLLLLFSFLLLLFs..',
  '.eSSFFFFFFSFFFFFFS..',
  '...SSSSSSSssSSSSSS..',
  '...sSSSSSSSSSSSSs...',
  '....SSSSMMMMSSSS....',
  '..GNNsSSSSSSSSsNNG..',
  '..NNNNSSSSSSSSNNNN..',
  '.WWNNNNNSSNNNNNNWW..',
  'WWWWNNNNNGNNNNNWWWW.',
  'WWWWNNNNNNGNNNNWWWWW',
];
export const PAL = { K: '#0f0d0f', S: '#ecc1b3', s: '#bf8a78', F: '#1c1c22', L: '#c8d6e0', w: '#ffffff', E: '#140c0c', M: '#c07a6c',
  N: '#1f2a52', G: '#3dff8a', W: '#eef0f2', e: '#2a2c32' };
