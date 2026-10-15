// コンテンツ検査：node tools/validate.js
// 必須項目の欠け・血の気配の誤記・帯の年代の重なり・照合問題の形式・未置換の {xxx} を検出する
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const files=['src/registry.js',...fs.readFileSync(path.join(root,'content/manifest.txt'),'utf8')
  .split('\n').map(s=>s.trim()).filter(s=>s&&!s.startsWith('#')).map(f=>'content/'+f)];
const ctx={console};vm.createContext(ctx);
for(const f of files){
  try{vm.runInContext(fs.readFileSync(path.join(root,f),'utf8').replace(/^const (\w+)=/gm,'var $1='),ctx,{filename:f})}
  catch(e){console.error('✗ 読み込み失敗:',f,'\n ',e.message);process.exit(1)}
}
const R=vm.runInContext('ROOTS.finalize()',ctx);
const errs=[],warn=[];
const TAGSET=['海','星','地','火','書'];
const need=['t','label','who','job','place','story','lv','short','life'];
const eras=Object.values(R.eras);
for(const e of eras){
  const id=e.id;
  if(!e.band)errs.push(`${id}: band がない`);
  if(typeof e.year!=='number')errs.push(`${id}: year が数値でない`);
  if(!e.era)errs.push(`${id}: era がない`);
  if(!e.questions.length)errs.push(`${id}: 問いがない`);
  e.questions.forEach((q,k)=>{if(!q.q||!q.lead)errs.push(`${id}: 問い${k} の lead/q が空`)});
  if(e.choices.length<3)errs.push(`${id}: 選択肢が3未満`);
  const tags=new Set();
  e.choices.forEach((c,k)=>{
    for(const f of need)if(!c[f])errs.push(`${id}#${k}: ${f} がない`);
    if(!TAGSET.includes(c.t))errs.push(`${id}#${k}: t='${c.t}' は不正`);
    tags.add(c.t);
    const isLast=R.bands[R.bands.length-1].fixed===id;
    if(!isLast&&!c.clue)errs.push(`${id}#${k}: clue がない`);
    for(const f of ['story','life','clue','short','label']){
      const m=(c[f]||'').match(/\{(\w+)\}/g);if(m&&m.some(x=>x!=='{who}'))errs.push(`${id}#${k}: ${f} に未知の置換 ${m}`);
    }
  });
  if(tags.size<e.choices.length)warn.push(`${id}: 同じ血の気配の選択肢が重複`);
  e.quizzes.forEach((z,k)=>{
    if(!z.q||!z.exp||!Array.isArray(z.opts)||z.opts.length<2)errs.push(`${id}: 照合${k} の形式が不正`);
    else if(new Set(z.opts).size!==z.opts.length)errs.push(`${id}: 照合${k} に同じ選択肢`);
  });
}
// 帯の年代が前後の帯と重ならないか
let prevMin=Infinity;
for(const b of R.bands){
  const list=b.fixed?[R.eras[b.fixed]]:eras.filter(e=>e.band===b.id);
  if(!list.length||list.some(x=>!x)){errs.push(`帯 ${b.id}: 時代がない`);continue}
  const max=Math.max(...list.map(e=>e.year)),min=Math.min(...list.map(e=>e.year));
  if(max>=prevMin)errs.push(`帯 ${b.id}: 前の帯と年代が重なる（${max} ≥ ${prevMin}）`);
  prevMin=min;
}
eras.filter(e=>!R.bands.some(b=>b.id===e.band)).forEach(e=>errs.push(`${e.id}: 帯 '${e.band}' が未定義`));
R.whispers.forEach((w,k)=>{if(!w.q||!w.opts?.length)errs.push(`囁き${k}: 形式が不正`);w.opts?.forEach(o=>{if(!TAGSET.includes(o[1]))errs.push(`囁き${k}: 気配 '${o[1]}' は不正`)})});

{const jobs=new Set(eras.flatMap(e=>e.choices.map(c=>c.job)));const ic=Object.keys(R.jobIcons||{});
 ic.filter(j=>!jobs.has(j)).forEach(j=>warn.push(`アイコンの生業がどの祖先にもない: ${j}`));
 console.log(`生業アイコン ${ic.filter(j=>jobs.has(j)).length}/${jobs.size}`);}
R.changelog.forEach((c,k)=>{if(!c.version||!c.date||!c.title||!c.items?.length)errs.push(`更新情報${k}: version/date/title/items が欠けている`)});
if(!R.changelog.length)warn.push('更新情報が空');
const s={eras:eras.length,choices:eras.reduce((n,e)=>n+e.choices.length,0),
  questions:eras.reduce((n,e)=>n+e.questions.length,0),quizzes:eras.reduce((n,e)=>n+e.quizzes.length,0),whispers:R.whispers.length,
  routes:R.bands.reduce((n,b)=>n*(b.fixed?1:eras.filter(e=>e.band===b.id).length),1)};
console.log(`時代 ${s.eras} / 祖先 ${s.choices} / 問いの型 ${s.questions} / 照合 ${s.quizzes} / 囁き ${s.whispers} / 経路 ${s.routes.toLocaleString()}通り`);
console.log('帯ごとの時代数:',R.bands.map(b=>`${b.id}${b.fixed?1:eras.filter(e=>e.band===b.id).length}`).join(' '));
warn.forEach(w=>console.log('△',w));
if(errs.length){errs.forEach(e=>console.error('✗',e));process.exit(1)}
console.log('✓ 検査OK');
