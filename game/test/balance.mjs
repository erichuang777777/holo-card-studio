// 平衡模擬：簡單玩家 AI 對各期別、亞型的勝率。用法：node test/balance.mjs [包數]
import {newGame, mulligan, playCard, endTurn, attack, activateLocation, useHeroPower, answerQuiz, chooseDiscover, runEnemyTurn, validTargets, canPlay, rng} from '../src/engine.js';
import {CARDS} from '../src/cards.js';
import {openPack, newCollection, buildDeck} from '../src/packs.js';
import {STAGES, SUBTYPES} from '../data/stages.js';

const packs = Number(process.argv[2] || 10);
function playerTurn(s) {
  const p = s.player;
  const settle = () => {if (s.pending?.kind === 'quiz') answerQuiz(s, s.rand() < .8 ? s.pending.answer : -1); if (s.pending?.kind === 'discover') chooseDiscover(s, 0);};
  for (let again = true; again && !s.winner;) {
    again = false;
    const order = p.hand.map((c, i) => [CARDS[c.id].cost, i]).sort((a, b) => b[0] - a[0]);
    for (const [, i] of order) if (canPlay(s, 'player', i)) {playCard(s, i); settle(); again = true; break;}
  }
  for (const l of [...p.locations]) if (!l.used && !s.winner) {activateLocation(s, l.uid); settle();}
  if (!s.winner && !p.heroPowerUsed && p.mana + p.tempMana >= 2) useHeroPower(s);
  for (const m of [...p.board]) {
    if (s.winner || m.sleeping || m.attacked || !p.board.includes(m)) continue;
    const t = validTargets(s, 'player');
    attack(s, m.uid, t.find(x => x.kind === 'hero') || t[0]);
  }
}
const N = 200;
console.log(`收藏：開 ${packs} 包`);
for (const stage of Object.keys(STAGES)) {
  const row = [];
  for (const sub of Object.keys(SUBTYPES)) {
    let win = 0, turns = 0;
    for (let seed = 1; seed <= N; seed++) {
      const col = newCollection(), r = rng(seed * 7);
      for (let i = 0; i < packs; i++) openPack(col, r);
      const s = newGame({seed, stage, subtype: sub, deck: buildDeck(col)});
      mulligan(s, []);
      while (!s.winner && s.turn < 120) {playerTurn(s); if (!s.winner) endTurn(s); runEnemyTurn(s);}
      if (s.winner === 'player') win++;
      turns += s.turn;
    }
    row.push(`${sub} ${String(Math.round(win / N * 100)).padStart(3)}%（${(turns / N / 2).toFixed(1)} 回合）`);
  }
  console.log(`${STAGES[stage].name.padEnd(6)} ${row.join('   ')}`);
}
