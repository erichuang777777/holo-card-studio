// 示範醫師 (def-kit model: src/chars/defkit.js header), fine voxels (chars/parts.js FV) on the shared rig, built from one
// photo: short black hair with a full fringe swept a little to his left, black rectangular glasses, a calm smile; navy
// scrubs with a V-neck, a chest pocket on his left with a small red tag, short sleeves over bare forearms, navy scrub
// trousers and white clogs. The wuxia layer: the white coat worn as a long open mantle (a pink-ribbon roundel on the back,
// teal hem), a stethoscope hanging round the neck, and twin 手術刀劍 — straight swords whose blades end in a scalpel's
// curved belly, white grips, silver-teal fittings and a pink tassel. Colours sampled from the photo (hair #0f0d0f, skin
// #ecc1b3, scrubs #354281, trousers #283267).
import { vox, B, P, md, mirX } from '../../hero/model.js';
import { hash01 } from '../../core/rng.js';
import { FV, hand, boot, symH } from '../parts.js';

export const HV = 0.013;
export const C = {
  skin: 0xe8b9a4, skinD: 0xbf8a78, skinH: 0xf4cdbd, lip: 0xc07a6c, mouth: 0x4a2420, eye: 0x140c0c, iris: 0x3a2620, scl: 0xf2ece4,
  hair: 0x0f0d0f, hairH: 0x2a2428,
  frame: 0x1c1c22, lens: 0xb4c6d4,
  navy: 0x354281, navyD: 0x232c5c, navyL: 0x4a5a9e, pants: 0x283267, pantsD: 0x1b2248,
  coat: 0xf2f2ee, coatD: 0xd2d4d2, teal: 0x1f9c95, tealL: 0x3fc4b8, pink: 0xe8789e, pinkL: 0xf6b2c8,
  tag: 0xc8342c, tagD: 0x8a8a8e, clog: 0xf0f0ee, clogD: 0xc8c8c8, sole: 0x9a9a9e,
  steel: 0xc4ced8, edge: 0xf4f8fc, fuller: 0x76808e, metal: 0x9ab0bc, metalD: 0x5c6c78, tube: 0x26262c,
};
/** Scrub cloth: a faint weave so the navy reads as fabric, not plastic. */
const scrub = (x, y, z) => (md(x * 2 + y + z * 3, 11) === 0 ? C.navyL : md(x - y * 2 + z, 9) === 0 ? C.navyD : C.navy);

// ---------------------------------------------------------------- body (FV, centred on the joints)
function torso() {
  const T = {};
  // hips: the scrub top hangs over the waistband; trousers below
  T.hips = [
    B([-12, -10, -8], [12, 6, 8], C.pants),
    B([-13, -6, -9], [13, 6, 9], (x, y, z) => (y === -6 ? C.navyD : scrub(x, y, z))),
  ];
  T.spine = [B([-11, -6, -9], [11, 14, 9], scrub)];
  // chest: the scrub top, its V-neck showing skin, a darker V binding, the chest pocket on his left with a red tag
  T.chest = [
    B([-13, -4, -10], [13, 18, 10], scrub),
    B([-9, 15, -9], [9, 19, 9], scrub),                                   // shoulders up to the neck
    B([-8, 11, 8], [9, 19, 11], (x, y) => {                               // V-neck: skin inside, a dark binding on its edge
      const d = Math.abs(x - 0.5) - (y - 11) * 0.8;
      if (d < -0.8) return C.skin;
      if (d < 0.6) return C.navyD;
      return null;
    }),
    B([4, 1, 10], [11, 10, 11], (x, y) => (y === 9 ? C.navyD : x === 4 || x === 10 ? C.navyD : C.navy)),   // pocket
    B([6, 10, 10], [9, 11, 11], C.tag), P([6, 10, 10], [7, 11, 11], C.tagD),
    B([-6, 15, -6], [6, 25, 6], -1),                                      // neck hole
  ];
  T.neck = [B([-5, -2, -5], [5, 6, 5], C.skinD), P([-5, 1, 4], [5, 6, 5], C.skin)];
  return T;
}

