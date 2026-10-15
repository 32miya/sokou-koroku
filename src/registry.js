/* ===== コンテンツ登録口 =====
   すべてのコンテンツファイルはこの ROOTS に登録するだけ。エンジンは中身を知らない。
   追加の手順は CONTENT_GUIDE.md を参照 */
const TAGS={
  海:{c:'var(--sea)'},星:{c:'var(--star)'},地:{c:'var(--earth)'},火:{c:'var(--fire)'},書:{c:'var(--book)'}
};
const NOW=2026;

const ROOTS={
  eras:{}, whispers:[], names:{}, bands:[], patches:[], changelog:[],
  /* 更新情報（新しい順） */
  addChangelog(list){this.changelog.push(...list)},
  /* 生業アイコン: { 生業名: 画像のdata URI } */
  jobIcons:{},
  addJobIcons(obj){Object.assign(this.jobIcons,obj)},
  /* 時代を登録: { id: {band, year, era, lead, q, questions?, quiz?/quizzes?, note, choices} } */
  addEras(obj){
    for(const id in obj){
      if(this.eras[id])throw new Error('時代IDが重複: '+id);
      this.eras[id]=Object.assign({id},obj[id]);
    }
  },
  /* 既存の時代に設問の言い換え・照合問題・帯・女性フラグを足す */
  patch(id,p){this.patches.push([id,p])},
  addWhispers(list){this.whispers.push(...list)},
  /* 名前の候補: { 帯: { m:[...], f:[...] } } */
  addNames(obj){
    for(const band in obj){
      const t=this.names[band]||(this.names[band]={m:[],f:[]});
      for(const g of ['m','f'])if(obj[band][g])t[g].push(...obj[band][g]);
    }
  },
  /* 時代の帯（現代→過去の順）。fixed のある帯は必ずその時代 */
  setBands(list){this.bands=list},

  /* 全コンテンツ登録後に一度だけ呼ぶ */
  finalize(){
    for(const [id,p] of this.patches){
      const e=this.eras[id];if(!e)throw new Error('patch先の時代がない: '+id);
      if(p.band)e.band=p.band;
      if(p.questions)(e._extraQ=e._extraQ||[]).push(...p.questions);
      if(p.quizzes)(e._extraZ=e._extraZ||[]).push(...p.quizzes);
      if(p.female)p.female.forEach(k=>{e.choices[k].g='f'});
    }
    for(const e of Object.values(this.eras)){
      const base=e.lead?[{lead:e.lead,q:e.q}]:[];
      e.questions=[...base,...(e.questions||[]),...(e._extraQ||[])].map(v=>({lead:v.lead||base[0]?.lead||e.questions?.[0]?.lead||'',q:v.q}));
      e.quizzes=[...(e.quiz?[e.quiz]:[]),...(e.quizzes||[]),...(e._extraZ||[])];
      delete e._extraQ;delete e._extraZ;
    }
    return this;
  }
};
