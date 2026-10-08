import {CARDS, COLLECTIBLE, RARITY_LABEL, cardText, needsTarget} from './cards.js';
import {cardArt, ENEMY_PORTRAIT, PATIENT_PORTRAIT, LOCATION_ART, icon} from './art.js';
import {newGame, mulligan, playCard, endTurn, attack, activateLocation, useHeroPower, answerQuiz, chooseDiscover, runEnemyTurn, validTargets, canPlay, mdtActive, attackOf} from './engine.js';
import {openPack, newCollection, buildDeck, disenchantExtras, craft, CRAFT} from './packs.js';
import {STAGES, SUBTYPES} from '../data/stages.js';

const app = document.getElementById('app'), modal = document.getElementById('modal'), preview = document.getElementById('preview');
const STORE = 'ntuh-breast-cards-v1';
const params = new URLSearchParams(location.search);

let collection = load();
let screen = params.get('screen') || 'menu';
let choice = {stage: params.get('stage') || 'I', subtype: params.get('subtype') || 'HR+'};
let game = null, sel = null, busy = false, lastPack = null;

function load() {
  try {const c = JSON.parse(localStorage.getItem(STORE)); if (c?.cards) return c;} catch {}
  const c = newCollection(); c.freePacks = 3; return c;
}
function save() {try {localStorage.setItem(STORE, JSON.stringify(collection));} catch {}}

// ---------- shared card rendering ----------
export function cardHTML(card, {count, owned = true, cls = '', style = '', attrs = ''} = {}) {
  const type = card.type, rarity = card.rarity;
  const label = card.kind === 'doctor' ? card.rank : RARITY_LABEL[rarity];
  const sub = card.kind === 'doctor' ? `${card.dept}・${card.skill}` : card.cancer ? '乳癌' : type === 'location' ? '場地・台大醫院' : '治療';
  const color = card.color || (type === 'location' ? ['#6a4a2a', '#2a1a10'] : card.cancer ? ['#8a2a4a', '#2a0a1e'] : ['#555', '#222']);
  const stats = type === 'minion' ? `<div class="stat atk">${card.atk}</div><div class="stat hp">${card.hp}</div>` : type === 'location' ? `<div class="stat dur">${card.durability}</div>` : '';
  return `<div class="card t-${type} ${card.cancer ? 'cancer' : ''} ${owned ? '' : 'unowned'} ${cls}" data-rarity="${rarity}" data-card="${card.id}" ${attrs} style="--c1:${color[0]};--c2:${color[1]};${style}">
    <div class="cost">${card.cost}</div>
    <div class="in"><div class="art">${cardArt(card)}</div>
      <div class="name">${card.name}<small>${sub}</small></div>
      <div class="txt">${cardText(card)}${card.specialty ? `<br><i style="opacity:.8">專長：${card.specialty.join('、')}</i>` : ''}</div>
      <div class="holo"></div><div class="holo2"></div><div class="stars"></div></div>
    ${stats}<div class="gem">${label}</div>${count ? `<div class="count">×${count}</div>` : ''}</div>`;
}