function limbs(T) {
  for (const [s, sx] of [['R', -1], ['L', 1]]) {
    // short scrub sleeve to mid upper arm, bare skin below
    T['upperArm' + s] = [
      B([-5, -24, -5], [6, 2, 6], (x, y, z) => (Math.abs(x) + Math.abs(z) > 8 ? null : x > 2 || z < -2 ? C.skinD : C.skin)),
      B([-6, -12, -6], [7, 3, 7], (x, y, z) => (y === -12 ? C.navyD : scrub(x, y, z))),
    ];
    T['foreArm' + s] = [B([-4, -23, -4], [5, 1, 5], (x, y, z) => (Math.abs(x) + Math.abs(z) > 6 ? null : x > 2 || z < -2 ? C.skinD : C.skin))];
    T['hand' + s] = hand(sx, C.skin, C.skinD);
    // loose navy scrub trousers, a seam down the outside
    T['thigh' + s] = [B([-7, -36, -7], [7, 2, 7], (x, y, z) => (x * sx === -6 && md(y, 2) === 0 ? C.pantsD : md(y + (x & 1), 7) === 0 ? C.pantsD : C.pants))];
    T['shin' + s] = [
      B([-6, -34, -6], [6, 0, 6], (x, y) => (md(y - x, 6) === 0 ? C.pantsD : C.pants)),
      B([-7, -34, -7], [7, -31, 7], C.pantsD),
    ];
    T['foot' + s] = boot(C.clog, C.clogD, C.sole);
  }
  return T;
}

// ---------------------------------------------------------------- head (HV voxels, chin y 0, columns centred on 0)
export function head() {
  const hair = (x, y, z) => (md(x * 3 + z + y * 2, 7) === 0 ? C.hairH : C.hair);
  return [
    // a full, slightly round face and skull
    B([-6, 3, -6], [7, 14, 6], C.skin),
    B([-5, 0, -4], [6, 3, 5], C.skin), B([-6, 2, -5], [7, 5, 6], C.skin),
    ...symH(4, 6, 3, 6, 5, 6, C.skinH),                                    // cheeks
    // short black hair: thick on top, close at the back and sides, the ears clear
    B([-7, 4, -7], [8, 17, 6], (x, y, z) => {
      if (Math.abs(x) >= 6 && z > -3 && y < 10) return null;               // ears and temples show
      if (z > -2 && y < 12 && Math.abs(x) < 6) return null;                // face
      if (y < 7 && z > -4) return null;                                    // only the nape is cut low
      return hair(x, y, z);
    }),
    // the fringe: falls over the forehead to just above the glasses, longer and swept toward his left (+x)
    B([-6, 11, 5], [7, 15, 8], (x, y) => (y >= 13 || x >= -4 + (13 - y) * 2 - 2 ? hair(x, y, 6) : null)),
    B([-5, 10, 6], [7, 12, 8], (x, y) => (x > -2 + (11 - y) ? hair(x, y, 6) : null)),
    ...symH(6, 7, 7, 11, 1, 4, C.hair, false),                               // short sideburns
    // ears
    ...symH(7, 8, 5, 10, -1, 2, C.skin, false), ...symH(7, 8, 6, 9, 0, 1, C.skinD),
    // brows (mostly under the fringe), eyes
    ...symH(1, 6, 10, 11, 5, 7, C.hair, false),
    ...symH(2, 5, 7, 9, 5, 6, C.scl), ...symH(2, 4, 7, 9, 5, 6, C.iris), ...symH(2, 3, 7, 9, 5, 6, C.eye),
    // black rectangular glasses: a frame standing proud of the face, lenses a pale tint, the bridge, arms to the ears
    ...symH(1, 6, 9, 10, 6, 7, C.frame, false), ...symH(1, 6, 6, 7, 6, 7, C.frame, false),
    ...symH(1, 2, 6, 10, 6, 7, C.frame, false), ...symH(5, 6, 6, 10, 6, 7, C.frame, false),
    ...symH(2, 5, 7, 9, 6, 7, C.lens, false).map((b) => ({ ...b, c: (x, y) => (y === 8 && (x === 2 || x === -1) ? 0xe8f2f8 : null) })),
    B([0, 8, 6], [1, 9, 7], C.frame),
    ...symH(6, 7, 8, 9, -2, 6, C.frame, false),
    // nose, a gentle closed smile
    B([-1, 5, 6], [2, 8, 8], C.skinH), B([0, 4, 7], [2, 5, 8], C.skin), P([-1, 5, 7], [0, 7, 8], C.skinD),
    P([-1, 2, 5], [2, 3, 6], C.lip),                                        // a closed smile: the lip line, corners turned up
    P([-2, 3, 5], [-1, 4, 6], C.lip), P([2, 3, 5], [3, 4, 6], C.lip),
  ];
}

