/* ===== エンジン =====
   コンテンツ（時代・囁き・名前・結末）はすべて ROOTS に登録済みのものを使う */
ROOTS.finalize();
const ERAS=ROOTS.eras, WHISPERS=ROOTS.whispers;
const $=s=>document.querySelector(s);
const stage=$('#stage');
const QUIZ_PER_RUN=4, WHISPER_PER_RUN=4;
const NO_POOL=new Set(['あなた','名は伝わらない']);
let st;

function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a}
const rnd=a=>a[Math.random()*a.length|0];

/* 帯ごとの候補 */
const BAND_ERAS=ROOTS.bands.map(b=>b.fixed?[ERAS[b.fixed]]:Object.values(ERAS).filter(e=>e.band===b.id).sort((a,b)=>b.year-a.year));

/* 規模の集計（タイトル画面に表示） */
function contentStats(){
  const eras=Object.values(ERAS);
  let ancestors=0,persons=0;
  for(const e of eras)for(const c of e.choices){
    ancestors++;
    const pool=(ROOTS.names[e.band]||{})[c.g||'m']||[];
    persons+=(c.who.length>=2&&!NO_POOL.has(c.who))?1+pool.filter(n=>n!==c.who).length:1;
  }
  return {eras:eras.length,ancestors,persons,
    questions:eras.reduce((n,e)=>n+e.questions.length,0),
    quizzes:eras.reduce((n,e)=>n+e.quizzes.length,0),
    whispers:WHISPERS.length,
    routes:BAND_ERAS.reduce((n,l)=>n*l.length,1)};
}

/* 祖先の名前を抽選し、本文の名前を差し替える */
function resolveChoice(c,band){
  let name=c.who;
  const pool=(ROOTS.names[band]||{})[c.g||'m']||[];
  if(c.who.length>=2&&!NO_POOL.has(c.who)&&pool.length)name=rnd([c.who,...pool.filter(n=>n!==c.who)]);
  const f=t=>t?t.split('{who}').join(name).split(c.who).join(name):t;
  return {...c,who:name,story:f(c.story),life:f(c.life),clue:f(c.clue),short:f(c.short)};
}

function reset(){
  const route=BAND_ERAS.map(l=>rnd(l));
  const last=route.length-1;
  const mids=[...Array(last-1)].map((_,k)=>k+1).filter(i=>route[i].quizzes.length);
  const quizAt=new Set(shuffle(mids).slice(0,QUIZ_PER_RUN));
  const ws=shuffle(WHISPERS);
  const whisperAt=new Map(shuffle([...Array(last)].map((_,k)=>k)).slice(0,WHISPER_PER_RUN).map((i,k)=>[i,ws[k]]));
  st={route,i:0,tags:{海:0,星:0,地:0,火:0,書:0},lineage:[],year:NOW,
      qv:route.map(e=>Math.random()*e.questions.length|0),
      qz:route.map(e=>Math.random()*Math.max(1,e.quizzes.length)|0),
      snap:{},resume:null,phase:'intro',busy:false,
      quizAt,qorder:{},qpick:{},whisperAt,wpick:{},answers:[]};
}
function fmtYear(y){return y<0?{pre:'紀元前',num:(-y).toLocaleString('ja-JP')}:{pre:'西暦',num:String(y)}}
function genLabel(y){return y>=NOW?'あなた':`約${Math.round((NOW-y)/25).toLocaleString('ja-JP')}代前`}

function renderMeters(){
  const max=Math.max(1,...Object.values(st.tags));
  $('#meters').innerHTML=Object.keys(TAGS).map(k=>`<div class="meter" style="--c:${TAGS[k].c};--w:${st.tags[k]/max*100}%"><b>${k}</b><i></i></div>`).join('');
}
function renderFrag(){
  const res=[...st.quizAt].sort((a,b)=>a-b).map(i=>st.qpick[i]===undefined?'pending':st.qpick[i]===0?'ok':'ng');
  res.sort((a,b)=>({ok:0,ng:1,pending:2}[a]-{ok:0,ng:1,pending:2}[b]));
  const got=res.filter(r=>r==='ok').length;
  $('#sFrag').innerHTML=`<span class="frags">${res.map(r=>`<i class="f-${r}">${r==='ok'?'◆':r==='ng'?'×':'◇'}</i>`).join('')}</span> ${got}/${QUIZ_PER_RUN}`;
}
/* temp=true のときは年表から過去を閲覧中の一時表示。戻るときは snap から復元する */
function setStatus(o,temp){
  if(!temp)Object.assign(st.snap,o);
  const {era,gen,lv,life}=o;
  if(life!==undefined){
    const el=$('#sLife');el.classList.toggle('unk',!life);
    el.innerHTML=life?`<span class="lv">${lv}</span>${life}`:'？？？';
  }
  if(era!==undefined)$('#sEra').textContent=era;
  if(gen!==undefined)$('#sGen').textContent=gen;
}