// 全息光：依滑鼠位置移動反光與傾斜角度。
document.addEventListener('pointermove', e => {
  const c = e.target.closest?.('.card');
  if (!c || c.closest('.hand')) return;
  const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100;
  c.style.setProperty('--mx', x + '%'); c.style.setProperty('--my', y + '%');
  c.style.setProperty('--ry', (x - 50) * .3 + 'deg'); c.style.setProperty('--rx', (50 - y) * .25 + 'deg');
});
document.addEventListener('pointerout', e => {
  const c = e.target.closest?.('.card');
  if (c && !c.contains(e.relatedTarget)) {c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg');}
});
// 戰場上滑過隨從或場地時顯示完整卡牌。
document.addEventListener('pointerover', e => {
  const el = e.target.closest?.('[data-preview]');
  preview.innerHTML = el ? cardHTML(CARDS[el.dataset.preview]) : '';
});

function go(next) {screen = next; sel = null; preview.innerHTML = ''; render();}

// ---------- menu ----------
function renderMenu() {
  const stageBtns = Object.entries(STAGES).map(([k, s]) => `<button class="choice" data-stage="${k}" aria-pressed="${choice.stage === k}">${s.name}<small>${s.sub}</small></button>`).join('');
  const noSub = STAGES[choice.stage].noSubtype;
  const subBtns = Object.entries(SUBTYPES).map(([k, s]) => `<button class="choice" data-subtype="${k}" ${noSub ? 'disabled style="opacity:.4"' : ''} aria-pressed="${!noSub && choice.subtype === k}">${s.name}<small>${s.text}</small></button>`).join('');
  const owned = Object.values(collection.cards).reduce((a, b) => a + b, 0);
  app.innerHTML = `<section class="menu">
    <h1 class="logo">乳癌守護戰</h1>
    <p class="tagline">收集台大乳房醫學中心的醫療團隊，整合多專科，一起守護病人。</p>
    <div class="nav">
      <button class="btn" data-go="packs">開卡包${collection.freePacks ? `（${collection.freePacks}）` : ''}</button>
      <button class="btn" data-go="collection">我的收藏（${owned}）</button>
    </div>
    <div class="panel"><h2>選擇期別（關卡）</h2><div class="choices">${stageBtns}</div></div>
    <div class="panel"><h2>選擇亞型（敵方加成）</h2><div class="choices">${subBtns}</div>
      ${noSub ? '<p class="note">原位癌不分亞型，適合新手熟悉規則。</p>' : ''}<p class="note">對戰開始時亞型是隱藏的，用病理、影像或病理實驗室「揭露」後才會顯示。</p></div>
    <button class="btn go" data-go="battle" style="font-size:22px;padding:14px 46px">開始對戰</button>
    <p class="note" style="margin-top:24px">牌組會自動用你的收藏組成 30 張，不足的部分以基本治療卡補齊。<br>衛教內容為草稿，正式上線前需經院內審核。</p>
  </section>`;
  app.querySelectorAll('[data-stage]').forEach(b => b.onclick = () => {choice.stage = b.dataset.stage; render();});
  app.querySelectorAll('[data-subtype]').forEach(b => b.onclick = () => {choice.subtype = b.dataset.subtype; render();});
  bindNav();
}
function bindNav() {app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => (b.dataset.go === 'battle' ? startBattle() : go(b.dataset.go)));}

// ---------- packs ----------
const PACK_ICON = `<svg viewBox="0 0 24 24" fill="#ffd1e3">${'<path d="M12 2 C8 2 7 7 9.5 9.5 L7 21 L9.5 22 L12 12.5 L14.5 22 L17 21 L14.5 9.5 C17 7 16 2 12 2 Z M12 4 C14 4 14.4 7 12.8 8.6 L12 9.5 L11.2 8.6 C9.6 7 10 4 12 4 Z"/>'}</svg>`;
function renderPacks() {
  const reveal = lastPack ? `<div class="reveal">${lastPack.map(id => {const c = CARDS[id];
    return `<div class="flip" data-flip><div class="face back glow-${c.rarity}">${PACK_ICON}</div><div class="face front">${cardHTML(c)}</div></div>`;}).join('')}</div>
    <p class="note">點擊卡背翻開。光暈顏色代表稀有度：藍＝助理教授、紫＝副教授、橘＝教授。</p>` : '';
  app.innerHTML = `<section class="menu">
    <div class="nav"><button class="btn" data-go="menu">← 返回</button><button class="btn" data-go="collection">我的收藏</button></div>
    <div class="pack-area">
      <div class="pack" id="open" role="button" tabindex="0"><div>${PACK_ICON}乳房醫學中心<br>卡包<br><small style="font-size:13px;opacity:.8">剩餘 ${collection.freePacks || 0} 包</small></div></div>
      <div class="stats-row"><span>已開 ${collection.packsOpened} 包</span><span>距傳說保底 ${10 - collection.packsSinceLegendary} 包</span><span>經驗 ${collection.dust}</span></div>
      ${reveal}
      <p class="note">每包 5 張，至少 1 張稀有以上；連續 10 包未出傳說，下一包必出。全部免費，每場勝利可再得 1 包。</p>
    </div></section>`;
  bindNav();
  const open = app.querySelector('#open');
  open.onclick = () => {
    if (!collection.freePacks) {open.classList.add('shake'); setTimeout(() => open.classList.remove('shake'), 300); return;}
    collection.freePacks--; lastPack = openPack(collection); disenchantExtras(collection); save(); render();
  };
  app.querySelectorAll('[data-flip]').forEach(f => f.onclick = () => f.classList.add('open'));
}

