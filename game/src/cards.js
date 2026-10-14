import {ROSTER} from '../data/roster.js';

export const RARITY_BY_RANK = {'教授': 'legendary', '副教授': 'epic', '助理教授': 'rare'};
export const rarityOf = rank => RARITY_BY_RANK[rank] || 'common';
export const RARITY_LABEL = {free: '基本', common: '普通', rare: '稀有', epic: '史詩', legendary: '傳說'};

// 效果以相對施放者的方向描述：enemy = 對手、friendly = 自己。
// 職類模板依稀有度分級；稀有度越高、費用越高、效果越強，以費用維持平衡。
const ROLE = {
  surgeon: {
    title: '手術', color: ['#e0a0c0', '#5a1a3c'], icon: 'scalpel',
    common: {cost: 3, atk: 3, hp: 2, battlecry: [{type: 'damage', target: 'chosen_enemy', amount: 2}]},
    rare: {cost: 4, atk: 3, hp: 3, battlecry: [{type: 'damage', target: 'chosen_enemy', amount: 3}]},
    epic: {cost: 5, atk: 4, hp: 4, battlecry: [{type: 'damage', target: 'chosen_enemy', amount: 4, pierce: true}]},
    legendary: {cost: 6, atk: 5, hp: 5, battlecry: [{type: 'damage', target: 'chosen_enemy', amount: 6, pierce: true}]}
  },
  oncologist: {
    title: '藥物治療', color: ['#9a5cf0', '#2b1257'], icon: 'pill',
    common: {cost: 3, atk: 2, hp: 3, battlecry: [{type: 'removeShield'}, {type: 'damage', target: 'enemy_hero', amount: 2}]},
    rare: {cost: 4, atk: 3, hp: 4, battlecry: [{type: 'removeShield'}, {type: 'damage', target: 'enemy_hero', amount: 3}]},
    epic: {cost: 5, atk: 3, hp: 5, battlecry: [{type: 'removeShield'}, {type: 'damage', target: 'enemy_hero', amount: 4}, {type: 'draw', amount: 1}]},
    legendary: {cost: 7, atk: 5, hp: 6, battlecry: [{type: 'removeShield'}, {type: 'damage', target: 'all_enemies', amount: 3}]}
  },
  radiation: {
    title: '放射治療', color: ['#f2703a', '#6a1c0a'], icon: 'radiation',
    common: {cost: 3, atk: 2, hp: 3, keywords: ['taunt'], battlecry: [{type: 'damage', target: 'all_enemy_minions', amount: 1}]},
    rare: {cost: 4, atk: 3, hp: 4, keywords: ['taunt'], battlecry: [{type: 'damage', target: 'all_enemy_minions', amount: 1}]},
    epic: {cost: 5, atk: 3, hp: 5, battlecry: [{type: 'damage', target: 'all_enemy_minions', amount: 2}]},
    legendary: {cost: 7, atk: 4, hp: 6, battlecry: [{type: 'damage', target: 'all_enemy_minions', amount: 3}]}
  },
  pathology: {
    title: '病理診斷', color: ['#2fc7d9', '#0a4150'], icon: 'microscope',
    common: {cost: 2, atk: 1, hp: 3, battlecry: [{type: 'reveal'}, {type: 'draw', amount: 1}]},
    rare: {cost: 3, atk: 2, hp: 3, battlecry: [{type: 'reveal'}, {type: 'draw', amount: 1}]},
    epic: {cost: 4, atk: 2, hp: 4, battlecry: [{type: 'reveal'}, {type: 'draw', amount: 2}]},
    legendary: {cost: 5, atk: 3, hp: 5, battlecry: [{type: 'reveal'}, {type: 'draw', amount: 2}, {type: 'gainMana', amount: 1}]}
  },
  imaging: {
    title: '影像檢查', color: ['#4fa3e0', '#0b2a50'], icon: 'scan',
    common: {cost: 2, atk: 2, hp: 2, battlecry: [{type: 'quiz'}]},
    rare: {cost: 3, atk: 2, hp: 4, battlecry: [{type: 'quiz'}, {type: 'reveal'}]},
    epic: {cost: 4, atk: 3, hp: 4, battlecry: [{type: 'quiz'}, {type: 'reveal'}, {type: 'draw', amount: 1}]},
    legendary: {cost: 5, atk: 4, hp: 5, battlecry: [{type: 'quiz'}, {type: 'reveal'}, {type: 'draw', amount: 2}]}
  },
  plastic: {
    title: '乳房重建', color: ['#f2b53a', '#7a4b08'], icon: 'heart',
    common: {cost: 3, atk: 2, hp: 4, battlecry: [{type: 'heal', target: 'friendly_hero', amount: 4}]},
    rare: {cost: 4, atk: 3, hp: 4, battlecry: [{type: 'heal', target: 'friendly_hero', amount: 5}]},
    epic: {cost: 5, atk: 3, hp: 5, battlecry: [{type: 'heal', target: 'friendly_hero', amount: 5}, {type: 'armor', amount: 3}]},
    legendary: {cost: 6, atk: 4, hp: 6, battlecry: [{type: 'heal', target: 'friendly_hero', amount: 8}, {type: 'armor', amount: 4}]}
  },
  genetics: {
    title: '遺傳諮詢', color: ['#4fc27a', '#0b4a28'], icon: 'dna',
    common: {cost: 2, atk: 2, hp: 2, battlecry: [{type: 'discover'}]},
    rare: {cost: 3, atk: 2, hp: 3, battlecry: [{type: 'discover'}]},
    epic: {cost: 4, atk: 3, hp: 4, battlecry: [{type: 'discover'}, {type: 'draw', amount: 1}]},
    legendary: {cost: 5, atk: 4, hp: 5, battlecry: [{type: 'discover'}, {type: 'discover'}]}
  },
  navigator: {
    title: '個案管理', color: ['#f0c0d0', '#6a2a48'], icon: 'hands',
    common: {cost: 2, atk: 1, hp: 4, keywords: ['taunt'], endOfTurn: [{type: 'heal', target: 'friendly_hero', amount: 2}]},
    rare: {cost: 3, atk: 2, hp: 5, keywords: ['taunt'], endOfTurn: [{type: 'heal', target: 'friendly_hero', amount: 2}]},
    epic: {cost: 4, atk: 2, hp: 6, keywords: ['taunt'], endOfTurn: [{type: 'heal', target: 'friendly_hero', amount: 3}]},
    legendary: {cost: 5, atk: 3, hp: 7, keywords: ['taunt'], endOfTurn: [{type: 'heal', target: 'friendly_hero', amount: 4}]}
  }
};