/* 年表：上が現代、下へ行くほど過去 */
function renderChrono(endKey){
  const R=st.route;
  const items=R.map((s,i)=>{
    const l=st.lineage[i];
    if(l){const f=fmtYear(s.year);const frag=st.qpick[i]===0?'<i class="cfrag" title="真実の欠片">◆</i>':'';
      return `<li class="done" data-i="${i}" role="button" tabindex="0" aria-label="${f.pre}${f.num}年の記録を見る" style="--c:${TAGS[l.t].c}"><span class="cnode">${FX.crest(seedOf(l),'var(--c)',13)}</span><span class="cy"><small>${f.pre}</small>${f.num}年${frag}</span><span class="cp">${l.place}</span><span class="cj">${l.job}</span></li>`;}
    if(i===st.i&&!endKey){const f=fmtYear(st.year);
      return `<li class="now"><span class="cy"><small id="tPre">${f.pre}</small><b id="tYear">${f.num}</b></span><span class="cp">場所 ？？？</span><span class="cj">生業 ？？？</span></li>`;}
    return `<li class="todo"><span class="cy">？？？？</span></li>`;
  });
  if(endKey){const E=ENDINGS[endKey];
    items.push(`<li class="now origin" data-i="end" role="button" tabindex="0" aria-label="起源の記録を見る" style="--c:${TAGS[endKey].c}"><span class="cy"><small id="tPre">${E.pre||'起源'}</small><b id="tYear">${E.num}</b></span><span class="cp">${E.place}</span><span class="cj">${E.job}</span></li>`);
  }else items.push(`<li class="todo origin"><span class="cy">起源 ■■■</span></li>`);
  const box=$('#chrono');
  const hint=st.lineage.length>1?'<span class="ch-hint">時代をタップで記録を見返す</span>':'';
  const marks=Math.min(st.lineage.length,R.length);
  box.innerHTML=`<p class="ch-head">年表<small>現代 ↓ 過去</small><span class="ch-uzu"><span class="uzu" aria-hidden="true"></span>渦の印 ${marks}/${R.length}</span>${hint}</p><ol>${items.join('')}</ol>`;
  const a=box.querySelector('.now')||[...box.querySelectorAll('.done')].pop();
  if(a)box.scrollTo({top:Math.max(0,a.offsetTop-box.clientHeight*.35),behavior:'smooth'});
}

/* 記録カードの中身 */
function chainLabel(i){
  if(i===0)return '記録の起点';
  if(i===1)return st.route[1].year>=1940?'あなたの祖父':'あなたの曾祖父';
  const p=st.lineage[i-1];
  return p.who==='名は伝わらない'?`${p.job}の、さらに前の代`:`${p.who}（${p.job}）の祖先`;
}
function clueText(i){
  const c=st.lineage[i],next=st.route[i+1];
  if(!c||!c.clue||!next)return '';
  const tail=i+1===st.route.length-1
    ?'印のそばに年号はない。あるのは、空から火が降る絵だけだった。'
    :`印の傍らには、さらに古い年号が記されていた。──「${next.era}」`;
  return c.clue+tail;
}
function clueBox(text,label,seed){
  const mark=seed!==undefined?FX.crest(seed,'var(--gold)',26):'<span class="uzu" aria-hidden="true"></span>';
  return `<div class="clue">${mark}<p><b>${label}</b>${text}</p></div>`;
}
function recordBody(i){
  const s=st.route[i],c=st.lineage[i],ct=clueText(i);
  return `<p class="eyebrow">記録 ${String(i+1).padStart(2,'0')}・${genLabel(s.year)}</p>
    <div class="who"><div class="portrait">${FX.portrait(c,c.band)}<div class="seal" style="--c:${TAGS[c.t].c}">${c.t}</div></div><div><h2>${c.job}</h2><p>${c.who}　／　${c.place}</p><p class="chain">↑ ${chainLabel(i)}</p></div></div>
    <p class="life"><b>暮らしぶり</b><span class="lv">${c.lv}</span>${c.life}</p>
    <p class="story">${c.story}</p>
    <p class="note"><b>史料の断片</b>${s.note}</p>
    ${ct?clueBox(ct,'渦の印・さらに古い時代へ',seedOf(c)):''}`;
}

