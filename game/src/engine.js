// 純邏輯的規則引擎：不碰 DOM，可在 Node 測試。
import {CARDS, COLLECTIBLE, needsTarget} from './cards.js';
import {STAGES, SUBTYPES, NO_SUBTYPE} from '../data/stages.js';
import {QUIZ} from '../data/education.js';

export const LIMITS = {hand: 10, board: 7, locations: 3, mana: 10, patientHp: 30};

export function rng(seed) {
  let a = seed >>> 0;
  return () => {a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296;};
}
function shuffle(list, rand) {
  for (let i = list.length - 1; i > 0; i--) {const j = Math.floor(rand() * (i + 1)); [list[i], list[j]] = [list[j], list[i]];}
  return list;
}
const other = side => (side === 'player' ? 'enemy' : 'player');

export function newGame({stage = 'I', subtype = 'HR+', deck, seed = Date.now(), quiz = QUIZ} = {}) {
  const st = STAGES[stage], rand = rng(seed);
  if (st.noSubtype) subtype = null;
  const mod = subtype ? SUBTYPES[subtype] : NO_SUBTYPE;
  const enemyDeck = Object.entries(st.deck).flatMap(([id, n]) => Array(n).fill(id));
  const state = {
    rand, uid: 1, turn: 0, active: 'player', phase: 'mulligan', winner: null, pending: null, log: [], quiz, quizSeen: [],
    stage, subtype, revealed: false, regenStopped: false, shieldBroken: false,
    player: side('病人', LIMITS.patientHp, shuffle([...deck], rand)),
    enemy: side(`乳癌・${st.name}`, st.phases[0], shuffle(enemyDeck, rand)),
    phases: st.phases.slice(1), heroPower: st.heroPower, mod
  };
  state.player.heroPower = {name: '多專科會診', cost: 2, effects: [{type: 'heal', target: 'friendly_hero', amount: 2}, {type: 'armor', amount: 1}]};
  state.enemy.heroPower = st.heroPower;
  if (mod.shield) state.enemy.hero.shield = mod.shield;
  for (let i = 0; i < 3; i++) draw(state, 'player');
  for (let i = 0; i < 4; i++) draw(state, 'enemy');
  return state;
}
function side(name, hp, deck) {
  return {hero: {name, hp, maxHp: hp, armor: 0, shield: 0}, mana: 0, maxMana: 0, tempMana: 0, deck, hand: [], board: [], locations: [], fatigue: 0, heroPowerUsed: false};
}

const log = (s, msg) => s.log.push(msg);
const instance = (s, id) => ({uid: s.uid++, id});

export function draw(s, who) {
  const p = s[who];
  if (!p.deck.length) {p.fatigue++; log(s, `${who === 'player' ? '你' : '乳癌'}的牌庫已空，疲勞 ${p.fatigue} 點傷害`); damageHero(s, who, p.fatigue, true); return null;}
  const card = instance(s, p.deck.pop());
  if (p.hand.length >= LIMITS.hand) {log(s, `手牌已滿，${CARDS[card.id].name} 被銷毀`); return null;}
  p.hand.push(card);
  return card;
}

export function mulligan(s, handIndexes = []) {
  if (s.phase !== 'mulligan') throw Error('不在換牌階段');
  const p = s.player, keep = [], back = [];
  p.hand.forEach((c, i) => (handIndexes.includes(i) ? back : keep).push(c));
  p.hand = keep;
  back.forEach(() => draw(s, 'player'));
  p.deck.push(...back.map(c => c.id)); shuffle(p.deck, s.rand);
  s.phase = 'play';
  startTurn(s, 'player');
}

export function startTurn(s, who) {
  const p = s[who];
  s.active = who; s.turn++;
  p.maxMana = Math.min(LIMITS.mana, p.maxMana + 1); p.mana = p.maxMana; p.tempMana = 0; p.heroPowerUsed = false;
  p.board.forEach(m => {m.sleeping = false; m.attacked = false;});
  p.locations.forEach(l => {l.used = false;});
  if (who === 'enemy' && s.mod.shieldRegen && !s.shieldBroken) s[who].hero.shield = Math.min(s.mod.shield, s[who].hero.shield + s.mod.shieldRegen);
  draw(s, who);
  resolve(s);
}

