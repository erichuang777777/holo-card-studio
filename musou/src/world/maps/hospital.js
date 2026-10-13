// 乳房醫學中心 (a hospital campus, original design) laid out along +Z as the patient's way through it. Real-scale
// equipment and room proportions from public facility guidance (an operating room of ≥ 37 m² round a central table under
// ceiling booms and a laminar-flow diffuser; a mammography room with the unit away from the door, a shielded console, a
// curtained dressing area and a calm palette); the corridors and plaza are enlarged for the fight. Rooms are cut-aways:
// low walls, no ceiling, so the camera sees in.
//   正門廣場  entrance plaza   z -124 …  -72   red-brick facade with arched windows, portico, banners, ambulance bay
//   門診大廳  outpatient lobby z  -72 …  -31   reception, waiting rows, the mammography suite (west)
//   手術中心  surgical suite   z  -31 …   47   the clean corridor (free-mode arena) between four operating rooms
//   病理病房  pathology / ward z   47 …  104   lab benches and microscopes, the nurses' station, the ward; the HQ at the back
// Bright, neutral daylight. Format: ./index.js.
const FACADE_Z = -72, OR_Z = -31, WARD_Z = 48, BACK_Z = 104, W = 42;
const ROOMS = [[-31, -21], [31, -21], [-31, 37], [31, 37]];              // operating-room centres (10 × 10 m)
const ROOM = 5;