/* 年表から過去の時代を開く */
function markSel(i){
  document.querySelectorAll('#chrono li[data-i]').forEach(li=>li.classList.toggle('sel',li.dataset.i===String(i)));
}
function viewPast(i){
  const s=st.route[i],c=st.lineage[i],f=fmtYear(s.year);
  setStatus({era:s.era,gen:genLabel(s.year),lv:c.lv,life:c.short},true);
  if(!st.viewing){st.viewing=true;st.skinBefore=FX.current}
  FX.skin(s.band);FX.whisperMode(false);Sound.sfx('tap');
  stage.innerHTML=`<section class="card past">
    <p class="past-tag">年表より閲覧中：${f.pre} ${f.num}年</p>
    ${recordBody(i)}
    <button class="btn ghost" id="back">いまの記録へ戻る</button>
  </section>`;
  $('#back').onclick=resume;
  markSel(i);
  window.scrollTo({top:0,behavior:'smooth'});
}
function resume(){
  setStatus(st.snap,true);
  if(st.viewing){st.viewing=false;FX.skin(st.skinBefore)}
  markSel(null);
  st.resume&&st.resume();
}
function onChrono(li){
  if(!li||st.busy)return;
  const v=li.dataset.i;
  if(v==='end'||(st.phase==='reveal'&&+v===st.i))return resume();
  viewPast(+v);
}
$('#chrono').addEventListener('click',e=>onChrono(e.target.closest('li[data-i]')));
$('#chrono').addEventListener('keydown',e=>{
  if(e.key==='Enter'||e.key===' '){const li=e.target.closest('li[data-i]');if(li){e.preventDefault();onChrono(li)}}
});

function animateYear(to,done){
  const num=$('#tYear'),pre=$('#tPre');
  const from=st.year,gap=Math.abs(to-from),t0=performance.now();
  const dur=REDUCED?0:Math.round(Math.min(2800,900+Math.log10(gap+1)*480));
  FX.warpStart(st.route[st.i].era,dur);Sound.sfx('warp',dur);
  function step(t){
    const p=dur?Math.min(1,(t-t0)/dur):1,e=1-Math.pow(1-p,3);
    const y=Math.round(from+(to-from)*e),f=fmtYear(y);
    num.textContent=f.num;pre.textContent=f.pre;FX.warpYear(f);
    if(p<1)requestAnimationFrame(step);else{st.year=to;FX.warpEnd();done&&done()}
  }
  requestAnimationFrame(step);
}

/* ===== 進行 ===== */
function intro(){
  reset();FX.whisperMode(false);FX.skin('現代');Sound.ambient('現代');
  renderMeters();renderChrono();renderFrag();
  setStatus({era:'令和8年・現代',life:'',gen:'あなた'});
  stage.innerHTML=`<section class="card">
    <p class="eyebrow">ANCESTRAL REGRESSION</p>
    <h1>祖先遡行録</h1>
    ${clueBox('実家の押し入れの奥から、古い木箱が出てきた。蓋には見覚えのない渦の印。開けた瞬間、あなたの血に眠っていた記録が動き出す。','発端')}
    <p class="lead">問いに答えるたび、あなたの血は一世代ずつ過去へさかのぼる。どの時代の祖先も、なぜか同じ渦の印を残している。印をたどって、記録が途切れる場所まで。</p>
    <details class="intro-details">
      <summary>初めての方へ</summary>
      <ul class="howto">
        <li><b>祖先の問い</b>その時代の口調で問われます。答えが祖先の生業と居場所を決めます。</li>
        <li><b>記録の照合</b>ときおり史実の真偽を問われます。正解すると「真実の欠片」が手に入り、四つ揃えると隠された頁が開きます。</li>
        <li><b>血の囁き</b>時代の合間に、正体の知れない声があなた自身に問いかけてきます。</li>
        <li><b>毎回ちがう系譜</b>たどる時代も、問いの言い回しも、祖先の名前も、遊ぶたびに入れ替わります。</li>
      </ul>
      ${(()=>{const s=contentStats();return `<dl class="stats">
        <div><dt>時代</dt><dd>${s.eras}</dd></div><div><dt>祖先</dt><dd>${s.ancestors}</dd></div>
        <div><dt>人物</dt><dd>${s.persons.toLocaleString('ja-JP')}</dd></div><div><dt>問いの型</dt><dd>${s.questions}</dd></div>
        <div><dt>照合</dt><dd>${s.quizzes}</dd></div><div><dt>囁き</dt><dd>${s.whispers}</dd></div>
        <div class="wide"><dt>系譜の組み合わせ</dt><dd>${s.routes.toLocaleString('ja-JP')} 通り × 結末5種</dd></div></dl>`})()}
    </details>
    <p class="lead">くわしい遊び方と更新情報は <button class="help-link" id="introHelp" type="button">ヘルプ</button>（? キー）で読めます。</p>
  </section>
  <div class="intro-go">
    <button class="btn" id="go">木箱を開ける</button>
  </div>`;
  st.phase='intro';st.resume=null;
  $('#go').onclick=()=>question();
  $('#introHelp').onclick=()=>openHelp('how');
}