export function endTurn(s) {
  assertCanAct(s);
  const who = s.active, p = s[who];
  for (const m of [...p.board]) if (m.endOfTurn?.length) runEffects(s, who, m.endOfTurn, null, m.name);
  if (who === 'enemy' && s.mod.regen && !s.regenStopped) healHero(s, 'enemy', s.mod.regen, '荷爾蒙受體陽性');
  resolve(s);
  if (!s.winner) startTurn(s, other(who));
}

function assertCanAct(s) {
  if (s.winner) throw Error('遊戲已結束');
  if (s.phase !== 'play') throw Error('請先完成換牌');
  if (s.pending) throw Error('請先完成目前的選擇');
}
const available = p => p.mana + p.tempMana;
function spend(p, n) {const t = Math.min(p.tempMana, n); p.tempMana -= t; p.mana -= n - t;}

export function canPlay(s, who, handIndex) {
  const p = s[who], c = p.hand[handIndex] && CARDS[p.hand[handIndex].id];
  if (!c || c.cost > available(p)) return false;
  if (c.type === 'minion' && p.board.length >= LIMITS.board) return false;
  if (c.type === 'location' && p.locations.length >= LIMITS.locations) return false;
  return true;
}

export function playCard(s, handIndex, target = null) {
  assertCanAct(s);
  const who = s.active, p = s[who];
  if (!canPlay(s, who, handIndex)) throw Error('無法打出這張牌');
  const card = CARDS[p.hand[handIndex].id];
  const effects = card.type === 'minion' ? card.battlecry : card.type === 'spell' ? card.effects : [];
  if (needsTarget(effects) && !target) target = autoTarget(s, who);
  const [inst] = p.hand.splice(handIndex, 1);
  spend(p, card.cost);
  log(s, `${who === 'player' ? '你' : '乳癌'}打出「${card.name}」`);
  if (card.type === 'minion') summon(s, who, card.id, inst.uid);
  if (card.type === 'location') p.locations.push({uid: inst.uid, id: card.id, name: card.name, durability: card.durability, used: false});
  runEffects(s, who, effects, target, card.name);
  resolve(s);
}

function summon(s, who, id, uid = s.uid++) {
  const p = s[who], c = CARDS[id];
  if (p.board.length >= LIMITS.board) return null;
  const extraAtk = who === 'enemy' ? s.mod.minionAtk || 0 : 0;
  const m = {uid, id, name: c.name, atk: c.atk + extraAtk, hp: c.hp, maxHp: c.hp, keywords: [...c.keywords], dept: c.dept,
    endOfTurn: c.endOfTurn, deathrattle: c.deathrattle, sleeping: !c.keywords.includes('charge'), attacked: false};
  p.board.push(m);
  return m;
}

export function activateLocation(s, uid, target = null) {
  assertCanAct(s);
  const who = s.active, loc = s[who].locations.find(l => l.uid === uid);
  if (!loc || loc.used) throw Error('這個場地本回合已啟動');
  const card = CARDS[loc.id];
  if (needsTarget(card.activate) && !target) target = autoTarget(s, who);
  loc.used = true; loc.durability--;
  log(s, `啟動場地「${loc.name}」`);
  runEffects(s, who, card.activate, target, loc.name);
  s[who].locations = s[who].locations.filter(l => l.durability > 0);
  resolve(s);
}

export function useHeroPower(s, target = null) {
  assertCanAct(s);
  const who = s.active, p = s[who], hp = p.heroPower;
  if (p.heroPowerUsed || available(p) < hp.cost) throw Error('無法使用英雄技能');
  spend(p, hp.cost); p.heroPowerUsed = true;
  log(s, `${who === 'player' ? '你' : '乳癌'}使用「${hp.name}」`);
  runEffects(s, who, hp.effects, target || autoTarget(s, who), hp.name);
  resolve(s);
}

// 多專科團隊：場上有 3 個以上不同科別的醫師時，所有友方隨從 +1 攻擊。
export function mdtActive(s) {return new Set(s.player.board.map(m => m.dept).filter(Boolean)).size >= 3;}
export function attackOf(s, who, m) {return m.atk + (who === 'player' && mdtActive(s) ? 1 : 0);}

