// 乳房醫學中心醫療團隊名單。
// 目前為佔位資料：取得台大醫院掛號網站的正式名單後，替換 name / rank / specialty / photo 即可。
// rank 決定稀有度：教授=legendary、副教授=epic、助理教授=rare、其他=common。
export const ROSTER = [
  {id: 'surg-1', name: '待填', dept: '乳房外科', rank: '教授', specialty: ['乳癌手術', '前哨淋巴結'], role: 'surgeon', photo: null},
  {id: 'surg-2', name: '待填', dept: '乳房外科', rank: '副教授', specialty: ['乳房保留手術'], role: 'surgeon', photo: null},
  {id: 'surg-3', name: '待填', dept: '乳房外科', rank: '主治醫師', specialty: ['乳房超音波導引切片'], role: 'surgeon', photo: null},
  {id: 'onc-1', name: '待填', dept: '腫瘤醫學部', rank: '教授', specialty: ['乳癌藥物治療', '臨床試驗'], role: 'oncologist', photo: null},
  {id: 'onc-2', name: '待填', dept: '腫瘤醫學部', rank: '助理教授', specialty: ['標靶治療'], role: 'oncologist', photo: null},
  {id: 'rad-1', name: '待填', dept: '放射腫瘤部', rank: '副教授', specialty: ['乳癌放射治療'], role: 'radiation', photo: null},
  {id: 'path-1', name: '待填', dept: '病理部', rank: '助理教授', specialty: ['乳房病理'], role: 'pathology', photo: null},
  {id: 'img-1', name: '待填', dept: '影像醫學部', rank: '主治醫師', specialty: ['乳房攝影', '乳房超音波'], role: 'imaging', photo: null},
  {id: 'plas-1', name: '待填', dept: '整形外科', rank: '主治醫師', specialty: ['乳房重建'], role: 'plastic', photo: null},
  {id: 'gen-1', name: '待填', dept: '基因醫學部', rank: '助理教授', specialty: ['遺傳諮詢'], role: 'genetics', photo: null},
  {id: 'nurse-1', name: '待填', dept: '護理部', rank: '個案管理師', specialty: ['乳癌個案管理'], role: 'navigator', photo: null}
];