function question(){
  const s=st.route[st.i];
  setStatus({era:s.era,gen:genLabel(s.year),life:''});
  FX.whisperMode(false);FX.skin(s.band);Sound.ambient(s.band);
  renderChrono();
  const show=()=>{
    const prev=st.lineage[st.i-1],v=s.questions[st.qv[st.i]];
    stage.innerHTML=`<section class="card">
      <p class="eyebrow">祖先の問い ${st.i+1} / ${st.route.length}</p>
      ${prev?clueBox(clueText(st.i-1),`${prev.who==='名は伝わらない'?prev.job:prev.who}が残した手がかり`,seedOf(prev)):''}
      <p class="lead">${v.lead}</p>
      <h2>${v.q}</h2>
      <div class="choices">${s.choices.map((c,k)=>`<button class="choice" data-k="${k}"><span>${'イロハニホ'[k]}</span><span>${c.label}</span></button>`).join('')}</div>
    </section>`;
    stage.querySelectorAll('.choice').forEach(b=>b.onclick=()=>{Sound.sfx('tap');choose(+b.dataset.k)});
    st.phase='q';st.resume=show;st.busy=false;
    window.scrollTo({top:0,behavior:'smooth'});
  };
  if(st.year!==s.year){st.busy=true;stage.innerHTML='';animateYear(s.year,show)}else show();
}

function choose(k){
  const s=st.route[st.i],c=resolveChoice(s.choices[k],s.band);
  st.tags[c.t]+=1;
  st.lineage.push({year:s.year,...c,k,eraId:s.id,band:s.band});
  Sound.sfx('reveal');
  renderMeters();
  setStatus({lv:c.lv,life:c.short});
  renderChrono();
  showReveal(st.i);
}

function showReveal(i){
  const last=i===st.route.length-1;
  const label=last?'記録の果てを見る':st.quizAt.has(i)?'この記録を照合する':'さらに遡る';
  stage.innerHTML=`<section class="card">
    ${recordBody(i)}
    <button class="btn${last?'':' ghost'}" id="next">${label}</button>
  </section>`;
  st.phase='reveal';st.resume=()=>showReveal(i);
  window.scrollTo({top:0,behavior:'smooth'});
  $('#next').onclick=()=>advance(i,'reveal');
}

/* reveal → (照合) → (囁き) → 次の時代 */
function advance(i,from){
  FX.whisperMode(false);
  if(from==='reveal'&&st.quizAt.has(i))return showQuiz(i);
  if(from!=='whisper'&&st.whisperAt.has(i))return showWhisper(i);
  if(i===st.route.length-1)return ending();
  st.i=i+1;question();
}