export function validTargets(s, attackerSide) {
  const foe = s[other(attackerSide)], taunts = foe.board.filter(m => m.keywords.includes('taunt'));
  return taunts.length ? taunts.map(m => ({kind: 'minion', uid: m.uid})) : [{kind: 'hero'}, ...foe.board.map(m => ({kind: 'minion', uid: m.uid}))];
}

export function attack(s, attackerUid, target) {
  assertCanAct(s);
  const who = s.active, m = s[who].board.find(x => x.uid === attackerUid);
  if (!m) throw Error('找不到攻擊者');
  if (m.sleeping || m.attacked) throw Error('這個隨從現在不能攻擊');
  if (!validTargets(s, who).some(t => t.kind === target.kind && (t.kind === 'hero' || t.uid === target.uid))) throw Error('必須先攻擊嘲諷隨從');
  const atk = attackOf(s, who, m), foe = other(who);
  m.attacked = true;
  if (target.kind === 'hero') {log(s, `${m.name} 攻擊${s[foe].hero.name}`); damageHero(s, foe, atk);} else {
    const t = s[foe].board.find(x => x.uid === target.uid);
    log(s, `${m.name} 攻擊 ${t.name}`);
    t.hp -= atk; m.hp -= attackOf(s, foe, t);
  }
  resolve(s);
}

function damageHero(s, who, amount, pierce = false) {
  const h = s[who].hero;
  if (!pierce && h.shield > 0) {const a = Math.min(h.shield, amount); h.shield -= a; amount -= a; if (a) log(s, `護盾吸收 ${a} 點傷害`);}
  const ar = Math.min(h.armor, amount); h.armor -= ar; amount -= ar;
  h.hp -= amount;
}
function healHero(s, who, amount, source) {
  const h = s[who].hero, before = h.hp;
  h.hp = Math.min(h.maxHp, h.hp + amount);
  if (h.hp > before) log(s, `${source}：${h.name} 恢復 ${h.hp - before} 點生命`);
}

export function autoTarget(s, who) {
  const foe = s[other(who)].board;
  if (!foe.length) return {kind: 'hero'};
  const taunt = foe.find(m => m.keywords.includes('taunt'));
  if (taunt) return {kind: 'minion', uid: taunt.uid};
  return {kind: 'minion', uid: [...foe].sort((a, b) => b.atk - a.atk)[0].uid};
}

function runEffects(s, who, effects, target, source) {
  const foe = other(who);
  for (const e of effects) {
    switch (e.type) {
      case 'damage': {
        const amount = e.amount + (e.her2Bonus && s.subtype === 'HER2+' ? e.her2Bonus : 0) + (who === 'player' && e.target === 'all_enemies' ? s.mod.aoeBonus || 0 : 0);
        const hitMinion = m => {m.hp -= amount;};
        if (e.target === 'enemy_hero') damageHero(s, foe, amount, e.pierce);
        else if (e.target === 'all_enemy_minions') s[foe].board.forEach(hitMinion);
        else if (e.target === 'all_enemies') {s[foe].board.forEach(hitMinion); damageHero(s, foe, amount, e.pierce);}
        else if (e.target === 'chosen_enemy') {
          const t = target?.kind === 'minion' ? s[foe].board.find(m => m.uid === target.uid) : null;
          if (t) hitMinion(t); else damageHero(s, foe, amount, e.pierce);
        }
        log(s, `${source}：造成 ${amount} 點傷害`);
        break;
      }
      case 'heal': healHero(s, who, e.amount, source); break;
      case 'armor': s[who].hero.armor += e.amount; log(s, `${source}：獲得 ${e.amount} 點護甲`); break;
      case 'draw': for (let i = 0; i < e.amount; i++) draw(s, who); break;
      case 'buff': s[who].board.forEach(m => {m.atk += e.atk; m.hp += e.hp; m.maxHp += e.hp;}); log(s, `${source}：友方隨從 +${e.atk}/+${e.hp}`); break;
      case 'summon': if (summon(s, who, e.card)) log(s, `${source}：召喚 ${CARDS[e.card].name}`); break;
      case 'gainMana': s[who].tempMana += e.amount; break;
      case 'removeShield': if (who === 'player' && s.mod.shield && !s.shieldBroken) {s.enemy.hero.shield = 0; s.shieldBroken = true; log(s, `${source}：HER2 護盾被移除`);} break;
      case 'stopRegen': if (who === 'player') {s.regenStopped = true; log(s, `${source}：乳癌不再回復生命`);} break;
      case 'reveal': if (who === 'player' && !s.revealed) {s.revealed = true; log(s, `${source}：揭露亞型「${s.mod.name}」`);} break;
      case 'quiz': if (who === 'player') queueQuiz(s); break;
      case 'discover': if (who === 'player') queueDiscover(s); break;
    }
  }
}

