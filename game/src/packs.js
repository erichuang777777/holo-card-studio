// 抽卡：每包 5 張、每包至少 1 張稀有以上、連續 10 包未出傳說則下一包保底。
import {COLLECTIBLE} from './cards.js';

export const PACK_SIZE = 5;
export const ODDS = {common: 0.70, rare: 0.22, epic: 0.06, legendary: 0.02};
export const LEGENDARY_PITY = 10;
export const DUST = {common: 5, rare: 20, epic: 100, legendary: 400};
export const CRAFT = {common: 40, rare: 100, epic: 400, legendary: 1600};

const pool = rarity => COLLECTIBLE.filter(c => c.rarity === rarity);
function rollRarity(rand) {
  let r = rand();
  for (const [rarity, p] of Object.entries(ODDS)) {if ((r -= p) < 0) return rarity;}
  return 'common';
}
function pick(rarity, rand) {const list = pool(rarity); return list[Math.floor(rand() * list.length)].id;}

export function newCollection() {return {cards: {}, dust: 0, packsSinceLegendary: 0, packsOpened: 0};}

export function openPack(collection, rand = Math.random) {
  const rarities = Array.from({length: PACK_SIZE}, () => rollRarity(rand));
  if (!rarities.some(r => r !== 'common')) rarities[PACK_SIZE - 1] = 'rare';
  if (collection.packsSinceLegendary + 1 >= LEGENDARY_PITY && !rarities.includes('legendary')) rarities[0] = 'legendary';
  const ids = rarities.map(r => pick(r, rand));
  collection.packsOpened++;
  collection.packsSinceLegendary = rarities.includes('legendary') ? 0 : collection.packsSinceLegendary + 1;
  for (const id of ids) collection.cards[id] = (collection.cards[id] || 0) + 1;
  return ids;
}

const maxCopies = card => (card.rarity === 'legendary' ? 1 : 2);

// 超過可放入牌組數量的重複卡，自動分解成「經驗」。
export function disenchantExtras(collection) {
  let gained = 0;
  for (const card of COLLECTIBLE) {
    const n = collection.cards[card.id] || 0, extra = n - maxCopies(card);
    if (extra > 0 && DUST[card.rarity]) {collection.cards[card.id] -= extra; gained += extra * DUST[card.rarity];}
  }
  collection.dust += gained;
  return gained;
}

export function craft(collection, id) {
  const card = COLLECTIBLE.find(c => c.id === id), cost = CRAFT[card?.rarity];
  if (!cost || collection.dust < cost || (collection.cards[id] || 0) >= maxCopies(card)) return false;
  collection.dust -= cost; collection.cards[id] = (collection.cards[id] || 0) + 1;
  return true;
}

// 基本卡（治療卡）人人都有；醫師卡與場地卡要抽。不足 30 張時以基本卡補齊。
export function buildDeck(collection, size = 30) {
  const deck = [];
  for (const card of COLLECTIBLE) {
    if (card.rarity === 'free') continue;
    const n = Math.min(collection.cards[card.id] || 0, maxCopies(card));
    for (let i = 0; i < n && deck.length < size; i++) deck.push(card.id);
  }
  const basics = COLLECTIBLE.filter(c => c.rarity === 'free').map(c => c.id);
  for (let i = 0; deck.length < size; i++) deck.push(basics[i % basics.length]);
  return deck;
}