function showQuiz(i){
  const s=st.route[i],qz=s.quizzes[st.qz[i]];
  if(!st.qorder[i])st.qorder[i]=shuffle(qz.opts.map((_,k)=>k));
  const picked=st.qpick[i];
  const opts=st.qorder[i].map((k,n)=>{
    const cls=picked===undefined?'':k===0?' right':k===picked?' wrong':' dimmed';
    return `<button class="choice${cls}" data-k="${k}"${picked!==undefined?' disabled':''}><span>${'イロハ'[n]}</span><span>${qz.opts[k]}</span></button>`;
  }).join('');
  const verdict=picked===undefined?'':`<div class="verdict ${picked===0?'ok':'ng'}"><b>${picked===0?'照合成功 ── 真実の欠片を手に入れた':'照合失敗 ── 記録の一部がにじんで読めなくなった'}</b>${qz.exp}</div>
    <button class="btn ghost" id="cont">${st.whisperAt.has(i)?'……何か聞こえる':'さらに遡る'}</button>`;
  stage.innerHTML=`<section class="card quiz">
    <p class="eyebrow">記録の照合・${s.era}</p>
    <p class="lead">祖先の記録に偽りが紛れていないか、史実と照らし合わせる。</p>
    <h2>${qz.q}</h2>
    <div class="choices">${opts}</div>
    ${verdict}
  </section>`;
  st.phase='quiz';st.resume=()=>showQuiz(i);
  if(picked===undefined){
    stage.querySelectorAll('.choice').forEach(b=>b.onclick=()=>{st.qpick[i]=+b.dataset.k;Sound.sfx(st.qpick[i]===0?'ok':'ng');renderFrag();renderChrono();showQuiz(i)});
    window.scrollTo({top:0,behavior:'smooth'});
  }else $('#cont').onclick=()=>advance(i,'quiz');
}

function showWhisper(i){
  const w=st.whisperAt.get(i),picked=st.wpick[i];
  const opts=w.opts.map(([label,t],k)=>{
    const cls=picked===undefined?'':k===picked?' right':' dimmed';
    return `<button class="choice${cls}" data-k="${k}"${picked!==undefined?' disabled':''}><span>${'壱弐参肆伍'[k]}</span><span>${label}</span></button>`;
  }).join('');
  const reply=picked===undefined?'':`<p class="w-reply">${WHISPER_REPLY[w.opts[picked][1]]}</p>
    <button class="btn ghost" id="cont">声が遠ざかる……さらに遡る</button>`;
  const first=picked===undefined;
  stage.innerHTML=`<section class="card whisper">
    <p class="eyebrow">血の囁き</p>
    <p class="w-q">${first?'':w.q}</p>
    <div class="choices${first?' wait':''}">${opts}</div>
    ${reply}
  </section>`;
  st.phase='whisper';st.resume=()=>showWhisper(i);
  FX.whisperMode(true);
  if(first){
    Sound.sfx('whisper');
    FX.typewrite(stage.querySelector('.w-q'),w.q,()=>stage.querySelector('.whisper .choices')?.classList.remove('wait'));
    stage.querySelectorAll('.choice').forEach(b=>b.onclick=()=>{
      const k=+b.dataset.k,t=w.opts[k][1];
      st.wpick[i]=k;st.tags[t]+=1;st.answers.push({q:w.q,a:w.opts[k][0],t});
      renderMeters();showWhisper(i);
    });
    window.scrollTo({top:0,behavior:'smooth'});
  }else $('#cont').onclick=()=>advance(i,'whisper');
}

function pickEnding(){
  const max=Math.max(...Object.values(st.tags));
  const tied=Object.keys(st.tags).filter(k=>st.tags[k]===max);
  if(tied.length===1)return tied[0];
  for(let i=st.lineage.length-1;i>=0;i--) if(tied.includes(st.lineage[i].t)) return st.lineage[i].t;
  return tied[0];
}
function pickCompat(key){
  const others=Object.entries(st.tags).filter(([k])=>k!==key);
  const max2=Math.max(...others.map(([,v])=>v));
  const tied2=others.filter(([,v])=>v===max2).map(([k])=>k);
  if(tied2.length===1)return tied2[0];
  for(let i=st.lineage.length-1;i>=0;i--) if(tied2.includes(st.lineage[i].t)) return st.lineage[i].t;
  return tied2[0];
}