function queueQuiz(s) {
  let pool = s.quiz.map((_, i) => i).filter(i => !s.quizSeen.includes(i));
  if (!pool.length) {s.quizSeen = []; pool = s.quiz.map((_, i) => i);}
  const i = pool[Math.floor(s.rand() * pool.length)];
  s.quizSeen.push(i);
  s.pending = {kind: 'quiz', index: i, ...s.quiz[i]};
}
export function answerQuiz(s, choice) {
  if (s.pending?.kind !== 'quiz') throw Error('沒有進行中的衛教題');
  const correct = choice === s.pending.answer;
  s.pending = null;
  if (correct) {s.player.tempMana += 1; draw(s, 'player'); log(s, '衛教時刻答對：+1 法力、抽 1 張牌');} else log(s, '衛教時刻：再接再厲！');
  return correct;
}

function queueDiscover(s) {
  const pool = COLLECTIBLE.filter(c => c.type === 'spell');
  const options = shuffle(pool.map(c => c.id), s.rand).slice(0, 3);
  s.pending = {kind: 'discover', options};
}
export function chooseDiscover(s, i) {
  if (s.pending?.kind !== 'discover') throw Error('沒有進行中的發現');
  const id = s.pending.options[i];
  s.pending = null;
  if (s.player.hand.length < LIMITS.hand) s.player.hand.push(instance(s, id));
  log(s, `發現「${CARDS[id].name}」`);
}

// 結算死亡、亡語、階段轉換與勝負。
function resolve(s) {
  for (let guard = 0; guard < 20; guard++) {
    let died = false;
    for (const who of ['player', 'enemy']) {
      const dead = s[who].board.filter(m => m.hp <= 0);
      if (!dead.length) continue;
      died = true;
      s[who].board = s[who].board.filter(m => m.hp > 0);
      for (const m of dead) {log(s, `${m.name} 被移除`); if (m.deathrattle?.length) runEffects(s, who, m.deathrattle, null, m.name);}
    }
    if (!died) break;
  }
  const e = s.enemy.hero;
  if (e.hp <= 0 && s.phases.length) {
    e.maxHp = e.hp = s.phases.shift();
    log(s, '乳癌進入下一階段：轉移！');
  }
  if (s.player.hero.hp <= 0) s.winner = 'enemy';
  else if (e.hp <= 0) s.winner = 'player';
}

// 簡易 AI：能出就出（高費優先）、能用英雄技能就用、有利交換才交換，否則打臉。
export function runEnemyTurn(s) {
  if (s.active !== 'enemy' || s.winner) return;
  const p = s.enemy;
  for (let played = true; played && !s.winner;) {
    played = false;
    const order = p.hand.map((c, i) => [CARDS[c.id].cost, i]).sort((a, b) => b[0] - a[0]);
    for (const [, i] of order) if (canPlay(s, 'enemy', i)) {playCard(s, i); played = true; break;}
  }
  if (!s.winner && !p.heroPowerUsed && available(p) >= p.heroPower.cost) useHeroPower(s);
  for (const m of [...p.board]) {
    if (s.winner || m.sleeping || m.attacked || !p.board.includes(m)) continue;
    const targets = validTargets(s, 'enemy');
    const trade = targets.filter(t => t.kind === 'minion').map(t => s.player.board.find(x => x.uid === t.uid))
      .find(t => attackOf(s, 'enemy', m) >= t.hp && attackOf(s, 'player', t) < m.hp);
    const target = trade ? {kind: 'minion', uid: trade.uid} : targets.find(t => t.kind === 'hero') || targets[0];
    attack(s, m.uid, target);
  }
  if (!s.winner) endTurn(s);
}