// ---------------------------------------------------------------- 手術刀劍: one sword (shaft +Z, origin = the grip centre)
const SV = 0.01;
/** [{geo, mat}]: white grip (body), silver-teal fittings (metal), a straight blade ending in a scalpel's curved belly. */
export function swordGeo() {
  const o = { off: [-0.5, -0.5, 0], jitter: 0.04, ao: 0.3 };
  const grip = vox([B([-1, -1, -11], [2, 2, 7], (x, y, z) => (md(z + x - y, 3) ? C.coat : C.coatD))], SV, o);
  const fit = vox([
    B([-2, -2, -15], [3, 3, -11], (x, y, z) => (z === -15 || z === -12 ? C.metalD : C.metal)),
    P([-1, -2, -14], [2, 3, -12], C.pink),
    B([-5, -2, 7], [6, 3, 10], (x) => (Math.abs(x) >= 4 ? C.tealL : C.teal)),
    B([-4, -1, 10], [5, 2, 13], C.metalD),
  ], SV, o);
  const boxes = [];
  for (let z = 13; z < 88; z++) {
    const u = (z - 13) / 75;
    // the spine side (−x) stays straight; the edge side (+x) swells into the scalpel's belly and sweeps to the point
    const lo = u < 0.8 ? -3 : Math.min(3, -3 + Math.round((u - 0.8) * 30));
    const hi = u < 0.55 ? 3 : u < 0.8 ? 3 + Math.round(Math.sin((u - 0.55) / 0.25 * Math.PI / 2) * 2) : Math.max(lo, Math.round(5 - (u - 0.8) * 28));
    if (hi < lo) continue;
    boxes.push(B([lo, 0, z], [hi + 1, 1, z + 1], (x) => (x === hi ? C.edge : x === lo + 1 && u < 0.78 ? C.fuller : C.steel)));
    if (hi - lo > 2) boxes.push(B([lo + 1, -1, z], [lo + 3, 2, z + 1], C.steel));
  }
  const blade = vox(boxes, SV, { off: [-0.5, -0.5, 0], jitter: 0.03, ao: 0.2 });
  return [{ geo: grip, mat: 'body' }, { geo: fit, mat: 'metal' }, { geo: blade, mat: 'blade' }];
}

// ---------------------------------------------------------------- chain segments (local −Y along the chain)
/** The white coat as a long mantle: white, curling at the edges, the pink-ribbon roundel high on the back, a teal hem. */
const mantle = (i, n) => {
  const w = 8 + i, last = i === n - 1;
  return vox([B([-w, -5, 0], [w, 0, 1], (x, y) => {
    if (last && y === -5 && hash01(x, i, 7) < 0.3) return null;
    if (last && y >= -4 && y <= -3) return y === -4 ? C.teal : C.tealL;
    if (i === 0) {                                                        // the pink ribbon: a loop and two tails
      const ax = x + 0.5, ay = y + 2.5;
      if (Math.hypot(ax, ay + 0.6) < 1.6 && Math.hypot(ax, ay + 0.6) > 0.7) return C.pink;
      if (ay < -0.5 && ay > -2.6 && Math.abs(Math.abs(ax) - (-ay - 0.4) * 0.7) < 0.6) return C.pink;
    }
    return x === -w || x === w - 1 ? C.coatD : md(x + y * 3 + i, 11) === 0 ? C.coatD : C.coat;
  }), B([-w, -5, 1], [-w + 1, 0, 2], C.coatD), B([w - 1, -5, 1], [w, 0, 2], C.coatD)], 0.025, { off: [0, 0, -0.5], jitter: 0.04, ao: 0.25 });
};
/** Stethoscope tubing: dark rubber, a silver chest piece at the end of one side. */
const tube = (end) => (i, n) => vox(i === n - 1 && end
  ? [B([-3, -4, -1], [4, 0, 2], (x, y) => (Math.hypot(x, y + 2) < 2.6 ? (Math.hypot(x, y + 2) < 1.4 ? C.metal : C.metalD) : null)), B([0, -1, 0], [1, 0, 1], C.tube)]
  : [B([0, -6, 0], [1, 0, 1], C.tube)], 0.012, { off: [-0.5, 0, -0.5], jitter: 0.03, ao: 0.1 });