function ending(){
  const key=pickEnding(),E=ENDINGS[key];
  stage.innerHTML='';st.busy=true;
  renderChrono(key);
  const num=$('#tYear');num.classList.add('glitch');
  const glyph='0123456789■?∞';
  const timer=setInterval(()=>{num.textContent=Array.from({length:5},()=>glyph[Math.random()*glyph.length|0]).join('')},70);
  FX.whisperMode(false);
  FX.mergeCrests(st.lineage.map(seedOf),()=>{
    FX.skin('end-'+key);Sound.ambient('end-'+key);
    FX.endingFX(key,()=>{
      clearInterval(timer);num.classList.remove('glitch');num.textContent=E.num;
      const f=document.createElement('div');f.className='flash';document.body.appendChild(f);setTimeout(()=>f.remove(),950);
      show();
    });
  });
  setStatus({era:E.era,gen:'最初のひとり',lv:E.lv,life:E.life});

  function show(){
    const keys=Object.keys(TAGS),total=Object.values(st.tags).reduce((a,b)=>a+b,0)||1;
    const got=[...st.quizAt].filter(i=>st.qpick[i]===0).length;
    const compatKey=pickCompat(key);const CE=ENDINGS[compatKey];
    const truth=got===QUIZ_PER_RUN
      ?`<section class="card truth"><p class="eyebrow">隠された頁・真実の欠片 ${got}/${QUIZ_PER_RUN}</p><h2>すべての照合に成功した者だけが読める頁</h2><p class="story">${TRUTH[key]}</p></section>`
      :`<section class="card"><p class="eyebrow">隠された頁</p><p class="lead">真実の欠片 ${got}/${QUIZ_PER_RUN}。四つすべてを揃えた者にだけ、この先の頁が開く。たどる時代は毎回変わる。</p></section>`;
    stage.innerHTML=`<section class="card end">
      <p class="eyebrow">最終記録・起源</p>
      <div class="crest-final">${FX.mergedCrest(st.lineage.map(seedOf),'var(--gold)',150)}</div>
      <h1 class="title">${E.title}</h1>
      <div class="lines">${E.lines.map((l,i)=>`<p style="animation-delay:${i*0.5}s">${l}</p>`).join('')}<p class="final" style="animation-delay:${E.lines.length*0.5}s">${E.final}</p></div>
    </section>
    ${truth}
    <section class="card">
      <p class="eyebrow">系譜の記録札</p>
      <img class="result-img" id="resultImg" alt="あなたの系譜と起源をまとめた記録札">
      <p class="lead">長押し（パソコンは右クリック）で画像を保存できます。</p>
      <div class="end-tools"><button class="btn ghost" id="seeTree" type="button">家系図を見る</button><button class="btn ghost" id="seeMap" type="button">足跡の世界地図を見る</button></div>
    </section>
    <section class="card">
      <p class="eyebrow">血の配合</p>
      <div class="blood">${keys.map(k=>st.tags[k]?`<span style="--c:${TAGS[k].c};flex:${st.tags[k]}"></span>`:'').join('')}</div>
      <div class="legend">${keys.map(k=>`<span style="--c:${TAGS[k].c}"><b>${k}</b> ${Math.round(st.tags[k]/total*100)}%</span>`).join('')}</div>
      <p class="eyebrow" style="margin-top:10px">血の相性</p>
      <div class="compat-pair">
        <span class="compat-tag" style="--c:${TAGS[key].c}">${key} ${E.title}</span>
        <span class="compat-sep">×</span>
        <span class="compat-tag" style="--c:${TAGS[compatKey].c}">${compatKey} ${CE.title}</span>
      </div>
      <p class="lead">${COMPAT[key][compatKey]}</p>
      ${st.answers.length?`<p class="eyebrow" style="margin-top:6px">囁きへの答え</p><ul class="w-list">${st.answers.map(a=>`<li style="--c:${TAGS[a.t].c}"><span>${a.q}</span><b>${a.a}</b></li>`).join('')}</ul>`:''}
      <p class="eyebrow" style="margin-top:6px">系譜</p>
      <ol class="tree">${st.lineage.map(l=>{const f=fmtYear(l.year);return `<li style="--c:${TAGS[l.t].c}"><span class="y">${f.pre} ${f.num}年</span><span class="j"><em>${l.t}</em>${l.job}<span class="lv" style="margin-left:6px">${l.lv}</span><small>${l.who}・${l.place}</small></span></li>`}).join('')}
      <li style="--c:${TAGS[key].c}"><span class="y">${E.pre} ${E.num}</span><span class="j"><em>${key}</em>${E.job}<small>${E.place}</small></span></li></ol>
      <button class="btn ghost" id="again">別の血をたどり直す</button>
    </section>`;
    $('#again').onclick=intro;
    $('#seeTree').onclick=()=>FX.openLineage('tree');
    $('#seeMap').onclick=()=>FX.openLineage('map');
    st.phase='end';st.resume=show;st.busy=false;
    FX.resultImage(key).then(url=>{const im=$('#resultImg');if(im)im.src=url}).catch(()=>{});
    window.scrollTo({top:0,behavior:'smooth'});
  }
}

