import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, mulligan, playCard, endTurn, attack, draw, activateLocation, answerQuiz, chooseDiscover, runEnemyTurn, validTargets, mdtActive, rng, LIMITS} from '../src/engine.js';
import {CARDS, COLLECTIBLE, DOCTORS, rarityOf} from '../src/cards.js';
import {openPack, newCollection, buildDeck, disenchantExtras, LEGENDARY_PITY} from '../src/packs.js';

const deckOf = id => Array(30).fill(id);
function started(opts = {}) {const s = newGame({seed: 1, deck: deckOf('t-nutrition'), ...opts}); mulligan(s, []); return s;}
function give(s, id) {s.player.hand.push({uid: s.uid++, id}); return s.player.hand.length - 1;}
function place(s, who, id, extra = {}) {
  const c = CARDS[id], m = {uid: s.uid++, id, name: c.name, atk: c.atk, hp: c.hp, maxHp: c.hp, keywords: [...c.keywords], dept: c.dept, endOfTurn: c.endOfTurn, deathrattle: c.deathrattle, sleeping: false, attacked: false, ...extra};
  s[who].board.push(m); return m;
}

test('rarity follows academic rank', () => {
  assert.equal(rarityOf('教授'), 'legendary');
  assert.equal(rarityOf('副教授'), 'epic');
  assert.equal(rarityOf('助理教授'), 'rare');
  assert.equal(rarityOf('主治醫師'), 'common');
  for (const d of DOCTORS) assert.equal(d.rarity, rarityOf(d.rank));
});

test('opening hands, mulligan and mana ramp', () => {
  const s = newGame({seed: 3, deck: deckOf('t-nutrition')});
  assert.equal(s.player.hand.length, 3);
  assert.equal(s.enemy.hand.length, 4);
  mulligan(s, [0, 1]);
  assert.equal(s.player.hand.length, 4);
  assert.equal(s.player.mana, 1);
  endTurn(s); // enemy turn 1
  assert.equal(s.enemy.mana, 1);
  endTurn(s);
  assert.equal(s.player.maxMana, 2);
});

test('mana caps at 10', () => {
  const s = started();
  for (let i = 0; i < 30 && !s.winner; i++) endTurn(s);
  assert.equal(s.player.maxMana, LIMITS.mana);
});

test('fatigue grows each empty draw', () => {
  const s = started();
  s.player.deck = [];
  const hp = s.player.hero.hp;
  draw(s, 'player'); draw(s, 'player');
  assert.equal(s.player.hero.hp, hp - 3);
});

test('full hand burns the drawn card', () => {
  const s = started();
  while (s.player.hand.length < LIMITS.hand) give(s, 't-nutrition');
  const before = s.player.deck.length;
  draw(s, 'player');
  assert.equal(s.player.hand.length, LIMITS.hand);
  assert.equal(s.player.deck.length, before - 1);
});

test('taunt must be attacked first', () => {
  const s = started();
  const me = place(s, 'player', 'surg-3');
  const taunt = place(s, 'enemy', 'c-tumor');
  place(s, 'enemy', 'c-cell');
  assert.deepEqual(validTargets(s, 'player'), [{kind: 'minion', uid: taunt.uid}]);
  assert.throws(() => attack(s, me.uid, {kind: 'hero'}));
  attack(s, me.uid, {kind: 'minion', uid: taunt.uid});
  assert.equal(taunt.hp, 5 - 3);
});

test('summoned minions sleep unless charge', () => {
  const s = started();
  s.player.mana = 10;
  const i = give(s, 'surg-3');
  playCard(s, i, {kind: 'hero'});
  const m = s.player.board.at(-1);
  assert.throws(() => attack(s, m.uid, {kind: 'hero'}));
});

test('HER2 shield absorbs damage until removed by targeted therapy', () => {
  const s = started({subtype: 'HER2+'});
  const hp = s.enemy.hero.hp;
  s.player.mana = 10;
  playCard(s, give(s, 't-sentinel'), {kind: 'hero'});
  assert.equal(s.enemy.hero.hp, hp);
  assert.equal(s.enemy.hero.shield, 3);
  playCard(s, give(s, 't-target'));
  assert.equal(s.enemy.hero.shield, 0);
  assert.equal(s.enemy.hero.hp, hp - 5); // 3 + HER2 bonus 2
  endTurn(s);
  assert.equal(s.enemy.hero.shield, 0, 'broken shield does not regenerate');
});