// ---------- collection ----------
function renderCollection() {
  const order = {legendary: 0, epic: 1, rare: 2, common: 3, free: 4};
  const cards = [...COLLECTIBLE].sort((a, b) => order[a.rarity] - order[b.rarity] || a.cost - b.cost);
  app.innerHTML = `<section class="menu" style="max-width:1300px">
    <div class="nav"><button class="btn" data-go="menu">← 返回</button><button class="btn" data-go="packs">開卡包</button></div>
    <div class="stats-row"><span>經驗 ${collection.dust}（重複卡自動分解）</span><span>未擁有的卡可用經驗合成：點擊灰色卡片</span></div>
    <div class="grid">${cards.map(c => {const n = c.rarity === 'free' ? '∞' : collection.cards[c.id] || 0;
      return cardHTML(c, {count: n, owned: c.rarity === 'free' || n > 0, cls: n || c.rarity === 'free' ? '' : 'craftable'});}).join('')}</div></section>`;
  bindNav();
  app.querySelectorAll('.card.unowned').forEach(el => el.onclick = () => {
    const c = CARDS[el.dataset.card];
    if (confirm(`用 ${CRAFT[c.rarity]} 經驗合成「${c.name}」？（目前 ${collection.dust}）`) && craft(collection, c.id)) {save(); render();}
  });
}

// ---------- battle ----------
function startBattle() {
  game = newGame({stage: choice.stage, subtype: choice.subtype, deck: buildDeck(collection), seed: Number(params.get('seed')) || Date.now()});
  screen = 'battle'; sel = null; render(); showMulligan();
}

function showMulligan() {
  const picked = new Set();
  const draw = () => {
    modal.innerHTML = `<h2>起手換牌</h2><p>點選想換掉的牌，再按確定。</p>
      <div class="modal-cards">${game.player.hand.map((c, i) => cardHTML(CARDS[c.id], {cls: picked.has(i) ? 'picked' : '', attrs: `data-i="${i}"`})).join('')}</div>
      <div class="modal-actions"><button class="btn go" id="ok">確定</button></div>`;
    modal.querySelectorAll('[data-i]').forEach(el => el.onclick = () => {const i = +el.dataset.i; picked.has(i) ? picked.delete(i) : picked.add(i); draw();});
    modal.querySelector('#ok').onclick = () => {modal.close(); mulligan(game, [...picked]); render();};
  };
  draw(); if (!modal.open) modal.showModal();
}

function act(fn) {
  try {fn(); sel = null;} catch (err) {flash(err.message);}
  render();
  if (game.pending) showPending();
  else if (game.winner) showResult();
}
function flash(msg) {
  const h = document.createElement('div'); h.className = 'hint'; h.textContent = msg;
  app.querySelector('.board')?.append(h); setTimeout(() => h.remove(), 1400);
}