function doctorCard(person) {
  const rarity = rarityOf(person.rank), role = ROLE[person.role], tier = role[rarity];
  return {
    id: person.id, type: 'minion', kind: 'doctor', rarity, cost: tier.cost, atk: tier.atk, hp: tier.hp,
    keywords: tier.keywords || [], battlecry: tier.battlecry || [], endOfTurn: tier.endOfTurn || [], deathrattle: [],
    name: person.name === '待填' ? `${person.dept}・${person.rank}` : `${person.name}醫師`,
    dept: person.dept, rank: person.rank, specialty: person.specialty, photo: person.photo,
    skill: role.title, color: role.color, icon: role.icon
  };
}

const TREATMENTS = [
  {id: 't-mammo', type: 'spell', name: '乳房攝影', cost: 1, effects: [{type: 'quiz'}, {type: 'draw', amount: 1}], icon: 'scan', color: ['#4fa3e0', '#0b2a50']},
  {id: 't-sentinel', type: 'spell', name: '前哨淋巴結切片', cost: 2, effects: [{type: 'damage', target: 'chosen_enemy', amount: 3}], icon: 'scalpel', color: ['#e0a0c0', '#5a1a3c']},
  {id: 't-hormone', type: 'spell', name: '荷爾蒙治療', cost: 2, effects: [{type: 'stopRegen'}, {type: 'damage', target: 'enemy_hero', amount: 2}], icon: 'pill', color: ['#9a5cf0', '#2b1257']},
  {id: 't-target', type: 'spell', name: '標靶治療', cost: 3, effects: [{type: 'removeShield'}, {type: 'damage', target: 'enemy_hero', amount: 3, her2Bonus: 2}], icon: 'pill', color: ['#9a5cf0', '#2b1257']},
  {id: 't-chemo', type: 'spell', name: '化學治療', cost: 5, effects: [{type: 'damage', target: 'all_enemies', amount: 2}], icon: 'pill', color: ['#9a5cf0', '#2b1257']},
  {id: 't-nutrition', type: 'spell', name: '營養諮詢', cost: 1, effects: [{type: 'heal', target: 'friendly_hero', amount: 4}], icon: 'heart', color: ['#f2b53a', '#7a4b08']}
].map(c => ({rarity: 'free', ...c}));