test('HR+ regenerates until hormone therapy', () => {
  const s = started({subtype: 'HR+'});
  s.enemy.hero.hp -= 10;
  const hp = s.enemy.hero.hp;
  endTurn(s); endTurn(s);
  assert.equal(s.enemy.hero.hp, hp + 2);
  s.player.mana = 10;
  playCard(s, give(s, 't-hormone'));
  endTurn(s); endTurn(s);
  assert.equal(s.enemy.hero.hp, hp + 2 - 2);
});

test('TNBC enemy minions gain attack', () => {
  const s = started({subtype: 'TNBC'});
  s.active = 'enemy'; s.enemy.mana = 10;
  s.enemy.hand = [{uid: s.uid++, id: 'c-cell'}];
  playCard(s, 0);
  assert.equal(s.enemy.board[0].atk, 2);
});

test('multidisciplinary team gives +1 attack with 3 departments', () => {
  const s = started();
  const a = place(s, 'player', 'surg-3');
  place(s, 'player', 'onc-2');
  assert.equal(mdtActive(s), false);
  place(s, 'player', 'path-1');
  assert.equal(mdtActive(s), true);
  attack(s, a.uid, {kind: 'hero'});
  assert.equal(s.enemy.hero.hp, s.enemy.hero.maxHp - 4);
});

test('quiz rewards correct answers', () => {
  const s = started();
  s.player.mana = 1;
  playCard(s, give(s, 't-mammo'));
  assert.equal(s.pending.kind, 'quiz');
  assert.throws(() => endTurn(s));
  const hand = s.player.hand.length;
  assert.equal(answerQuiz(s, s.pending.answer), true);
  assert.equal(s.player.tempMana, 1);
  assert.equal(s.player.hand.length, hand + 1);
});

test('discover adds one of three cards', () => {
  const s = started();
  s.player.mana = 10;
  playCard(s, give(s, 'gen-1'));
  assert.equal(s.pending.options.length, 3);
  const pick = s.pending.options[1];
  chooseDiscover(s, 1);
  assert.equal(s.player.hand.at(-1).id, pick);
});

test('locations activate once per turn and expire', () => {
  const s = started();
  s.player.mana = 10;
  playCard(s, give(s, 'l-or'));
  const loc = s.player.locations[0];
  activateLocation(s, loc.uid, {kind: 'hero'});
  assert.throws(() => activateLocation(s, loc.uid));
  endTurn(s); endTurn(s);
  activateLocation(s, loc.uid, {kind: 'hero'});
  assert.equal(s.player.locations.length, 0);
});

test('stage IV has a second phase', () => {
  const s = started({stage: 'IV'});
  s.enemy.hero.hp = 1; s.player.mana = 10;
  playCard(s, give(s, 't-sentinel'), {kind: 'hero'});
  assert.equal(s.winner, null);
  assert.equal(s.enemy.hero.hp, 25);
});

test('enemy AI plays a full game without errors', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const col = newCollection();
    const r = rng(seed);
    for (let i = 0; i < 10; i++) openPack(col, r);
    const s = newGame({seed, stage: 'II', subtype: ['HR+', 'HER2+', 'TNBC'][seed % 3], deck: buildDeck(col)});
    mulligan(s, []);
    for (let turn = 0; turn < 80 && !s.winner; turn++) {
      endTurn(s);
      runEnemyTurn(s);
    }
    assert.ok(s.winner, `seed ${seed} finished`);
  }
});

test('packs: 5 cards, at least one rare, legendary pity', () => {
  const col = newCollection(), r = rng(9);
  let sawLegendaryByPity = true;
  for (let i = 0; i < 200; i++) {
    const before = col.packsSinceLegendary;
    const ids = openPack(col, r);
    assert.equal(ids.length, 5);
    assert.ok(ids.some(id => CARDS[id].rarity !== 'common'));
    if (before + 1 >= LEGENDARY_PITY) sawLegendaryByPity &&= ids.some(id => CARDS[id].rarity === 'legendary');
  }
  assert.ok(sawLegendaryByPity);
  assert.ok(disenchantExtras(col) > 0);
  assert.equal(buildDeck(col).length, 30);
  assert.ok(COLLECTIBLE.every(c => CARDS[c.id]));
});