const strand = (c, h, d, v, w0 = 1) => (i, n) => {
  const w = i === 0 ? w0 + 1 : w0, last = i === n - 1;
  return vox([B([-w, -7, -w], [w, 0, w], (x, y, z) => {
    const k = hash01(x + 9, z + 9, 5);
    if (last && -y > 3 + k * 5) return null;
    return k < 0.3 ? h : k > 0.8 ? d : c;
  })], v, { jitter: 0.06, ao: 0.25 });
};

export const DOCTOR_DEF = {
  build: () => ({ parts: limbs(torso()), head: head(), bv: FV, hv: HV, weapon: swordGeo() }),
  chains() {
    const legs = [['thighL', 0.03], ['thighR', 0.03], ['kneeL', 0.03], ['kneeR', 0.03]];
    return [
      { joint: 'chest', anchor: [0, 0.235, -0.16], rest: [0, -1, 0.1], n: 8, len: 0.12, stiff: 0.16, drag: 0.22, wind: 1.1, cone: 80, sway: 0.2,
        seg: mantle, hit: ['chest', 'hips', ...legs] },
      // the stethoscope round the neck: both ends hang down the front of the chest
      ...[-1, 1].map((sx) => ({ joint: 'chest', anchor: [sx * 0.07, 0.24, 0.13], rest: [sx * 0.1, -1, 0.3], n: 4, len: 0.05, stiff: 0.08, drag: 0.15,
        wind: 0.2, face: [0, 0, 1], cone: 50, sway: 0.1, seg: tube(sx > 0), hit: [['chest', 0.01]] })),
      // a pink tassel at each pommel (the left sword rides the left hand: kit.js)
      ...['weapon', 'handL'].flatMap((joint) => [0, 1, 2].map((k) => ({
        joint, anchor: [(k - 1) * 0.008, 0, -0.15], rest: [(k - 1) * 0.3, -1, -0.3], n: 3, len: 0.045, stiff: 0.05, drag: 0.12, wind: 0.8, cone: 130,
        sway: 0.15, face: [1, 0, 0], seg: strand(C.pink, C.pinkL, 0xb84a72, 0.011) }))),
    ];
  },
};

// ---------------------------------------------------------------- HUD portrait (20 × 20): black hair with a full fringe,
// black rectangular glasses, a calm smile, the navy V-neck scrubs
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
  '..SSFwELLFFLwELLFS..',
  '..sSFLLLLFSFLLLLFs..',
  '..SSFFFFFFSFFFFFFS..',
  '...SSSSSSSssSSSSSS..',
  '...sSSSSSSSSSSSSs...',
  '....SSSSMMMMSSSS....',
  '.....sSSSSSSSSs.....',
  '....NNNSSSSSSNNN....',
  '..NNNNNNSSSSNNNNNN..',
  '.NNNNNNNNSSNNNNRNNN.',
  'NNnNNNNNNNNNNNNNNnNN',
];
export const PAL = { K: '#0f0d0f', S: '#ecc1b3', s: '#bf8a78', F: '#1c1c22', L: '#c8d6e0', w: '#ffffff', E: '#140c0c', M: '#c07a6c',
  N: '#354281', n: '#232c5c', R: '#c8342c' };