function showPending() {
  const p = game.pending;
  if (p.kind === 'quiz') {
    modal.innerHTML = `<div class="quiz"><h2>📘 衛教時刻</h2><p style="font-size:17px;font-weight:700">${p.q}</p>
      ${p.options.map((o, i) => `<button class="opt" data-i="${i}">${String.fromCharCode(65 + i)}. ${o}</button>`).join('')}
      <div id="after"></div><div class="src">答對：+1 法力、抽 1 張牌。來源：${p.source}</div></div>`;
    modal.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      const answer = p.answer, ok = answerQuiz(game, +b.dataset.i);
      modal.querySelectorAll('.opt').forEach((x, i) => {x.disabled = true; if (i === answer) x.classList.add('ok'); else if (x === b) x.classList.add('bad');});
      modal.querySelector('#after').innerHTML = `<p>${ok ? '✅ 答對了！' : '再接再厲！'} ${p.note}</p><div class="modal-actions"><button class="btn go" id="ok">繼續</button></div>`;
      modal.querySelector('#ok').onclick = () => {modal.close(); act(() => {});};
    });
  } else if (p.kind === 'discover') {
    modal.innerHTML = `<h2>發現：選擇一張治療卡</h2><div class="modal-cards">${p.options.map((id, i) => cardHTML(CARDS[id], {attrs: `data-i="${i}"`})).join('')}</div>`;
    modal.querySelectorAll('[data-i]').forEach(el => el.onclick = () => {modal.close(); act(() => chooseDiscover(game, +el.dataset.i));});
  }
  if (!modal.open) modal.showModal();
}

function showResult() {
  const won = game.winner === 'player';
  if (won) {collection.freePacks = (collection.freePacks || 0) + 1; save();}
  modal.innerHTML = `<h2>${won ? '🎗️ 守護成功！' : '這次沒能守住'}</h2>
    <p>${won ? `你的團隊陪伴病人度過了${STAGES[game.stage].name}（${game.mod.name}）。獲得 1 包卡包！` : '調整牌組、試試不同的科別組合，再挑戰一次。'}</p>
    <p class="note">提醒：遊戲為衛教與團隊介紹用途，實際治療請與醫療團隊討論。</p>
    <div class="modal-actions"><button class="btn" id="menu">回主選單</button><button class="btn go" id="again">再玩一次</button></div>`;
  modal.querySelector('#menu').onclick = () => {modal.close(); go('menu');};
  modal.querySelector('#again').onclick = () => {modal.close(); startBattle();};
  if (!modal.open) modal.showModal();
}

function doEndTurn() {
  if (busy || game.active !== 'player') return;
  act(() => endTurn(game));
  if (game.winner) return;
  busy = true;
  setTimeout(() => {busy = false; act(() => runEnemyTurn(game));}, 700);
}

function targetsFor(kind) {
  if (kind === 'attack') return validTargets(game, 'player');
  return [{kind: 'hero'}, ...game.enemy.board.map(m => ({kind: 'minion', uid: m.uid}))];
}
const isTarget = (t, ref) => t.some(x => x.kind === ref.kind && (x.kind === 'hero' || x.uid === ref.uid));

function onTarget(ref) {
  if (!sel) return;
  const s = sel;
  if (s.kind === 'attack') act(() => attack(game, s.uid, ref));
  else if (s.kind === 'play') act(() => playCard(game, s.index, ref));
  else if (s.kind === 'location') act(() => activateLocation(game, s.uid, ref));
}

function minionHTML(m, side) {
  const c = CARDS[m.id], atk = attackOf(game, side, m);
  const ready = side === 'player' && game.active === 'player' && !m.sleeping && !m.attacked;
  return `<div class="minion ${side === 'enemy' ? 'cancer' : ''} ${m.keywords.includes('taunt') ? 'taunt' : ''} ${ready ? 'ready' : ''} ${side === 'player' && m.sleeping ? 'sleeping' : ''}"
    data-side="${side}" data-uid="${m.uid}" data-preview="${m.id}"><div class="portrait">${cardArt(c)}</div>
    <div class="stat a ${atk > c.atk ? 'boost' : ''}">${atk}</div><div class="stat h ${m.hp < m.maxHp ? 'hurt' : ''}">${m.hp}</div></div>`;
}