export default {
  id: 'hospital',
  name: { zh: '乳醫中心', en: 'Breast Center' },
  grid: [-56, -138, 56, 118],
  pieces: [{ id: 'campus', rect: [-W, -124, W, BACK_Z], h: 0, edge: 0, rise: 2 }],
  // walls with doorways: the facade (portico gap), lobby → surgical suite, surgical suite → ward
  carve: [[-W, FACADE_Z - 1.5, -7, FACADE_Z + 1.5], [7, FACADE_Z - 1.5, W, FACADE_Z + 1.5],
    [-W, OR_Z - 1.5, -10, OR_Z + 1.5], [10, OR_Z - 1.5, W, OR_Z + 1.5],
    [-W, WARD_Z - 1.5, -10, WARD_Z + 1.5], [10, WARD_Z - 1.5, W, WARD_Z + 1.5]],
  props: [
    ...ROOMS.map(([x, z]) => [x - ROOM, z - ROOM, x + ROOM, z + ROOM]),     // operating rooms
    [-10, -61, 10, -56],                                                     // reception counter
    [-W, -68, -24, -40],                                                     // mammography suite
    [18, -66, 38, -42],                                                      // waiting rows
    [-38, 54, -20, 70],                                                      // pathology benches
    [-8, 57, 8, 61],                                                         // nurses' station
    [24, 54, W, 100], [-W, 76, -24, 100],                                    // ward beds
    [-38, -122, -26, -108],                                                  // ambulance bay
  ],
  zones: [
    { id: 'plaza', name: { zh: '正門廣場', en: 'Entrance Plaza' }, x: 0, z: -98, w: 84, d: 52 },
    { id: 'lobby', name: { zh: '門診大廳', en: 'Outpatient Lobby' }, x: 0, z: -51, w: 84, d: 41 },
    { id: 'surgery', name: { zh: '手術中心', en: 'Surgical Suite' }, x: 0, z: 8, w: 84, d: 78 },
    { id: 'ward', name: { zh: '病理病房', en: 'Pathology & Ward' }, x: 0, z: 76, w: 84, d: 56 },
  ],
  route: [[0, -118], [0, -96], [0, FACADE_Z], [0, -50], [0, OR_Z], [0, 8], [0, WARD_Z], [0, 76], [0, 96]],
  gates: {},
  anchors: {},
  spawn: { story: { x: 0, z: -112, yaw: 0, tilt: -0.06 }, free: { x: 0, z: 8, yaw: 0 } },
  water: null,
  // a clear midday: high sun, pale blue sky, neutral haze
  sky: {
    sunElev: 1.05, sunAz: Math.PI - 0.5, sunCore: [5.0, 5.0, 4.8],
    haze: 0xc8ccd0, hazeWarm: 0xd8d2c4, glow: 0xfffaf0, skyMid: 0xaccbe2, skyTop: 0x4f86c0,
    hznSun: 0xe8e4d8, hznAway: 0xd8dcd8, cloudRose: 0xf0ece4, cloudShade: 0xa4acb8, cloudLit: 0xffffff,
  },
  fog: [80, 420],
  light: { hemi: [0xd8e2ee, 0x9c958a, 1.25], sun: [0xfff6ea, 2.6], rim: [0xe8f4ff, 0.4], dir: [0.34, 0.86, -0.38], fire: 0xffe0b8, key: [0, -60], fill: null },
  post: { exposure: 0.88, sat: 1.1, highTint: [1.02, 1.01, 0.98], shadowTint: [0.94, 0.98, 1.06], tintHi: 0.2, rays: 0, bloom: 0.18,
    hazeCool: [0.2, 0.2, 0.2], hazeWarm: [0.24, 0.22, 0.2], sunGlow: [0.24, 0.22, 0.2], inscatter: [0.01, 0.01, 0.01], sunBurst: [0, 0, 0], vignette: 0.2 },
  castle: null,
  terrain: {
    pave: () => 0, bare: () => true,
    rubble: [1000, 1000, 1001, 1001],                                        // a hospital floor: no rubble
    pines: [-138, -118],                                                     // trees only round the entrance plaza
    cliff: { rock: 0xb8bcbe, dark: 0x8c9094, top: 0xd4d6d6, moss: 0x8aa08a, grassy: 0x7c9c6c },   // concrete plinths
  },
  fires: [],
  lightSites: [],
  hq: [0, 96],

  dress(k) {
    const { r, props, glow, shade } = k;
    const box = (s, p, c, rot) => props.push(rot ? { s, p, c, r: rot } : { s, p, c });
    const lit = (s, p, c) => glow.push({ s, p, c });
    const jit = (c, a = 0.03) => shade(c, r.range(1 - a, 1 + a));

    // ---------------------------------------------------------------- floors (thin tiles over the ground; the gaps read as grout)
    const tiles = (z0, z1, t, c, alt) => {
      for (let x = -W; x < W; x += t) for (let z = z0; z < z1; z += t) {
        const q = (Math.floor(x / t) + Math.floor(z / t)) & 1;
        box([t - 0.06, 0.04, t - 0.06], [x + t / 2, 0.02, z + t / 2], jit(alt && q ? alt : c, 0.02));
      }
    };
    tiles(-124, FACADE_Z, 3, 0xa09c94, 0x948f88);                              // plaza: grey granite pavers
    tiles(FACADE_Z, OR_Z, 2, 0xcfc0a8, 0xc2b39a);                              // lobby: warm terrazzo
    tiles(OR_Z, WARD_Z, 2, 0x9cc0b6, 0x8eb4aa);                                // surgical suite: pale sterile green vinyl
    tiles(WARD_Z, BACK_Z, 2, 0xaebccc, 0xa2b2c2);                              // ward: soft blue-grey
    for (const sx of [-1, 1]) box([0.35, 0.05, WARD_Z - OR_Z], [sx * 14, 0.045, (OR_Z + WARD_Z) / 2], 0xd8a838);   // the red-line / sterile boundary stripes
    box([28, 0.05, 0.35], [0, 0.045, OR_Z + 2], 0xd84038);

    // ---------------------------------------------------------------- outer walls: white, a teal band, window strips
    const wallRun = (x0, z0, x1, z1, h = 9) => {
      const L = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      box([1, h, L], [cx, h / 2, cz], 0xd6d4ce, [0, yaw, 0]);
      box([1.06, 0.6, L], [cx, 1.2, cz], 0x1f9c95, [0, yaw, 0]);
      box([1.06, 0.2, L], [cx, h - 0.1, cz], 0xc8c8c2, [0, yaw, 0]);
      for (let d = 3; d < L - 2; d += 6) {                                     // window strips on both faces
        const t = d / L, wx = x0 + (x1 - x0) * t, wz = z0 + (z1 - z0) * t;
        lit(Math.abs(x1 - x0) < 0.1 ? [1.1, 2.2, 3.6] : [3.6, 2.2, 1.1], [wx, 5.2, wz], 0x3a4c58);
      }
    };
    wallRun(-W - 0.5, FACADE_Z, -W - 0.5, BACK_Z); wallRun(W + 0.5, FACADE_Z, W + 0.5, BACK_Z); wallRun(-W - 0.5, BACK_Z + 0.5, W + 0.5, BACK_Z + 0.5);
    // interior partitions with wide doorways (cut-away: 4 m), door frames in teal
    for (const z of [OR_Z, WARD_Z]) {
      for (const [x0, x1] of [[-W, -10], [10, W]]) {
        box([x1 - x0, 4, 0.6], [(x0 + x1) / 2, 2, z], 0xd6d4ce);
        box([x1 - x0, 0.5, 0.66], [(x0 + x1) / 2, 1.0, z], 0x1f9c95);
        for (let x = x0 + 4; x < x1 - 2; x += 6) lit([2.4, 1.2, 0.7], [x, 3.0, z], 0x3a4c58);
      }
      for (const sx of [-1, 1]) box([0.5, 4.6, 0.8], [sx * 10.25, 2.3, z], 0x1f9c95);
      box([21, 0.6, 0.8], [0, 4.3, z], 0x1f9c95);
      lit([6, 0.5, 0.82], [0, 4.3, z], z === OR_Z ? 0x5a2020 : 0x204a40);    // 手術中 / ward sign strip
    }

    // ---------------------------------------------------------------- facade: red brick with white bands, arched windows, the portico
    const brick = (x, y, z) => (((Math.floor(y / 0.5) & 1) ? Math.floor(x + 0.5) : Math.floor(x)) & 1 ? 0xa04a36 : 0x96432f);
    for (const [x0, x1] of [[-W - 1, -7], [7, W + 1]]) {
      const cx = (x0 + x1) / 2, w = x1 - x0;
      for (let y = 0; y < 14; y += 1) box([w, 1, 1.2], [cx, y + 0.5, FACADE_Z], jit(brick(cx, y, 0), 0.04));
      for (const y of [4.2, 9.2, 13.8]) box([w + 0.1, 0.4, 1.4], [cx, y, FACADE_Z - 0.05], 0xf0ece2);
      for (let x = x0 + 3; x < x1 - 2; x += 5) for (const y of [6.6, 11.6]) {   // arched windows: white arch, dark glazing, a sill
        box([2.2, 2.6, 0.2], [x, y, FACADE_Z - 0.62], 0x2a3440);
        lit([1.8, 2.2, 0.1], [x, y, FACADE_Z - 0.7], 0x18242c);
        box([2.6, 0.3, 0.3], [x, y + 1.45, FACADE_Z - 0.68], 0xf0ece2); box([1.8, 0.3, 0.3], [x, y + 1.7, FACADE_Z - 0.68], 0xf0ece2);
        box([2.8, 0.2, 0.5], [x, y - 1.4, FACADE_Z - 0.75], 0xf0ece2);
      }
    }
    // the portico over the entrance: white columns, a stepped pediment, a teal canopy and the centre's two banners
    for (const x of [-6.2, -2.4, 2.4, 6.2]) {
      box([0.9, 9, 0.9], [x, 4.5, FACADE_Z - 2.5], 0xf4f2ec); box([1.3, 0.4, 1.3], [x, 0.2, FACADE_Z - 2.5], 0xd8d4ca); box([1.3, 0.5, 1.3], [x, 9.0, FACADE_Z - 2.5], 0xd8d4ca);
    }
    for (let i = 0; i < 6; i++) box([15 - i * 2.4, 0.7, 3.4], [0, 9.6 + i * 0.7, FACADE_Z - 1.4], i ? 0xf0ece2 : 0xd8d4ca);
    box([16, 0.35, 4.6], [0, 9.3, FACADE_Z - 2.4], 0x1f9c95);
    lit([10, 0.6, 0.1], [0, 8.4, FACADE_Z - 3.0], 0x4a3a40);                   // the centre's name board, lit
    const pink = k.banner('乳醫', { bg: '#d8628a', fg: '#ffffff', border: '#ffffff', w: 128, h: 256, tatter: false, seed: 11 });
    const kind = k.banner('仁心', { bg: '#1f9c95', fg: '#ffffff', border: '#ffffff', w: 128, h: 256, tatter: false, seed: 12 });
    k.cloth(pink, 2.2, 5, 'hang', -9.5, 12.8, FACADE_Z - 0.8, 0); k.cloth(kind, 2.2, 5, 'hang', 9.5, 12.8, FACADE_Z - 0.8, 0);

    // ---------------------------------------------------------------- plaza: planters with trees, benches, lamps, flags, the ambulance
    const tree = (x, z, s = 1) => {
      box([2.6 * s, 0.7, 2.6 * s], [x, 0.35, z], 0xb4b0a8); box([2.3 * s, 0.1, 2.3 * s], [x, 0.72, z], 0x4a3a2c);
      box([0.35 * s, 3 * s, 0.35 * s], [x, 0.7 + 1.5 * s, z], 0x5a4030);
      for (let i = 0; i < 7; i++) box([r.range(1.2, 2) * s, r.range(1, 1.6) * s, r.range(1.2, 2) * s], [x + r.range(-0.9, 0.9) * s, 0.7 + (3 + r.range(-0.3, 1.2)) * s, z + r.range(-0.9, 0.9) * s], jit(0x4f8a3c, 0.12));
    };
    for (const sx of [-1, 1]) for (const z of [-116, -100, -84]) tree(sx * 20, z, 1.1);
    for (const sx of [-1, 1]) for (const z of [-108, -92]) {                   // benches between the planters
      box([3, 0.12, 0.7], [sx * 20, 0.5, z], 0x8a6a48); box([3, 0.6, 0.1], [sx * 20, 0.8, z + sx * 0.32], 0x8a6a48);
      for (const dx of [-1.2, 1.2]) box([0.12, 0.5, 0.6], [sx * 20 + dx, 0.25, z], 0x4a4a4e);
    }
    for (const sx of [-1, 1]) for (const z of [-120, -104, -88, -76]) {         // lamp posts
      box([0.2, 5, 0.2], [sx * 13, 2.5, z], 0x3c4044); box([1.2, 0.15, 0.3], [sx * 13 - sx * 0.5, 5, z], 0x3c4044); lit([0.5, 0.15, 0.3], [sx * 13 - sx * 0.9, 4.9, z], 0x605848);
    }
    for (const x of [-4, 0, 4]) k.flag(x, 0, -122, 6, x ? kind : pink);
    { // ambulance in its bay: white body, red stripe, light bar, dark windscreen, wheels
      const L = k.local(-32, 0, -115, 0.1);
      L(0, 1.55, 0, [2.3, 2.3, 5.6], 0xf4f4f0); L(0, 1.2, 3.2, [2.2, 1.5, 1.2], 0xf0f0ec);
      for (const sx of [-1, 1]) L(sx * 1.16, 1.4, 0.2, [0.06, 0.35, 7], 0xd0302a);
      L(0, 1.6, 3.82, [1.9, 0.7, 0.06], 0x1c2830);
      for (const sx of [-1, 1]) for (const dz of [-1.8, 2.6]) L(sx * 1.1, 0.42, dz, [0.3, 0.84, 0.84], 0x1c1c1e);
      L(0, 0.15, 0, [2.2, 0.3, 6.6], 0x5c5c60);
      lit([0.9, 0.18, 0.3], [-32.5, 2.85, -113.5], 0x601010); lit([0.9, 0.18, 0.3], [-31.5, 2.85, -113.5], 0x101860);
      box([12, 0.05, 0.3], [-32, 0.05, -108.2], 0xd8c040); box([12, 0.05, 0.3], [-32, 0.05, -121.8], 0xd8c040);
    }

    // ---------------------------------------------------------------- lobby: reception, waiting rows, plants, columns
    box([20, 1.1, 1.2], [0, 0.55, -57], 0xf2f0ea); box([20.2, 0.12, 1.4], [0, 1.16, -57], 0x9a7350);
    box([1.2, 1.1, 4], [-9.4, 0.55, -59], 0xf2f0ea); box([1.2, 1.1, 4], [9.4, 0.55, -59], 0xf2f0ea);
    for (const x of [-6, -2, 2, 6]) { box([0.6, 0.45, 0.06], [x, 1.5, -57.3], 0x1c1c22); lit([0.52, 0.36, 0.02], [x, 1.5, -57.35], 0x1c3040); }
    box([20, 3.2, 0.4], [0, 2.4, -61.6], 0x1f9c95); lit([8, 0.7, 0.1], [0, 3.0, -61.35], 0x404a48);   // the reception sign wall
    for (let row = 0; row < 5; row++) for (let i = 0; i < 9; i++) {           // waiting rows: teal seats on a steel beam
      const x = 20 + i * 2, z = -64 + row * 4.8;
      box([0.62, 0.12, 0.6], [x, 0.48, z], 0x2a9c94); box([0.62, 0.6, 0.1], [x, 0.82, z - 0.28], 0x2a9c94);
      if (i === 0) box([18, 0.08, 0.12], [28, 0.4, z], 0x8c9094);
    }
    lit([4, 2.2, 0.1], [28, 3.6, -67.6], 0x30404a);                             // the queue-number display
    for (const [x, z] of [[-14, -40], [14, -40], [-14, -68], [14, -68]]) {    // columns with planters
      box([1.4, 9, 1.4], [x, 4.5, z], 0xf0ece4); box([1.6, 0.8, 1.6], [x, 0.4, z], 0xc8c0b0);
    }
    for (const [x, z] of [[-20, -36], [20, -36], [40, -38]]) { box([1, 0.9, 1], [x, 0.45, z], 0xe4ded2); for (let i = 0; i < 5; i++) box([0.6, 0.7, 0.6], [x + r.range(-0.4, 0.4), 1.2 + r.range(0, 0.8), z + r.range(-0.4, 0.4)], jit(0x4f8a3c, 0.12)); }

    // ---------------------------------------------------------------- mammography suite (west): calm palette, the unit away from the door
    {
      const x0 = -W, x1 = -24, z0 = -68, z1 = -40;
      const soft = 0xf2dce2, softD = 0xe4c6d0;
      tiles2(x0, z0, x1, z1, 0xeee2e4);
      for (const [a, b] of [[[x1, z0], [x1, -58]], [[x1, -50], [x1, z1]], [[x0, z0], [x1, z0]], [[x0, z1], [x1, z1]]]) lowWall(a, b, 2.4, soft, softD);
      lowWall([-34, -54], [x1, -54], 2.4, soft, softD);                       // the exam room / dressing area divider
      // the mammography unit: floor column, the C-arm with tube head above and the detector + compression paddle below
      const M = k.local(-38, 0, -62, Math.PI / 2);
      M(0, 1.0, 0, [0.6, 2.0, 0.5], 0xe8eaec); M(0, 0.05, 0.1, [0.9, 0.1, 0.9], 0xc8cacc);
      M(0, 1.35, 0.4, [0.35, 1.5, 0.3], 0xf4f4f4); M(0, 2.1, 0.6, [0.5, 0.35, 0.5], 0xf4f4f4);
      M(0, 1.15, 0.7, [0.45, 0.06, 0.4], 0x9ab8c8); M(0, 0.95, 0.7, [0.45, 0.1, 0.4], 0x3a3e44);
      for (const sx of [-1, 1]) M(sx * 0.42, 1.1, 0.5, [0.1, 0.1, 0.4], 0xe8789e);   // soft armrests
      // the console behind its shield with a glazed window
      box([0.3, 2.0, 2.6], [-29, 1.0, -62], 0xe8eaec); lit([0.1, 0.8, 1.8], [-29.2, 1.5, -62], 0x405868);
      box([1.4, 0.8, 0.7], [-27.6, 0.4, -62], 0xd8dade); lit([0.06, 0.4, 0.6], [-28.0, 1.1, -62], 0x203040);
      lit([0.06, 0.5, 2], [-41.4, 2.0, -62], 0x403038);                         // a calming wall panel (soft light)
      // curtained dressing cubicles
      for (const z of [-50, -46, -42]) {
        box([0.06, 0.06, 3.4], [-26, 2.4, z], 0xb8b8bc);
        box([0.05, 2.0, 3.0], [-26, 1.3, z], jit(0xe8a0b8, 0.05)); box([3, 2.0, 0.05], [-27.5, 1.3, z - 1.6], 0xe4c6d0);
        box([0.9, 0.45, 0.4], [-29.5, 0.25, z], 0xb8a890);
      }
    }

    // ---------------------------------------------------------------- operating rooms (cut-away), equipment at real scale
    function operatingRoom(cx, cz) {
      const face = cx < 0 ? Math.PI / 2 : -Math.PI / 2;                        // the door faces the clean corridor
      tiles2(cx - ROOM, cz - ROOM, cx + ROOM, cz + ROOM, 0x6aa89a);
      const xs = cx - ROOM, xe = cx + ROOM, zs = cz - ROOM, ze = cz + ROOM, door = cx < 0 ? xe : xs;
      lowWall([xs, zs], [xe, zs]); lowWall([xs, ze], [xe, ze]); lowWall([door === xe ? xs : xe, zs], [door === xe ? xs : xe, ze]);
      lowWall([door, zs], [door, cz - 1.6]); lowWall([door, cz + 1.6], [door, ze]);
      box([0.3, 2.6, 3.2], [door, 1.3, cz], 0x8ab8d0);                          // the sliding door, half glazed
      lit([0.32, 0.5, 1.2], [door, 2.9, cz], 0x602020);                          // 手術中 light over it
      // the laminar-flow diffuser frame overhead (floating: no ceiling) and the ceiling booms
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box([0.15, 3.4, 0.15], [cx + sx * 2.2, 1.7, cz + sz * 2.2], 0xd8dade);
      for (const sx of [-1, 1]) { box([4.6, 0.2, 0.2], [cx, 3.45, cz + sx * 2.2], 0xd8dade); box([0.2, 0.2, 4.6], [cx + sx * 2.2, 3.45, cz], 0xd8dade); }
      for (const d of [-1.1, 0, 1.1]) lit([3.6, 0.05, 0.25], [cx, 3.4, cz + d], 0x50585c);   // diffuser light bars
      // the table: column, base, the padded top with a white sheet and a blue drape, arm boards
      const T = k.local(cx, 0, cz, face);
      T(0, 0.08, 0, [0.9, 0.16, 1.4], 0x8c9298); T(0, 0.5, 0, [0.35, 0.7, 0.35], 0xb8bec4);
      T(0, 0.9, 0, [0.6, 0.12, 2.1], 0x2a2e34); T(0, 0.98, 0.1, [0.62, 0.05, 1.7], 0xf4f4f2); T(0, 1.02, -0.15, [0.9, 0.04, 1.1], 0x3a8ac8);
      for (const sx of [-1, 1]) T(sx * 0.55, 0.92, 0.4, [0.5, 0.05, 0.16], 0x2a2e34);
      // two surgical light heads on a boom arm, lit underneath
      T(0, 3.1, 0, [0.12, 0.6, 0.12], 0xd8dade); T(0.6, 2.75, 0, [1.4, 0.1, 0.1], 0xd8dade);
      for (const [dx, dz] of [[1.2, 0.3], [-0.5, -0.4]]) {
        T(dx, 2.35, dz, [0.08, 0.7, 0.08], 0xd8dade); T(dx, 1.95, dz, [0.85, 0.16, 0.85], 0xe8eaec);
        const p = [cx + dx * Math.cos(face) + dz * Math.sin(face), 1.86, cz - dx * Math.sin(face) + dz * Math.cos(face)];
        lit([0.7, 0.04, 0.7], p, 0x606058);
      }
      // the anaesthesia machine at the head, a patient monitor on its own boom, instrument tables, an IV pole, the scrub sink
      T(0, 0.75, -1.9, [0.9, 1.5, 0.7], 0xd8dce0); T(0, 1.55, -1.9, [0.8, 0.12, 0.65], 0x8c9298);
      T(0, 1.85, -2.1, [0.6, 0.45, 0.06], 0x1c1c22);
      const mp = [cx + 0 * Math.cos(face) - 2.13 * Math.sin(face), 1.85, cz - 0 * Math.sin(face) - 2.13 * Math.cos(face)];
      lit([0.5, 0.36, 0.5], mp, 0x0c2a14);
      T(-1.6, 2.2, -1.4, [0.1, 1.6, 0.1], 0xd8dade); T(-1.6, 1.6, -1.4, [0.6, 0.45, 0.08], 0x1c1c22);
      for (const [dx, dz] of [[1.5, 0.6], [1.5, 1.8]]) {
        T(dx, 0.85, dz, [0.7, 0.05, 1.1], 0xc8ccd0); T(dx, 0.88, dz, [0.68, 0.02, 1.0], 0x3a8ac8);
        for (let i = 0; i < 4; i++) T(dx + r.range(-0.2, 0.2), 0.91, dz + r.range(-0.4, 0.4), [0.03, 0.02, 0.18], 0xdce4ea);
        for (const ex of [-0.3, 0.3]) for (const ez of [-0.5, 0.5]) T(dx + ex, 0.42, dz + ez, [0.04, 0.84, 0.04], 0xb8bec4);
      }
      T(-1.3, 1.1, 1.6, [0.04, 2.2, 0.04], 0xb8bec4); T(-1.3, 2.05, 1.6, [0.5, 0.04, 0.04], 0xb8bec4); T(-1.15, 1.8, 1.6, [0.14, 0.3, 0.08], 0xe8f0f4);
      T(-3.6, 0.9, -3.6, [1.6, 0.25, 0.6], 0xd4dade); T(-3.6, 0.45, -3.6, [1.6, 0.7, 0.5], 0xb8bec4);
    }
    for (const [x, z] of ROOMS) operatingRoom(x, z);
    // the clean corridor: parked stretchers, sanitiser posts, a linen trolley
    for (const [x, z, yaw] of [[-38, 8, 0], [38, 2, 0], [38, 14, 0]]) {
      const L = k.local(x, 0, z, yaw);
      L(0, 0.85, 0, [0.7, 0.12, 2.0], 0xf4f4f2); L(0, 0.75, 0, [0.75, 0.08, 2.05], 0xb8bec4); L(0, 0.95, -0.8, [0.5, 0.1, 0.3], 0xffffff);
      for (const sx of [-1, 1]) for (const sz of [-0.9, 0.9]) L(sx * 0.3, 0.37, sz, [0.05, 0.74, 0.05], 0x8c9298);
    }
    for (const [x, z] of [[-16, -26], [16, -26], [-16, 44], [16, 44]]) { box([0.12, 1.3, 0.12], [x, 0.65, z], 0x8c9298); box([0.3, 0.4, 0.2], [x, 1.4, z], 0xf0f0ec); }

    // ---------------------------------------------------------------- pathology lab and the ward
    for (let i = 0; i < 2; i++) {                                              // lab benches with microscopes and racks
      const z = 58 + i * 8;
      box([16, 0.9, 1.6], [-29, 0.45, z], 0xe8eaec); box([16.2, 0.06, 1.7], [-29, 0.93, z], 0x3a3e44);
      for (let x = -36; x <= -22; x += 3.5) {
        const L = k.local(x, 0.96, z, 0);
        L(0, 0.05, 0, [0.35, 0.1, 0.45], 0x2a2e34); L(0, 0.3, -0.12, [0.1, 0.5, 0.1], 0x3a3e44); L(0, 0.45, 0.05, [0.2, 0.08, 0.3], 0xe8eaec);
        L(0, 0.6, -0.02, [0.06, 0.25, 0.06], 0x2a2e34); L(0.4, 0.06, 0.2, [0.3, 0.12, 0.12], jit(0xe8789e, 0.1));
      }
      lit([0.8, 0.4, 0.05], [-22, 1.3, z - 0.6], 0x1c3040);
    }
    box([16, 1.15, 1.2], [0, 0.58, 59], 0xf2f0ea); box([16.2, 0.1, 1.4], [0, 1.2, 59], 0x1f9c95);   // nurses' station
    for (const x of [-5, 0, 5]) { box([0.55, 0.42, 0.05], [x, 1.5, 58.6], 0x1c1c22); lit([0.48, 0.34, 0.02], [x, 1.5, 58.55], 0x1c3040); }
    const bed = (x, z, yaw) => {
      const L = k.local(x, 0, z, yaw);
      L(0, 0.55, 0, [1.0, 0.18, 2.1], 0xf4f4f2); L(0, 0.68, 0.2, [0.98, 0.1, 1.4], jit(0x7ab0d8, 0.05)); L(0, 0.68, -0.8, [0.6, 0.12, 0.35], 0xffffff);
      L(0, 0.75, -1.05, [1.05, 0.7, 0.08], 0xb8bec4); L(0, 0.6, 1.05, [1.05, 0.45, 0.08], 0xb8bec4);
      for (const sx of [-1, 1]) for (const sz of [-0.95, 0.95]) L(sx * 0.42, 0.23, sz, [0.06, 0.46, 0.06], 0x8c9298);
      L(0.9, 0.4, -0.9, [0.5, 0.8, 0.5], 0xe8e2d6);                            // bedside cabinet
      L(-0.8, 1.1, -0.6, [0.04, 2.2, 0.04], 0xb8bec4); L(-0.65, 1.8, -0.6, [0.14, 0.3, 0.08], 0xe8f0f4);   // IV pole + bag
      L(0, 2.6, 0, [1.8, 0.05, 0.05], 0xb8b8bc); L(-0.9, 1.5, 0, [0.04, 2.0, 2.4], jit(0x9ad0c8, 0.05));   // curtain rail + curtain
    };
    for (let z = 58; z <= 96; z += 5.5) bed(36, z, -Math.PI / 2);
    for (let z = 80; z <= 96; z += 5.5) bed(-36, z, Math.PI / 2);
    // the hall's end: a dark, sick-looking bloom where the enemy commander holds out (scorched floor, broken equipment)
    for (let i = 0; i < 40; i++) {
      const a = r.range(0, 6.28), d = r.range(2, 10), s = r.range(0.2, 0.7);
      box([s, s * 0.6, s], [Math.sin(a) * d, s * 0.25, 96 + Math.cos(a) * d * 0.6], jit(0x5a3a5a, 0.15), [r.range(-0.3, 0.3), r.range(0, 3), r.range(-0.3, 0.3)]);
    }

    // ---------------------------------------------------------------- mid-scale dressing that keeps the big halls readable
    // surgical suite: glazed screens along the corridor edges, scrub-sink stations, equipment carts, floor wayfinding
    for (const sx of [-1, 1]) for (const z of [-4, 20]) {
      const x = sx * 24;
      box([0.25, 2.4, 6], [x, 1.2, z], 0xc8d8dc); lit([0.2, 1.4, 5.4], [x, 1.5, z], 0x24343c);         // glazed screen
      box([0.3, 0.12, 6.2], [x, 2.45, z], 0x1f9c95);
    }
    for (const [x, z] of [[-20, -27], [20, -27], [-20, 43], [20, 43]]) {      // scrub sinks: a long steel trough, knee taps
      box([4, 0.9, 0.7], [x, 0.45, z], 0xb8c0c6); box([4.1, 0.08, 0.8], [x, 0.92, z], 0xdce2e6);
      for (let i = 0; i < 3; i++) { box([0.06, 0.4, 0.06], [x - 1.3 + i * 1.3, 1.2, z - 0.2], 0x8c9298); box([0.5, 0.6, 0.05], [x - 1.3 + i * 1.3, 1.7, z - 0.36], 0x9ab0bc); }
    }
    for (const [x, z, c] of [[-38, 20, 0x3a8ac8], [-38, -4, 0xd8dce0], [38, 26, 0xe8789e], [38, -10, 0xd8dce0]]) {   // carts
      box([1.2, 1.0, 0.7], [x, 0.6, z], c); box([1.25, 0.06, 0.75], [x, 1.12, z], 0x8c9298);
      for (const dx of [-0.5, 0.5]) for (const dz of [-0.28, 0.28]) box([0.1, 0.1, 0.1], [x + dx, 0.05, z + dz], 0x2a2a2e);
    }
    for (let z = -26; z < 44; z += 6) box([1.2, 0.05, 0.5], [0, 0.05, z], 0x1f9c95);                    // the centre-line arrows
    // lobby: a wayfinding pillar per department, the pharmacy window on the east
    for (const [x, z, c] of [[-6, -45, 0xe8789e], [6, -45, 0x1f9c95], [-6, -38, 0x3a8ac8], [6, -38, 0xd8a838]]) {
      box([0.8, 2.6, 0.8], [x, 1.3, z], 0xe8e4dc); lit([0.82, 0.5, 0.82], [x, 2.2, z], shade(c, 0.35));
    }
    box([10, 3, 1], [W - 0.5, 1.5, -40], 0xd6d4ce); lit([8, 1, 0.1], [W - 1.05, 2.0, -40], 0x203038);
    // ward: tall privacy curtains between beds, a linen cupboard row, the nurses' medication cart
    for (let z = 60.75; z <= 93.75; z += 5.5) box([6, 2.3, 0.06], [37, 1.35, z], jit(z % 11 < 5 ? 0xe8a0b8 : 0x9ad0c8, 0.04));
    for (let z = 82.75; z <= 93.75; z += 5.5) box([6, 2.3, 0.06], [-37, 1.35, z], jit(0x9ad0c8, 0.04));
    for (let x = -36; x <= -24; x += 2) { box([1.8, 2.2, 0.6], [x, 1.1, 101], 0xd8d2c6); box([0.1, 0.4, 0.05], [x + 0.6, 1.2, 100.68], 0x8c9298); }
    box([1.2, 1.1, 0.7], [-4, 0.6, 64], 0xe8eaec); for (let i = 0; i < 4; i++) box([1.1, 0.04, 0.6], [-4, 0.4 + i * 0.25, 64.36], 0x1f9c95);

    // ---------------------------------------------------------------- helpers (hoisted)
    function tiles2(x0, z0, x1, z1, c) {
      for (let x = x0; x < x1; x += 1) for (let z = z0; z < z1; z += 1) box([0.96, 0.05, 0.96], [x + 0.5, 0.05, z + 0.5], jit(c, 0.02));
    }
    function lowWall([ax, az], [bx, bz], h = 1.6, c = 0xd2dcd8, trim = 0x1f9c95) {
      const L = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(bx - ax, bz - az);
      box([0.3, h, L], [(ax + bx) / 2, h / 2, (az + bz) / 2], c, [0, yaw, 0]);
      box([0.34, 0.12, L], [(ax + bx) / 2, h, (az + bz) / 2], trim, [0, yaw, 0]);
    }
  },
};