/* ===== ヘルプ（? ボタン / ? キー） ===== */
const CHANGELOG=ROOTS.changelog, CURRENT=CHANGELOG[0]?.version||'1.0';
const SEEN_KEY='sokou-help-seen';
function seenVersion(){try{return localStorage.getItem(SEEN_KEY)}catch(e){return null}}
function markSeen(){try{localStorage.setItem(SEEN_KEY,CURRENT)}catch(e){}$('#helpNew').hidden=true}
$('#helpNew').hidden=seenVersion()===CURRENT;

const HELP_TABS=[['how','遊び方'],['screen','画面の見方'],['data','収録内容'],['log','更新情報']];
let helpTab='how',helpReturn=null;

function helpBody(tab){
  if(tab==='how')return `
    <p>実家の押し入れから出てきた、渦の印の木箱。そこから始まる、あなたの血をさかのぼる記録です。問いに答えるたびに一世代ずつ過去へ進み、最後に一族の「起源」にたどり着きます。</p>
    <h3>一周の流れ</h3>
    <ol>
      <li><b>祖先の問い</b>　その時代の口調で問われます。選んだ答えで、その時代を生きた祖先の生業・居場所・暮らしぶりが決まります。</li>
      <li><b>記録の照合</b>　ときどき史実の問いが出ます。正解すると<b>真実の欠片 ◆</b>が手に入ります。</li>
      <li><b>血の囁き</b>　時代の合間に、正体の知れない声があなた自身に問いかけます。答えは血の配合に影響します。</li>
      <li><b>さらに遡る</b>　祖先が残した<b>渦の印</b>の手がかりが、次の時代へつながります。</li>
      <li><b>起源</b>　9つの時代をたどり終えると、最も濃くなった血の気配で結末が決まります。</li>
    </ol>
    <h3>結末と隠された頁</h3>
    <p>結末は全部で5種類。どれにたどり着くかは、選んだ答えと囁きへの答えしだいです。真実の欠片を<b>4つすべて</b>集めると、結末の後に隠された頁が開きます。</p>
    <h3>毎回ちがう系譜</h3>
    <p>たどる時代、問いの言い回し、照合の問題、囁き、祖先の名前は、遊ぶたびに入れ替わります。結末の画面の「別の血をたどり直す」から、何度でも新しい系譜を始められます。</p>`;
  if(tab==='screen')return `
    <dl class="help-dl">
      <dt>年表（左）</dt><dd>上が現代、下へ行くほど過去。たどった時代の年号・場所・生業が刻まれます。たどり終えた時代をタップすると、その記録を見返せます。◆は真実の欠片を得た時代です。</dd>
      <dt>渦の印</dt><dd>年表の上の数字は、集めた渦の印の数です。</dd>
      <dt>時代名・世代</dt><dd>いまいる時代と、あなたから何代前の祖先かを示します。</dd>
      <dt>暮らし</dt><dd>その祖先の暮らし向き（質素・裕福・命がけ など）と一言の暮らしぶり。</dd>
      <dt>欠片</dt><dd>◆が正解、×が不正解、◇がまだの照合です。</dd>
      <dt>海 星 地 火 書</dt><dd>あなたの血に混ざる気配の濃さ。いちばん濃い気配が結末を決めます。</dd>
      <dt>画面の色</dt><dd>遡った時代に合わせて、紙や色合いが変わります（昭和のセピア、江戸の和紙、平安の料紙、縄文の土 など）。</dd>
      <dt>生業の絵と渦紋</dt><dd>祖先ごとに、その生業の絵（まだ絵のない生業は影絵）と、その人だけの渦紋が描かれます。最後に九つの渦紋が重なって一つになります。</dd>
      <dt>系譜</dt><dd>上部の「系譜」ボタンで、家系図と、祖先の足跡と、結末の地（ムー大陸・シリウス・アガルタなど）までをたどる世界地図を見られます。日本付近は拡大図付きです。</dd>
      <dt>音</dt><dd>上部の「音」ボタンで、時代ごとの環境音と効果音を入り切りできます（最初は切）。</dd>
      <dt>記録札</dt><dd>結末の後に、あなたの系譜をまとめた画像が作られます。長押しや右クリックで保存できます。</dd>
    </dl>
    <h3>操作</h3>
    <ul class="keys">
      <li><kbd>?</kbd> または上部の「？」でこのヘルプを開く</li>
      <li><kbd>Esc</kbd> でヘルプを閉じる</li>
      <li>年表の時代は <kbd>Enter</kbd> でも開けます</li>
    </ul>`;
  if(tab==='data'){const s=contentStats();return `
    <p>現在の版（${CURRENT}）の収録内容です。</p>
    <dl class="stats">
      <div><dt>時代</dt><dd>${s.eras}</dd></div><div><dt>祖先</dt><dd>${s.ancestors}</dd></div>
      <div><dt>人物</dt><dd>${s.persons.toLocaleString('ja-JP')}</dd></div><div><dt>問いの型</dt><dd>${s.questions}</dd></div>
      <div><dt>照合</dt><dd>${s.quizzes}</dd></div><div><dt>囁き</dt><dd>${s.whispers}</dd></div>
      <div class="wide"><dt>系譜の組み合わせ</dt><dd>${s.routes.toLocaleString('ja-JP')} 通り × 結末5種</dd></div>
      <div class="wide"><dt>生業の絵</dt><dd>${(()=>{const j=new Set(Object.values(ERAS).flatMap(e=>e.choices.map(c=>c.job)));return Object.keys(ROOTS.jobIcons).filter(k=>j.has(k)).length+' / '+j.size})()}</dd></div></dl>
    <h3>時代の帯</h3>
    <p>一周は、次の帯から1つずつ時代を選んで組まれます。</p>
    <dl class="help-dl">${ROOTS.bands.map((b,k)=>`<dt>${b.id}</dt><dd>${BAND_ERAS[k].map(e=>e.era.split('・')[1]||e.era).join('、')}</dd>`).join('')}</dl>`;}
  return `<ul class="log">${CHANGELOG.map((c,k)=>`<li>
      <div class="log-head"><span class="log-ver${k?' old':''}">v${c.version}</span><span class="log-title">${c.title}</span><span class="log-date">${c.date}</span></div>
      <ul>${c.items.map(t=>`<li>${t}</li>`).join('')}</ul></li>`).join('')}</ul>`;
}
function renderHelp(){
  $('#helpPanel').innerHTML=`
    <div class="help-top"><div><small>祖先遡行録 v${CURRENT}</small><h2 id="helpTitle">ヘルプ</h2></div>
      <button class="help-close" type="button" data-close aria-label="ヘルプを閉じる">✕</button></div>
    <div class="help-tabs" role="tablist">${HELP_TABS.map(([id,l])=>`<button class="help-tab" type="button" role="tab" data-tab="${id}" aria-selected="${id===helpTab}">${l}</button>`).join('')}</div>
    <div class="help-body" role="tabpanel">${helpBody(helpTab)}</div>`;
}
function openHelp(tab){
  if(tab)helpTab=tab;
  helpReturn=document.activeElement;
  renderHelp();$('#help').hidden=false;$('#helpPanel').scrollTop=0;$('#helpPanel').focus();
  if(helpTab==='log')markSeen();
}
function closeHelp(){$('#help').hidden=true;helpReturn&&helpReturn.focus&&helpReturn.focus()}
$('#helpBtn').addEventListener('click',()=>openHelp(seenVersion()===CURRENT?null:'log'));
$('#help').addEventListener('click',e=>{
  if(e.target.closest('[data-close]'))return closeHelp();
  const t=e.target.closest('[data-tab]');
  if(t){helpTab=t.dataset.tab;renderHelp();$('#helpPanel').scrollTop=0;if(helpTab==='log')markSeen();$(`[data-tab="${helpTab}"]`).focus()}
});
addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!$('#help').hidden){e.preventDefault();closeHelp();return}
  if(e.key==='?'&&$('#help').hidden&&!/input|textarea/i.test(e.target.tagName)){e.preventDefault();openHelp()}
});

intro();