function renderBattle() {
  const g = game, P = g.player, E = g.enemy, st = STAGES[g.stage], mod = g.mod;
  const targets = sel ? targetsFor(sel.kind === 'attack' ? 'attack' : 'spell') : [];
  const mods = !g.subtype ? '<span class="chip">原位癌：不分亞型</span>' : g.revealed ? [
    mod.shield ? `<span class="chip shield ${g.shieldBroken ? 'off' : ''}">🛡 ${mod.name}：護盾 ${E.hero.shield}</span>` : '',
    mod.regen ? `<span class="chip regen ${g.regenStopped ? 'off' : ''}">${mod.name}：每回合回復 ${mod.regen}</span>` : '',
    mod.minionAtk ? `<span class="chip atk">${mod.name}：隨從 +${mod.minionAtk} 攻擊</span>` : ''].join('') : '<span class="chip hidden">？ 亞型未知（需病理揭露）</span>';
  const crystals = (p, enemy) => `<span style="margin-right:6px">${p.mana + p.tempMana}/${p.maxMana}</span>${Array.from({length: 10}, (_, i) => `<i class="${i < p.mana ? '' : i < p.mana + p.tempMana ? 'temp' : 'off'}" style="${i >= Math.max(p.maxMana, p.mana + p.tempMana) ? 'opacity:.25' : ''}"></i>`).join('')}`;
  const myTurn = g.active === 'player' && !g.winner;
  app.innerHTML = `<div class="stage-wrap"><div class="board" id="board">
    <div class="top-left"><button class="btn" id="quit">← 離開</button><span class="chip">${st.name}・${st.sub}</span></div>
    <div class="enemy-hand">${E.hand.map(() => '<i></i>').join('')}</div>
    <div class="hero-name enemy">${E.hero.name}${g.phases.length ? `（還有 ${g.phases.length} 個階段）` : ''}</div>
    <div class="hero enemy ${isTarget(targets, {kind: 'hero'}) ? 'targetable' : ''}" id="enemy-hero">${ENEMY_PORTRAIT}</div>
    <div class="hero-stats enemy"><div class="pip hp">${E.hero.hp}</div>${E.hero.shield && g.revealed ? `<div class="pip shield">${E.hero.shield}</div>` : E.hero.shield ? '<div class="pip shield">?</div>' : ''}</div>
    <div class="mods">${mods}</div>
    <div class="mana enemy">${crystals(E)}</div>
    <div class="deck enemy" title="乳癌牌庫">${E.deck.length}</div>
    <div class="row enemy">${E.board.map(m => minionHTML(m, 'enemy')).join('')}</div>
    ${mdtActive(g) ? '<div class="mdt">🔗 多專科團隊會診：友方隨從 +1 攻擊</div>' : ''}
    <div class="row player">${P.board.map(m => minionHTML(m, 'player')).join('')}</div>
    <div class="locs">${P.locations.map(l => `<div class="loc ${l.used || !myTurn ? 'used' : ''}" data-loc="${l.uid}" data-preview="${l.id}">${LOCATION_ART[CARDS[l.id].art]}<span>${l.name}</span><b>${l.durability}</b></div>`).join('')}</div>
    <div class="log" id="log">${g.log.slice(-40).map(l => `<div>${l}</div>`).join('')}</div>
    <div class="deck player" title="你的牌庫">${P.deck.length}</div>
    <button class="btn go end-turn" id="end" ${myTurn ? '' : 'disabled'}>${myTurn ? '結束回合' : '乳癌回合…'}</button>
    <div class="hero-name player">病人（你守護的對象）</div>
    <div class="hero player">${PATIENT_PORTRAIT}</div>
    <div class="hero-stats player"><div class="pip hp">${P.hero.hp}</div>${P.hero.armor ? `<div class="pip armor">${P.hero.armor}</div>` : ''}</div>
    <button class="hero-power" id="power" ${myTurn && !P.heroPowerUsed && P.mana + P.tempMana >= 2 ? '' : 'disabled'} title="恢復病人 2 點生命並獲得 1 點護甲"><span class="c">2</span>多專科<br>會診</button>
    <div class="mana">${crystals(P)}</div>
    <div class="hand">${P.hand.map((c, i) => {const n = P.hand.length, rot = (i - (n - 1) / 2) * 5, y = Math.abs(i - (n - 1) / 2) * 8;
      return cardHTML(CARDS[c.id], {cls: `${myTurn && canPlay(g, 'player', i) ? 'playable' : ''} ${sel?.kind === 'play' && sel.index === i ? 'selected' : ''}`,
        attrs: `data-hand="${i}"`, style: `transform:rotate(${rot}deg) translateY(${y}px) scale(.62)`});}).join('')}</div>
    ${sel ? `<div class="hint">${sel.kind === 'attack' ? '選擇攻擊目標' : '選擇一個目標'}（右鍵或 Esc 取消）</div>` : ''}
  </div></div>`;
  fitBoard();
  const log = app.querySelector('#log'); log.scrollTop = log.scrollHeight;
  if (targets.length) targets.forEach(t => t.kind === 'minion' && app.querySelector(`.minion[data-uid="${t.uid}"]`)?.classList.add('targetable'));
  if (sel?.kind === 'attack') app.querySelector(`.minion[data-uid="${sel.uid}"]`)?.classList.add('selected');

  app.querySelector('#quit').onclick = () => {if (confirm('離開對戰？')) go('menu');};
  app.querySelector('#end').onclick = doEndTurn;
  app.querySelector('#power').onclick = () => act(() => useHeroPower(game));
  app.querySelector('#enemy-hero').onclick = () => onTarget({kind: 'hero'});
  app.querySelectorAll('.minion').forEach(el => el.onclick = () => {
    const uid = +el.dataset.uid;
    if (el.dataset.side === 'enemy') return onTarget({kind: 'minion', uid});
    if (!myTurn) return;
    sel = sel?.kind === 'attack' && sel.uid === uid ? null : {kind: 'attack', uid}; render();
  });
  app.querySelectorAll('[data-loc]').forEach(el => el.onclick = () => {
    if (!myTurn) return;
    const uid = +el.dataset.loc, loc = P.locations.find(l => l.uid === uid);
    if (loc.used) return flash('這個場地本回合已啟動');
    if (needsTarget(CARDS[loc.id].activate)) {sel = {kind: 'location', uid}; render();} else act(() => activateLocation(game, uid));
  });
  app.querySelectorAll('[data-hand]').forEach(el => el.onclick = () => {
    if (!myTurn) return;
    const i = +el.dataset.hand, card = CARDS[P.hand[i].id];
    if (!canPlay(g, 'player', i)) {el.classList.add('shake'); return flash(card.cost > P.mana + P.tempMana ? '法力不足' : '場上已滿');}
    const effects = card.type === 'minion' ? card.battlecry : card.effects || [];
    if (needsTarget(effects)) {sel = {kind: 'play', index: i}; render();} else act(() => playCard(game, i));
  });
}

function fitBoard() {
  const b = app.querySelector('#board'); if (!b) return;
  const s = Math.min(innerWidth / 1310, innerHeight / 830, 1.25);
  b.style.transform = `scale(${s})`;
}
addEventListener('resize', fitBoard);
addEventListener('keydown', e => {if (e.key === 'Escape' && sel) {sel = null; render();}});
addEventListener('contextmenu', e => {if (sel) {e.preventDefault(); sel = null; render();}});

function render() {
  if (screen === 'battle' && game) renderBattle();
  else if (screen === 'packs') renderPacks();
  else if (screen === 'collection') renderCollection();
  else renderMenu();
}

if (screen === 'battle') startBattle(); else render();
window.__game = () => game;
window.__render = render;
