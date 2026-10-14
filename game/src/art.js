// 原創向量美術：醫師佔位剪影（取得照片後改用 photo）、場地插畫、癌症方圖像與圖示。
const svg = (body, vb = '0 0 200 130') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">${body}</svg>`;

export const ICONS = {
  scalpel: '<path d="M4 20 L16 8 L20 4 L21 7 L10 18 Z" fill="currentColor"/><path d="M4 20 L8 16" stroke="currentColor" stroke-width="2"/>',
  pill: '<rect x="3" y="9" width="18" height="7" rx="3.5" transform="rotate(-35 12 12)" fill="currentColor"/>',
  radiation: '<circle cx="12" cy="12" r="2.4" fill="currentColor"/><path d="M12 12 L7 3.5 A10 10 0 0 1 17 3.5 Z M12 12 L22 12 A10 10 0 0 1 17 20.5 Z M12 12 L7 20.5 A10 10 0 0 1 2 12 Z" fill="currentColor"/>',
  microscope: '<path d="M9 3 h4 v8 h-4z M8 11 h6 v2 h-6z M5 21 h14 v-2 h-14z M11 13 v6 M15 9 a6 6 0 0 1 2 10" stroke="currentColor" stroke-width="2" fill="none"/>',
  scan: '<rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="2" fill="none"/><path d="M7 12 h10 M12 7 v10" stroke="currentColor" stroke-width="2"/>',
  heart: '<path d="M12 21 C4 14 2 10 4.5 6.5 C7 3.5 11 5 12 8 C13 5 17 3.5 19.5 6.5 C22 10 20 14 12 21Z" fill="currentColor"/>',
  dna: '<path d="M7 2 C7 9 17 9 17 16 M17 2 C17 9 7 9 7 16 M7 16 C7 19 9 21 12 22 M17 16 C17 19 15 21 12 22 M8 6 h8 M8 12 h8" stroke="currentColor" stroke-width="2" fill="none"/>',
  hands: '<path d="M3 14 C6 10 10 10 12 13 C14 10 18 10 21 14 L17 20 H7 Z" fill="currentColor"/><circle cx="12" cy="6" r="3" fill="currentColor"/>'
};
export const icon = (name, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24">${ICONS[name] || ''}</svg>`;

export function doctorArt(card) {
  if (card.photo) return `<img src="${card.photo}" alt="${card.name}">`;
  const [c1, c2] = card.color;
  return svg(`
    <defs><radialGradient id="g${card.id}" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient></defs>
    <rect width="200" height="130" fill="url(#g${card.id})"/>
    <g opacity=".18" fill="#fff">${Array.from({length: 9}, (_, i) => `<circle cx="${20 + i * 22}" cy="${18 + (i % 3) * 40}" r="${4 + (i % 4) * 3}"/>`).join('')}</g>
    <path d="M40 130 C44 96 70 86 100 86 C130 86 156 96 160 130 Z" fill="#f4f6fa"/>
    <path d="M100 88 L88 130 M100 88 L112 130" stroke="#cfd6e2" stroke-width="3"/>
    <path d="M84 92 C78 112 92 120 100 112 C108 120 122 112 116 92" stroke="#2a3550" stroke-width="3" fill="none"/>
    <circle cx="100" cy="114" r="5" fill="#9aa6bd"/>
    <circle cx="100" cy="56" r="26" fill="#2a2030" opacity=".85"/>
    <text x="100" y="64" font-size="22" text-anchor="middle" fill="#fff" opacity=".7">?</text>`);
}

export const LOCATION_ART = {
  // 紅磚、白色飾帶、拱廊與中央山牆：以台大醫院西址舊館的建築語彙原創繪製。
  westwing: svg(`
    <rect width="200" height="130" fill="#f5c78a"/><rect y="0" width="200" height="60" fill="#8fc3e8"/>
    <circle cx="165" cy="22" r="10" fill="#fff3c4"/>
    <rect x="20" y="40" width="160" height="80" fill="#b5523a"/>
    <path d="M80 40 L100 18 L120 40 Z" fill="#b5523a"/><path d="M84 40 L100 23 L116 40" fill="none" stroke="#f3eee4" stroke-width="3"/>
    <rect x="20" y="40" width="160" height="5" fill="#f3eee4"/><rect x="20" y="75" width="160" height="4" fill="#f3eee4"/>
    ${[0, 1, 2, 3, 4, 5, 6].map(i => `<path d="M${28 + i * 22} 120 V96 A9 9 0 0 1 ${46 + i * 22} 96 V120 Z" fill="#40281f"/><rect x="${30 + i * 22}" y="52" width="14" height="16" fill="#f3eee4"/><rect x="${32 + i * 22}" y="54" width="10" height="12" fill="#5c7d99"/>`).join('')}
    <rect x="0" y="120" width="200" height="10" fill="#8a8a7a"/>`),
  mdt: svg(`
    <rect width="200" height="130" fill="#20304a"/><rect x="30" y="14" width="60" height="38" rx="3" fill="#0d1a2c" stroke="#7fb8ff" stroke-width="2"/>
    <rect x="110" y="14" width="60" height="38" rx="3" fill="#0d1a2c" stroke="#7fb8ff" stroke-width="2"/>
    <path d="M38 44 L52 30 L62 38 L80 22" stroke="#7dff9c" stroke-width="2" fill="none"/><circle cx="140" cy="33" r="12" fill="none" stroke="#ffb3d0" stroke-width="3"/>
    <ellipse cx="100" cy="100" rx="80" ry="20" fill="#7a5a3a"/><ellipse cx="100" cy="96" rx="80" ry="20" fill="#a37c52"/>
    ${[30, 65, 100, 135, 170].map(x => `<circle cx="${x}" cy="74" r="9" fill="#f4f6fa"/><rect x="${x - 10}" y="82" width="20" height="10" rx="4" fill="#f4f6fa"/>`).join('')}`),
  or: svg(`
    <rect width="200" height="130" fill="#1f5a5a"/><circle cx="100" cy="30" r="26" fill="#e9f7f7"/><circle cx="100" cy="30" r="18" fill="#fffde6"/>
    <path d="M100 0 V6" stroke="#ccc" stroke-width="5"/><path d="M40 130 L60 90 H140 L160 130 Z" fill="#9ad0d0" opacity=".5"/>
    <rect x="45" y="90" width="110" height="14" rx="4" fill="#cfe9e9"/><rect x="95" y="104" width="10" height="26" fill="#6b8a8a"/>
    <path d="M60 60 L100 30 L140 60" fill="#fffde6" opacity=".25"/>`),
  lab: svg(`
    <rect width="200" height="130" fill="#e7eef7"/><rect y="96" width="200" height="34" fill="#7c8ea6"/>
    <path d="M70 96 h40 v-8 h-40z M84 88 v-40 h12 v40 M82 48 h16 v-10 h-16z M96 60 a24 24 0 0 1 10 34" fill="#3a4a66" stroke="#3a4a66" stroke-width="2"/>
    <rect x="125" y="70" width="10" height="26" rx="3" fill="#ff8fb8"/><rect x="140" y="62" width="10" height="34" rx="3" fill="#8fd8ff"/><rect x="155" y="76" width="10" height="20" rx="3" fill="#b9f5c0"/>
    <rect x="20" y="84" width="34" height="8" fill="#fff" stroke="#9fb0c8"/><circle cx="37" cy="88" r="3" fill="#c05a8a"/>`),
  linac: svg(`
    <rect width="200" height="130" fill="#1a2238"/><circle cx="100" cy="70" r="52" fill="#d9dde6"/><circle cx="100" cy="70" r="30" fill="#1a2238"/>
    <rect x="86" y="10" width="28" height="32" rx="4" fill="#b8bfcc"/><path d="M100 42 L100 70" stroke="#7fd8ff" stroke-width="5" opacity=".8"/>
    <rect x="40" y="96" width="120" height="10" rx="3" fill="#8fa0bf"/><rect x="92" y="106" width="16" height="24" fill="#5b6a87"/>`)
};

export function cancerArt(id) {
  const big = {'c-cell': 1, 'c-hyper': 2, 'c-tumor': 3, 'c-invasive': 3, 'c-node': 2, 'c-bone': 4}[id] || 2;
  const blobs = Array.from({length: 3 + big * 2}, (_, i) => {
    const x = 30 + ((i * 53) % 140), y = 25 + ((i * 37) % 80), r = 8 + ((i * 7) % (6 + big * 4));
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#cg)" stroke="#ff9ec0" stroke-width="1.5"/><circle cx="${x - r / 4}" cy="${y - r / 4}" r="${r / 3}" fill="#3a0a2a" opacity=".7"/>`;
  }).join('');
  const spell = id === 'c-spread' ? '<path d="M20 110 C60 40 140 40 180 110" stroke="#ff4f7e" stroke-width="6" fill="none" stroke-dasharray="8 6"/>' : id === 'c-resist' ? '<path d="M100 20 L160 45 V80 C160 105 130 120 100 128 C70 120 40 105 40 80 V45 Z" fill="#7a2a5a" stroke="#ff9ec0" stroke-width="3"/>' : '';
  return svg(`<defs><radialGradient id="cg"><stop offset="0" stop-color="#d0508a"/><stop offset="1" stop-color="#6a1040"/></radialGradient></defs>
    <rect width="200" height="130" fill="#2a0a1e"/>${spell || blobs}`);
}

export function treatmentArt(card) {
  const [c1, c2] = card.color;
  return svg(`<defs><linearGradient id="t${card.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <rect width="200" height="130" fill="url(#t${card.id})"/>
    <g transform="translate(64 29) scale(3)" color="#fff" opacity=".92">${ICONS[card.icon]}</g>`);
}

export function cardArt(card) {
  if (card.cancer) return cancerArt(card.id);
  if (card.type === 'location') return LOCATION_ART[card.art];
  if (card.kind === 'doctor') return doctorArt(card);
  return treatmentArt(card);
}

export const ENEMY_PORTRAIT = svg(`<defs><radialGradient id="ep" cx="50%" cy="40%"><stop offset="0" stop-color="#ff7fb0"/><stop offset="1" stop-color="#4a0a2a"/></radialGradient></defs>
  <rect width="200" height="200" fill="url(#ep)"/><path d="M100 40 C70 40 62 80 82 100 L60 160 L78 166 L100 112 L122 166 L140 160 L118 100 C138 80 130 40 100 40 Z M100 56 C114 56 118 78 106 92 L100 100 L94 92 C82 78 86 56 100 56 Z" fill="#ffd1e3"/>`, '0 0 200 200');
export const PATIENT_PORTRAIT = svg(`<defs><radialGradient id="pp" cx="50%" cy="40%"><stop offset="0" stop-color="#8fe0c8"/><stop offset="1" stop-color="#0d4a40"/></radialGradient></defs>
  <rect width="200" height="200" fill="url(#pp)"/><circle cx="100" cy="78" r="34" fill="#f6e3d4"/><path d="M66 70 C64 36 136 36 134 70 C130 54 70 54 66 70 Z" fill="#3a2a22"/><path d="M40 200 C44 140 156 140 160 200 Z" fill="#c9eee2"/>`, '0 0 200 200');