// 場地卡：醫院空間。每回合可啟動一次，耐久用完即移除。
const LOCATIONS = [
  {id: 'l-westwing', name: '西址舊館・百年長廊', cost: 3, durability: 3, activate: [{type: 'heal', target: 'friendly_hero', amount: 3}], art: 'westwing', rarity: 'rare'},
  {id: 'l-mdt', name: '多專科討論室', cost: 3, durability: 3, activate: [{type: 'buff', target: 'all_friend_minions', atk: 1, hp: 1}], art: 'mdt', rarity: 'epic'},
  {id: 'l-or', name: '手術室', cost: 4, durability: 2, activate: [{type: 'damage', target: 'chosen_enemy', amount: 4}], art: 'or', rarity: 'rare'},
  {id: 'l-lab', name: '病理實驗室', cost: 2, durability: 3, activate: [{type: 'reveal'}, {type: 'draw', amount: 1}], art: 'lab', rarity: 'common'},
  {id: 'l-linac', name: '放射治療室', cost: 4, durability: 2, activate: [{type: 'damage', target: 'all_enemy_minions', amount: 2}], art: 'linac', rarity: 'epic'}
].map(c => ({type: 'location', ...c}));

// 乳癌方的牌：只出現在敵方牌組，不能收集。
const CANCER = [
  {id: 'c-cell', type: 'minion', name: '癌細胞', cost: 1, atk: 1, hp: 1},
  {id: 'c-hyper', type: 'minion', name: '異常增生', cost: 2, atk: 2, hp: 3},
  {id: 'c-tumor', type: 'minion', name: '腫瘤', cost: 3, atk: 2, hp: 5, keywords: ['taunt']},
  {id: 'c-invasive', type: 'minion', name: '侵犯性腫瘤', cost: 4, atk: 4, hp: 3, keywords: ['charge']},
  {id: 'c-node', type: 'minion', name: '淋巴結轉移', cost: 4, atk: 3, hp: 3, battlecry: [{type: 'damage', target: 'enemy_hero', amount: 2}]},
  {id: 'c-bone', type: 'minion', name: '骨轉移', cost: 6, atk: 6, hp: 5},
  {id: 'c-spread', type: 'spell', name: '擴散', cost: 3, effects: [{type: 'damage', target: 'enemy_hero', amount: 4}]},
  {id: 'c-resist', type: 'spell', name: '抗藥性', cost: 2, effects: [{type: 'buff', target: 'all_friend_minions', atk: 1, hp: 1}]}
].map(c => ({rarity: 'free', cancer: true, keywords: [], battlecry: [], endOfTurn: [], deathrattle: [], ...c}));

export const CARDS = Object.fromEntries([...ROSTER.map(doctorCard), ...TREATMENTS, ...LOCATIONS, ...CANCER].map(c => [c.id, c]));
export const COLLECTIBLE = Object.values(CARDS).filter(c => !c.cancer);
export const DOCTORS = COLLECTIBLE.filter(c => c.kind === 'doctor');

const TARGET_TEXT = {chosen_enemy: '一個敵人', enemy_hero: '乳癌', all_enemies: '所有敵人', all_enemy_minions: '所有敵方隨從', friendly_hero: '病人'};
function effectText(e) {
  switch (e.type) {
    case 'damage': return `對${TARGET_TEXT[e.target]}造成 ${e.amount} 點傷害${e.pierce ? '（無視護盾）' : ''}${e.her2Bonus ? `；HER2 陽性時 +${e.her2Bonus}` : ''}`;
    case 'heal': return `為${TARGET_TEXT[e.target]}恢復 ${e.amount} 點生命`;
    case 'armor': return `病人獲得 ${e.amount} 點護甲`;
    case 'draw': return `抽 ${e.amount} 張牌`;
    case 'buff': return `所有友方隨從 +${e.atk}/+${e.hp}`;
    case 'removeShield': return '移除敵方護盾';
    case 'reveal': return '揭露敵方加成';
    case 'stopRegen': return '敵方不再回復生命';
    case 'gainMana': return `本回合 +${e.amount} 法力`;
    case 'quiz': return '觸發<b>衛教時刻</b>';
    case 'discover': return '<b>發現</b>一張治療卡';
    default: return '';
  }
}
export function cardText(card) {
  const parts = [];
  if (card.keywords?.includes('taunt')) parts.push('<b>嘲諷</b>');
  if (card.keywords?.includes('charge')) parts.push('<b>衝鋒</b>');
  if (card.battlecry?.length) parts.push('<b>戰吼：</b>' + card.battlecry.map(effectText).join('，'));
  if (card.endOfTurn?.length) parts.push('<b>回合結束：</b>' + card.endOfTurn.map(effectText).join('，'));
  if (card.effects?.length) parts.push(card.effects.map(effectText).join('，'));
  if (card.activate?.length) parts.push(`<b>啟動：</b>${card.activate.map(effectText).join('，')}（耐久 ${card.durability}）`);
  return parts.join('。') + (parts.length ? '。' : '');
}

export function needsTarget(effects = []) {
  return effects.some(e => e.target === 'chosen_enemy');
}
