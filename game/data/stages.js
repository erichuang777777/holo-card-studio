// 乳癌期別即關卡；亞型即加成（敵方特殊能力）。
export const STAGES = {
  '0': {name: '第 0 期', sub: '原位癌 · 新手關', noSubtype: true, phases: [15], heroPower: {name: '增生', cost: 2, effects: [{type: 'summon', card: 'c-cell'}]},
    deck: {'c-cell': 10, 'c-hyper': 8, 'c-tumor': 4}},
  'I': {name: '第 I 期', sub: '早期', phases: [25], heroPower: {name: '增生', cost: 2, effects: [{type: 'summon', card: 'c-cell'}]},
    deck: {'c-cell': 8, 'c-hyper': 8, 'c-tumor': 6, 'c-spread': 4, 'c-resist': 4}},
  'II': {name: '第 II 期', sub: '腫瘤變大 · 淋巴結侵犯', phases: [35], heroPower: {name: '增生', cost: 2, effects: [{type: 'summon', card: 'c-hyper'}]},
    deck: {'c-cell': 6, 'c-hyper': 6, 'c-tumor': 6, 'c-node': 4, 'c-invasive': 4, 'c-spread': 2, 'c-resist': 2}},
  'III': {name: '第 III 期', sub: '局部晚期', phases: [45], heroPower: {name: '浸潤', cost: 2, effects: [{type: 'damage', target: 'enemy_hero', amount: 2}]},
    deck: {'c-hyper': 6, 'c-tumor': 6, 'c-node': 6, 'c-invasive': 6, 'c-spread': 4, 'c-resist': 2}},
  'IV': {name: '第 IV 期', sub: '轉移 · 多階段', phases: [30, 25], heroPower: {name: '轉移', cost: 2, effects: [{type: 'summon', card: 'c-node'}]},
    deck: {'c-tumor': 6, 'c-node': 6, 'c-invasive': 6, 'c-bone': 4, 'c-spread': 4, 'c-resist': 4}}
};

export const SUBTYPES = {
  'HR+': {name: '荷爾蒙受體陽性', text: '每回合結束回復 2 點生命', regen: 2},
  'HER2+': {name: 'HER2 陽性', text: '護盾 6，每回合重生 2 點', shield: 6, shieldRegen: 2},
  'TNBC': {name: '三陰性', text: '敵方隨從 +1 攻擊；全體傷害的治療 +1', minionAtk: 1, aoeBonus: 1}
};

export const NO_SUBTYPE = {name: '原位癌', text: '不分亞型'};
