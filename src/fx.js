/* ===== グラフィックと音 =====
   時代スキン / 時を遡る演出 / 渦紋の生成 / 祖先の影絵 / 家系図と足跡の地図 /
   結末の演出 / 囁きの演出 / 記録札の画像 / 環境音と効果音
   外部画像・音源は使わず、CSS・SVG・Canvas・Web Audio だけで描く */
const REDUCED=matchMedia('(prefers-reduced-motion:reduce)').matches;
const TAGHEX={海:'#5f97b0',星:'#a89fdc',地:'#a8845a',火:'#cf6a43',書:'#cfc08f'};

/* ---------- 乱数（種つき） ---------- */
function hashStr(s){let h=2166136261;for(const ch of String(s))h=Math.imul(h^ch.codePointAt(0),16777619);return h>>>0}
function seeded(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const seedOf=l=>hashStr(`${l.eraId}:${l.k}:${l.who}`);

const FX={current:'現代'};

/* ---------- 1. 時代スキン ---------- */
FX.skin=function(key){
  if(!key)return;
  FX.current=key;
  document.documentElement.dataset.skin=key;
  sky.redraw();
};

/* ---------- 星空（スキン連動・遡る時は逆回転） ---------- */
const sky=(()=>{
  const c=document.getElementById('sky'),x=c.getContext('2d');
  const R=seeded(7),stars=[...Array(240)].map(()=>({a:R()*Math.PI*2,r:Math.sqrt(R()),s:R()<.08?1.7:.8,o:.15+R()*.5}));
  let angle=0,spin=0,raf=0,last=0;
  function size(){const d=Math.min(2,devicePixelRatio||1);c.width=innerWidth*d;c.height=innerHeight*d}
  function draw(){
    const rgb=getComputedStyle(document.documentElement).getPropertyValue('--star').trim()||'232,225,204';
    const w=c.width,h=c.height,cx=w/2,cy=h/2,R0=Math.hypot(w,h)/2,d=Math.min(2,devicePixelRatio||1);
    x.clearRect(0,0,w,h);
    for(const s of stars){
      const a=s.a+angle,px=cx+Math.cos(a)*s.r*R0,py=cy+Math.sin(a)*s.r*R0;
      x.fillStyle=`rgba(${rgb},${s.o})`;
      if(spin){x.strokeStyle=`rgba(${rgb},${s.o*.6})`;x.lineWidth=s.s*d;x.beginPath();x.arc(cx,cy,s.r*R0,a,a+spin*.04*s.r,spin<0);x.stroke()}
      x.fillRect(px,py,s.s*d,s.s*d);
    }
  }
  function loop(t){const dt=Math.min(50,t-(last||t));last=t;angle+=spin*dt/1000;draw();if(spin)raf=requestAnimationFrame(loop);else raf=0}
  addEventListener('resize',()=>{size();draw()});size();
  return{redraw:draw,spin(v){spin=REDUCED?0:v;if(spin&&!raf){last=0;raf=requestAnimationFrame(loop)}if(!spin)draw()}};
})();

/* ---------- 2. 時を遡る演出 ---------- */
FX.warpStart=function(era,dur){
  if(REDUCED||!dur)return;
  const w=document.getElementById('warp');
  w.querySelector('.warp-era').textContent=era;
  w.style.setProperty('--dur',dur+'ms');
  w.hidden=false;w.classList.remove('out');void w.offsetWidth;w.classList.add('in');
  sky.spin(-2.2);
};
FX.warpYear=function(f){const y=document.querySelector('#warp .warp-year');if(y)y.innerHTML=`<small>${f.pre}</small>${f.num}<small>年</small>`};
FX.warpEnd=function(){
  const w=document.getElementById('warp');if(w.hidden)return;
  sky.spin(0);w.classList.remove('in');w.classList.add('out');setTimeout(()=>{w.hidden=true;w.classList.remove('out')},450);
};

/* ---------- 3. 渦紋の生成 ---------- */
function crestShape(seed){
  const r=seeded(seed),arms=1+(r()*3|0),turns=1.3+r()*1.5,wob=r()*.14,dir=r()<.5?1:-1,ring=r()<.6,
        dots=r()<.5?3+(r()*6|0):0,dotR=r()*2+1.5,inner=r()<.4;
  const paths=[];
  for(let a=0;a<arms;a++){
    let d='';
    for(let i=0;i<=60;i++){const t=i/60,th=dir*t*turns*Math.PI*2+a*Math.PI*2/arms,rad=4+t*36*(1+wob*Math.sin(t*19+a));
      d+=(i?'L':'M')+(50+rad*Math.cos(th)).toFixed(1)+' '+(50+rad*Math.sin(th)).toFixed(1)}
    paths.push(d);
  }
  return{paths,ring,dots,dotR,inner,arms};
}
FX.crest=function(seed,color='currentColor',size=24,cls=''){
  const s=crestShape(seed);
  return `<svg class="crest ${cls}" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" style="color:${color}">
    ${s.ring?'<circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="3"/>':''}
    ${s.inner?'<circle cx="50" cy="50" r="5" fill="currentColor"/>':''}
    ${s.paths.map(d=>`<path d="${d}" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}
    ${[...Array(s.dots)].map((_,i)=>{const a=i/s.dots*Math.PI*2;return `<circle cx="${(50+46*Math.cos(a)).toFixed(1)}" cy="${(50+46*Math.sin(a)).toFixed(1)}" r="${s.dotR+2}" fill="currentColor"/>`}).join('')}
  </svg>`;
};
FX.mergedCrest=function(seeds,color,size,cls=''){
  return `<svg class="crest merged ${cls}" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" style="color:${color}">
    <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".6"/>
    ${seeds.map((sd,i)=>crestShape(sd).paths.map(d=>`<path d="${d}" fill="none" stroke="currentColor" stroke-width="${i===seeds.length-1?4:2.2}" stroke-linecap="round" opacity="${(.35+.65*(i+1)/seeds.length).toFixed(2)}" transform="rotate(${i*40} 50 50)"/>`).join('')).join('')}
  </svg>`;
};
/* 九つの印が集まって一つになる */
FX.mergeCrests=function(seeds,done){
  if(REDUCED){done();return}
  const m=document.getElementById('merge');
  m.innerHTML=seeds.map((sd,i)=>{const a=i/seeds.length*Math.PI*2-Math.PI/2;
    return `<span style="--x:${(Math.cos(a)*34).toFixed(1)}vmin;--y:${(Math.sin(a)*34).toFixed(1)}vmin;--d:${i*90}ms">${FX.crest(sd,'var(--gold)',64)}</span>`}).join('')
    +`<span class="m-final">${FX.mergedCrest(seeds,'var(--gold)',220)}</span>`;
  m.hidden=false;void m.offsetWidth;m.classList.add('go');
  Sound.sfx('merge');
  setTimeout(()=>{m.classList.add('fin')},1500);
  setTimeout(()=>{m.classList.add('out');setTimeout(()=>{m.hidden=true;m.className='';m.innerHTML=''},500);done()},2700);
};

/* ---------- 4. 祖先の影絵 ---------- */
FX.portrait=function(c,band,size=88){
  const icon=ROOTS.jobIcons[c.job];
  if(icon)return `<svg class="portrait-svg has-icon" viewBox="0 0 100 120" width="${size}" height="${size*1.2}" role="img" aria-label="${c.job}" style="--c:${TAGS[c.t].c}">
    <rect width="100" height="120" rx="4" style="fill:var(--c)" opacity=".16"/>
    <circle cx="50" cy="60" r="42" style="fill:var(--c)" opacity=".35"/>
    <image href="${icon}" x="2" y="12" width="96" height="96" preserveAspectRatio="xMidYMid meet"/>
  </svg>`;
  const f=c.g==='f',unknown=c.who==='名は伝わらない';
  const S='style="fill:var(--sil)"',K='style="stroke:var(--sil)" fill="none" stroke-width="3.2" stroke-linecap="round"';
  const robe={
    現代:'M30 120 L34 78 Q50 66 66 78 L70 120Z',近代:'M26 120 L32 76 Q50 64 68 76 L74 120Z',
    近世:'M22 120 L30 80 Q50 66 70 80 L78 120Z',戦国:'M20 120 L26 82 L38 72 Q50 68 62 72 L74 82 L80 120Z',
    中世:'M24 120 L31 80 Q50 66 69 80 L76 120Z',古代:'M20 120 L29 82 Q50 66 71 82 L80 120Z',
    弥生:'M32 120 L36 78 Q50 68 64 78 L68 120Z',太古:'M24 120 L28 84 L34 88 L38 76 L44 82 L50 72 L56 82 L62 76 L66 88 L72 84 L76 120Z',
    終焉:'M30 120 L36 62 Q38 30 50 28 Q62 30 64 62 L70 120Z'}[band]||'M28 120 L34 76 Q50 66 66 76 L72 120Z';
  const hat={
    現代:'<path d="M36 57 Q35 35 50 34 Q65 35 64 57 L60 63 Q50 57 40 63Z" '+S+'/>',
    近代:f?'<path d="M37 53 Q37 37 50 37 Q63 37 63 53 L63 61 L37 61Z" '+S+'/>':'<ellipse cx="50" cy="42" rx="17" ry="3" '+S+'/><path d="M40 42 Q40 30 50 30 Q60 30 60 42Z" '+S+'/>',
    近世:f?'<circle cx="50" cy="36" r="7" '+S+'/><path d="M41 38 Q50 30 59 38 L59 44 L41 44Z" '+S+'/>':'<rect x="46" y="34" width="8" height="6" rx="2" '+S+'/><path d="M47 37 L57 32 L58 34.5 L48 39.5Z" '+S+'/>',
    戦国:'<path d="M35 51 Q35 34 50 34 Q65 34 65 51 L70 53 L30 53Z" '+S+'/><path d="M38 31 Q50 20 62 31 Q50 25 38 31Z" '+S+'/>',
    中世:f?'<path d="M38 50 Q36 74 40 92 L60 92 Q64 74 62 50Z" '+S+'/>':'<path d="M43 43 Q44 22 55 19 Q61 26 58 43Z" '+S+'/>',
    古代:f?'<path d="M37 50 Q34 78 40 96 L60 96 Q66 78 63 50Z" '+S+'/>':'<rect x="42" y="35" width="16" height="7" rx="2" '+S+'/><path d="M55 37 Q72 30 78 45 L75 47 Q69 37 56 42Z" '+S+'/>',
    弥生:'<circle cx="37" cy="54" r="4.5" '+S+'/><circle cx="63" cy="54" r="4.5" '+S+'/><path d="M39 46 Q50 36 61 46Z" '+S+'/>'+(f?'<circle cx="50" cy="36" r="5" '+S+'/>':''),
    太古:'<path d="M36 51 L32 40 L40 43 L41 33 L47 40 L52 31 L55 40 L62 34 L60 44 L68 40 L64 53Z" '+S+'/>',
    終焉:''}[band]||'';
  const prop={
    海:'<path d="M76 70 L90 116" '+K+'/><ellipse cx="91" cy="118" rx="4" ry="7" transform="rotate(-20 91 118)" '+S+'/><path d="M2 113 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0 t16 0" style="stroke:var(--c)" fill="none" stroke-width="2.2" opacity=".9"/>',
    星:'<path d="M64 80 L80 46" '+K+'/><path d="M82 22 l2.6 6.4 6.8.5 -5.2 4.4 1.7 6.6 -5.9 -3.6 -5.9 3.6 1.7 -6.6 -5.2 -4.4 6.8 -.5Z" style="fill:var(--gold)"/>',
    地:'<path d="M70 76 L86 114" '+K+'/><path d="M73 72 Q84 62 95 72" '+K+' stroke-width="4"/>',
    火:'<path d="M70 78 L84 110" '+K+'/><rect x="77" y="66" width="13" height="8" rx="1.5" transform="rotate(-25 83 70)" '+S+'/><path d="M14 118 Q8 104 16 96 Q15 104 20 106 Q20 96 27 90 Q26 102 31 108 Q33 114 28 118Z" style="fill:var(--fire)" opacity=".85"/>',
    書:'<rect x="64" y="86" width="24" height="8" rx="3.5" '+S+'/><path d="M70 72 L84 58" '+K+'/>'
  }[c.t]||'';
  const eyes=(band==='終焉'||unknown&&band==='太古')?'<circle cx="46" cy="51" r="1.3" style="fill:var(--gold)"/><circle cx="54" cy="51" r="1.3" style="fill:var(--gold)"/>':'';
  const backHair=(f&&(band==='中世'||band==='古代'))?hat:'';
  return `<svg class="portrait-svg" viewBox="0 0 100 120" width="${size}" height="${size*1.2}" role="img" aria-label="${c.job}の影絵" style="--c:${TAGS[c.t].c}">
    <rect width="100" height="120" rx="4" style="fill:var(--c)" opacity=".16"/>
    <circle cx="50" cy="54" r="34" style="fill:var(--c)" opacity=".5"/>
    <path d="M0 110 Q50 102 100 110 V120 H0Z" style="fill:var(--sil)" opacity=".35"/>
    ${backHair}
    <path d="${robe}" ${S}/>
    <circle cx="50" cy="51" r="11" ${S}/>
    ${backHair?'':hat}
    ${prop}${eyes}
  </svg>`;
};

/* ---------- 5・6. 系譜：家系図と足跡の地図 ---------- */
/* --- 地形データ（経度・緯度のおおまかな輪郭） --- */
const JP=[
 [[141.2,41.4],[140,41.4],[139.8,42.3],[140.4,43.3],[141.4,43.4],[141.6,45.4],[142,45.5],[143.3,44.3],[144.8,43.9],[145.6,43.4],[145.3,43.2],[143.8,42.9],[143.3,42],[141.8,42.6],[141,42.3]],
 [[140.9,41.5],[141.5,41.3],[141.6,40.4],[142,39.6],[141.6,38.9],[141.2,38.3],[140.9,37.6],[141,36.9],[140.6,36.3],[140.8,35.7],[140.4,35.2],[139.9,34.9],[139.8,35.3],[139.6,35.2],[139.2,35],[139,34.6],[138.8,34.6],[138.6,35],[138.2,34.6],[137.3,34.6],[136.9,34.3],[136.8,34.6],[136.5,34.2],[135.8,33.5],[135.2,33.8],[135.4,34.4],[135.1,34.6],[134.2,34.6],[133.3,34.4],[132.4,34.2],[131.9,33.9],[130.9,33.9],[131,34.4],[131.8,34.7],[132.6,35.4],[133.4,35.5],[134.4,35.6],[135.4,35.7],[135.9,35.6],[136.1,36.2],[136.7,36.9],[137,37],[137.3,37.5],[136.8,37.2],[136.9,36.8],[137.3,36.75],[138.2,37],[138.9,37.8],[139.4,38.3],[139.9,39],[140,39.9],[139.7,40.6],[140.3,41.2]],
 [[132,33.4],[132.6,33],[133,32.7],[133.3,33.3],[134.2,33.2],[134.7,33.8],[134.6,34.2],[133.6,34.4],[132.9,34.1]],
 [[130.9,33.9],[131.5,33.6],[131.9,33.1],[131.6,32],[131.3,31.4],[130.7,31],[130.2,31.2],[130.3,31.8],[130.1,32.5],[129.6,33],[129.9,33.5],[130.4,33.6]],
 [[138.2,38.3],[138.5,38.3],[138.5,37.8],[138.2,37.8]],
 [[129.25,34.7],[129.45,34.6],[129.3,34.15],[129.2,34.3]],
 [[130.9,30.85],[131.1,30.7],[131,30.35],[130.85,30.5]],
 [[127.65,26.85],[128.3,26.8],[127.95,26.1],[127.65,26.2]]
];
const WORLD=[
 // ユーラシア
 [[-9,43],[-9,37],[-5.5,36],[-1,37],[3,42],[7,43.7],[12.5,44],[16,38],[18.5,40],[13.5,45.6],[19.5,42],[23,36.5],[26,40.5],[29,41],[26.5,39],[28,36.8],[36,36.5],[35,33],[34.3,31.2],[34.6,29],[36.5,26],[39,21],[42.7,16],[43.5,12.7],[48,14],[52,15.5],[57.5,19],[59.8,22.5],[56.4,26.3],[54,24],[51,24.5],[50,27],[48,30],[51.5,27.8],[57,25.7],[61.5,25.2],[66.5,25.4],[68.5,23],[72.8,19],[74.8,12.8],[77.5,8],[80.2,13.5],[82.3,17],[86.9,21.5],[91.8,22.4],[94.3,16],[97.6,16.5],[98.5,10],[100.3,5.5],[103.5,1.3],[103.4,4.2],[100.4,7.2],[99.9,12.8],[102.6,12],[105,8.7],[109.2,12],[108.8,15.4],[106,19.8],[107.5,21.5],[110,21],[113.5,22.2],[116.5,22.9],[119.5,25.5],[122,30],[121,31.5],[120.5,33.5],[119.2,35],[122.5,36.9],[118.9,37.4],[117.6,39],[121.6,40.9],[122.3,40.4],[121.2,38.8],[124.4,40],[125.3,39.5],[126.3,37.2],[126.5,34.4],[129.3,35.3],[128.4,38.6],[127.5,39.7],[130.7,42.3],[135.5,43.9],[140.3,48.8],[140.4,53.2],[137.2,54.5],[141,57.5],[148.6,59.4],[155,59.2],[156.5,57],[156,51],[158.5,52],[162.5,56.5],[163.5,59.5],[170,60],[177.5,62.5],[180,65],[190,66],[180,69],[170,70],[161,69.5],[146,72.3],[130,71.5],[113,73.7],[105,77],[90,75.5],[80,73.5],[69,73],[67,70],[54,68.7],[44,68.5],[41,67],[35,69.2],[23,70.6],[14,67.5],[10,63.5],[5,62],[5.5,58.5],[8,58],[10.5,59.2],[10,57.6],[8.2,56.5],[8.6,54.2],[4.5,52.5],[1.6,50.5],[-1.5,49.6],[-4.7,48.4],[-1.3,46],[-1.6,43.4]],
 // アフリカ
 [[-17,21],[-17,15],[-15,11],[-13,8],[-8,4.5],[-4,5],[2,6],[6,4.5],[9,4],[9.5,1],[12,-5],[13.5,-11],[12,-17],[14,-23],[16,-28.5],[18.5,-34.5],[20,-34.8],[25,-34],[30,-31],[32.5,-28.5],[35.5,-24],[35.3,-19.5],[40.5,-15],[39.5,-7],[41,-1.5],[43,0],[47.5,4],[51,10.5],[51.3,11.8],[44,10.5],[43,12.5],[39.5,15.5],[38,18],[37,21],[35,24],[33,28],[32.5,30],[30,31.3],[25,31.7],[20,30.5],[15,32],[11,33.5],[10,37],[7,37],[3,36.8],[-2,35.2],[-5.8,35.8],[-6.5,34],[-9.5,32],[-9.8,29.5],[-13,27.5]],
 // 北アメリカ
 [[-168,65.5],[-162,70],[-156,71.3],[-140,69.7],[-128,70],[-115,68.5],[-100,68],[-95,71.5],[-85,69.5],[-82,66],[-88,64],[-93,59],[-92.5,57],[-85,55.2],[-82,52.5],[-79,51.5],[-78,58],[-77,62.3],[-72,61.5],[-65,60.3],[-61,56],[-57,52],[-60,47],[-66,44.8],[-70,43.5],[-70,41.5],[-74,40.5],[-76,37],[-75.5,35.2],[-78.5,33.8],[-81,31.5],[-80,27],[-80.5,25.2],[-82,26.8],[-84,30],[-89,30.3],[-94,29.5],[-97.5,27.8],[-97.5,22],[-95,18.6],[-91,18.8],[-90.5,21],[-87,21.5],[-87.5,18],[-88.5,15.9],[-84,15.8],[-83.5,11],[-81.5,9],[-77.5,8.5],[-77.5,7.5],[-80,7.5],[-82,8.2],[-86,11],[-88,13.2],[-92,14.5],[-95,16],[-98,16],[-102,18],[-105.5,20.5],[-105.7,22.5],[-109,26],[-112.8,31.5],[-114.8,31.7],[-114,28.5],[-111,25],[-110,23],[-112,24.8],[-114.5,28],[-117,32.5],[-120.6,34.6],[-122.5,37.5],[-124.2,40.5],[-124,46],[-123,48.5],[-128,51],[-131,54.5],[-135,57.5],[-140,59.8],[-146,61],[-152,59],[-158,57],[-162,55],[-158,58.5],[-162,60],[-165,62.5]],
 [[-90,72],[-78,72.5],[-68,70],[-62,66.5],[-65,63],[-72,63.5],[-79,65],[-85,68.5]],
 [[-120,74],[-95,74],[-80,74.5],[-80,76],[-120,76]],
 [[-73,78],[-58,82],[-30,83],[-20,82],[-18,76],[-22,70],[-33,68],[-40,65],[-43,60],[-49,61.5],[-53,66],[-54,70],[-60,76]],
 [[-85,21.8],[-81,23],[-77,22],[-74.2,20.2],[-77,19.9],[-80,21.7]],
 [[-74.5,18.4],[-72,20],[-68.5,18.7],[-71,17.6]],
 // 南アメリカ
 [[-77.5,8.5],[-75.5,10.7],[-71.5,12.4],[-68,10.5],[-62,10.7],[-60,8.5],[-55,6],[-51.5,4.5],[-50,1],[-48.5,-1],[-44,-2.5],[-39,-3.5],[-35,-5.5],[-35,-9],[-38.5,-13],[-39,-17.5],[-41,-22],[-45,-23.5],[-48.5,-27],[-49,-28.6],[-52,-32],[-54,-34.5],[-57.5,-35],[-57,-38],[-62,-39],[-65,-42],[-67.5,-46.5],[-66,-48],[-69,-51],[-68.5,-53],[-71,-54],[-74.5,-52],[-75.5,-47],[-73.5,-42],[-73.5,-37],[-71.5,-32.5],[-71.4,-28],[-70.3,-18.5],[-75,-15.5],[-77,-12],[-79.5,-7.5],[-81,-5],[-80,-2],[-80,1],[-78.5,2.5],[-77.3,4],[-77.4,7]],
 // オセアニア・東南アジアの島々
 [[113.5,-22],[114,-26.5],[115,-34],[117.5,-35],[123.5,-34],[129,-31.6],[132,-32],[135.5,-34.8],[138,-35.5],[140,-37.8],[144,-38.3],[146.5,-39],[150,-37.5],[151.5,-33],[153,-31],[153.6,-28],[153,-25.5],[150.8,-22.5],[146.3,-19],[145.5,-15],[143.5,-14],[142.5,-10.7],[141.5,-13],[141.5,-17],[140,-17.6],[136.5,-15.5],[135.8,-12.5],[132.5,-11.5],[130.3,-12.5],[129,-15],[127,-14],[125,-15],[122.2,-17.5],[121,-19.5],[117,-20.6]],
 [[144.6,-40.7],[148.3,-40.9],[148,-43.2],[146,-43.6],[145.2,-42]],
 [[172.7,-34.4],[174.5,-36.8],[178.5,-37.7],[177,-39.3],[175.2,-41.6],[174.6,-39.9],[173.8,-39],[174.6,-37.2]],
 [[172.7,-40.5],[174.3,-41.3],[173,-43.8],[171.2,-44.4],[169,-46.6],[166.6,-46],[168.3,-44],[170.5,-43]],
 [[95.3,5.6],[97.5,5.2],[100.4,2.2],[103.8,-1],[106,-3],[106,-5.9],[104.6,-5.9],[102.3,-4],[100.3,-0.8],[98.6,1.7]],
 [[105.2,-6.8],[108.5,-6.5],[112.6,-6.9],[114.6,-7.8],[114.4,-8.7],[108,-7.8],[105.4,-7]],
 [[109,1.5],[109.6,-1.5],[110.3,-3],[114.5,-4],[116.5,-3],[118,0.8],[117.7,4.2],[119,5.4],[117.2,7],[116,6],[113,3.2],[111,1.6]],
 [[119.4,-5.5],[120.5,-2.5],[121.5,1],[124.9,1.5],[122.8,-0.8],[121,-1.5],[122.5,-4.5],[120.5,-5.5]],
 [[131,-1],[134,-1],[138,-1.6],[141,-2.6],[145.8,-5.3],[147.5,-6],[150.5,-10.6],[147.4,-10.1],[144,-7.7],[141,-9.1],[138,-8.4],[138.5,-6.8],[136,-4.5],[132,-3]],
 [[120.5,18.5],[122.2,18.5],[122,16],[124,13],[121.5,13.8],[120.6,14.5],[119.9,16.4]],
 [[122,7],[126.2,7],[126.5,9],[125.4,9.8],[123.8,8.5],[122,8.2]],
 [[120.1,23],[121.5,25.3],[121.9,24.5],[120.8,22]],
 [[79.8,6],[80.1,9.8],[81.9,7.5],[81.2,6.2]],
 [[43.3,-22],[44.2,-25],[47,-25],[50.4,-15.5],[49.3,-12],[47.4,-15],[44.4,-16.2],[44,-20]],
 [[-5.7,50],[1.4,51.2],[1.7,52.7],[0,53.5],[-1.6,55.6],[-2,57.6],[-4,58.6],[-5,58.6],[-6.2,56.8],[-4.8,55],[-3,54],[-4.5,53.3],[-5,51.7],[-3,51.3]],
 [[-6,52.2],[-6.2,54],[-7.3,55.3],[-10,54.2],[-10.3,51.6]],
 [[-22.5,64],[-13.5,65],[-14.5,64.3],[-18.8,63.4]],
 [[142,46],[143.5,46],[144.7,49],[143,54],[142.5,54.3],[142.1,51],[141.8,48]],
 ...JP
];
const SEAS=[
 [[10.5,54.3],[14,54],[19,54.5],[21,56.8],[24,58.5],[29.5,59.9],[23,60.2],[21.4,63.5],[25,65.5],[22.5,65.8],[17.5,62.5],[19,60],[16.5,57],[14.4,56],[12.5,55.6],[11,55.5]],
 [[28,41.3],[29,41.2],[33,42],[36,41.7],[41.5,41.5],[41.5,42.6],[39,44.5],[37.5,45.2],[35,45],[33.5,44.5],[33,45.8],[30.8,46.5],[29.6,45.4],[28.6,44],[28,42.7]],
 [[47,44.5],[49.5,46.5],[53,47],[53,45],[51,44.5],[52.5,42],[53,40],[54,37.4],[51,36.7],[49,37.6],[49.5,40],[47.5,42]]
];

/* --- 投影 --- */
// 世界地図：太平洋を中心に、西経30度から東へ一周。上端の帯＝宇宙、下端の帯＝地の底
const WM={w:720,top:34,lat0:75,lat1:-60,k:2};
WM.h=WM.top+(WM.lat0-WM.lat1)*WM.k;WM.H=WM.h+34;
const wlon=lon=>lon<-30?lon+360:lon;
const wproj=(lon,lat)=>[(wlon(lon)+30)*WM.k,WM.top+(WM.lat0-Math.max(WM.lat1,Math.min(WM.lat0,lat)))*WM.k];
// 日本の拡大図
const proj=(lon,lat)=>[(lon-127)*14,(46-lat)*16.8];
const inJapan=(lon,lat)=>lon>=126.5&&lon<=146.5&&lat>=24&&lat<=46;

/* --- 地名 → 座標（S＝宇宙、U＝地の底、N＝時間の外側） --- */
const PLACES=[
 ['帯方郡',126.5,38.4],['満洲',125,43.5],['咸陽|隋',108.9,34.3],['琅邪|斉・',119.5,35.6],['太平洋',165,12],['アナトリア',38.9,37.2],
 ['凍てつく大地',105,63],['地底','U'],['どこでもない|時間の外側','N'],
 ['納沙布|北海道',145.8,43.4],['外ヶ浜',140.6,41],['亀ヶ岡',140.3,40.9],['三内丸山',140.7,40.8],['津軽',140.4,40.7],['陸奥の台地|北のムラ|北の森|北の海辺',141.2,40.6],
 ['平泉',141.1,39],['気仙',141.6,39],['水沢',141.1,39.1],['三陸',141.9,39.3],['陸奥',141,39.5],
 ['鹿島',140.6,35.9],['銚子',140.8,35.7],['下総',140.2,35.8],['奥東京湾|武蔵',139.7,35.95],
 ['横浜',139.64,35.45],['浦賀',139.72,35.24],['稲村ヶ崎|極楽寺|鶴岡|鎌倉|相模',139.55,35.31],
 ['本郷|銀座|霞が関|日比谷|大手町|神田|京橋|麻布|月島|本所|深川|浅草|両国|日本橋|品川|江戸|東京|国立競技場',139.76,35.68],
 ['神津島',139.15,34.21],['韮山|伊豆',138.95,35.05],['御殿場',138.93,35.3],['焼津',138.32,34.87],['浜松',137.73,34.71],
 ['浅間|上野国',138.52,36.4],['黒川金山|甲斐',138.73,35.75],['星糞峠|信濃・',138.2,36.2],['信濃川',138.9,37.4],['糸魚川|越後',137.86,37.04],['五箇山|越中',136.9,36.42],
 ['桶狭間|熱田|津島|尾張|今川本陣',136.95,35.1],['高浜|三河',136.99,34.93],['美濃',136.92,35.49],
 ['安土',136.14,35.15],['坂本',135.87,35.07],['佐和山',136.27,35.29],['瀬田|近江',135.95,35],
 ['周防|山口',131.47,34.18],['隠岐',133.25,36.2],['鞍馬',135.77,35.12],['比叡山',135.84,35.07],['水無瀬',135.67,34.87],['長岡京',135.7,34.92],['淀川',135.62,34.85],['丹波',135.3,35.2],
 ['平安京|内裏|陰陽寮|一条|三条|山城|京・|^京$',135.76,35.01],
 ['平城京|奈良',135.8,34.68],['飛鳥|甘樫丘|小墾田|島庄|橿原',135.82,34.47],['纒向|大和',135.84,34.55],['熊野',135.87,33.73],
 ['堺',135.48,34.57],['大坂|大阪',135.5,34.69],['難波|摂津|浪速',135.5,34.68],['兵庫',135.18,34.68],['生野|但馬',134.8,35.15],
 ['越前',136.07,35.65],['出雲',132.75,35.4],['石見',132.44,35.1],['吉備',133.8,34.65],['長門|赤間関|長登',131,34.2],
 ['阿波|祖谷',133.85,33.88],['能島|瀬戸内',133.05,34.18],['邪馬台国',132.8,34],
 ['対馬',129.3,34.4],['玄界灘',130,34.05],['志賀島',130.3,33.67],['八幡',130.82,33.86],['筑豊',130.7,33.65],['油山',130.37,33.53],['伊都国',130.2,33.55],
 ['博多|筑前|板付|春日|奴国',130.42,33.59],['吉野ヶ里|佐賀',130.38,33.33],['長崎|出島|野母崎',129.87,32.74],['松浦|肥前',129.7,33.35],
 ['坊津',130.22,31.27],['上野原|薩摩',130.6,31.6],['南九州',130.8,31.8],['種子島|大隅',130.98,30.6],['南の島々',129.7,29],['日向',131.4,32.3],
 ['筑紫|北部九州|九州',130.6,33.2],['クニとクニの境',131.3,33.9],['海辺のムラ',140.1,35.6],['海辺の岬',139.9,35],['日本',138.6,36.3]
].map(([k,a,b])=>({re:new RegExp(k),sp:typeof a==='string'?a:null,lon:a,lat:b}));
function locate(place){
  for(const p of PLACES)if(p.re.test(place))return p.sp?{sp:p.sp}:{lon:p.lon,lat:p.lat};
  return null;
}
/* 結末の行き先 */
const END_DEST={
  海:{lon:178,lat:6,label:'ムー大陸（伝説）'},
  星:{sp:'S',label:'シリウス星系・8.6光年'},
  地:{sp:'U',label:'地球の内部・アガルタ'},
  火:{lon:72,lat:25,label:'超古代文明（伝説）'},
  書:{sp:'N',label:'時間の外側'}
};
const SPECIAL={S:{y:14,label:'宇宙'},U:{y:WM.h+18,label:'地の底'},N:{y:WM.h+18,label:'時間の外側'}};
function wpoint(loc,prevX){
  if(!loc)return null;
  if(loc.sp){
    const x=loc.sp==='N'?WM.w-60:loc.sp==='U'?(prevX??360):(prevX??360);
    return {x,y:SPECIAL[loc.sp].y,sp:loc.sp};
  }
  const [x,y]=wproj(loc.lon,loc.lat);return {x,y,jp:inJapan(loc.lon,loc.lat)};
}
const polyPath=(poly,pj)=>`M${poly.map(([a,b])=>pj(a,b).map(v=>v.toFixed(1)).join(' ')).join('L')}Z`;

function worldMap(pts,end){
  const land=WORLD.map(p=>`<path d="${polyPath(p,wproj)}" class="m-land"/>`).join('');
  const seas=SEAS.map(p=>`<path d="${polyPath(p,wproj)}" class="m-sea-in"/>`).join('');
  const grid=[0,60,120,180,240,300].map(l=>{const [x]=wproj(l>180?l-360:l,0);return `<line x1="${x}" y1="${WM.top}" x2="${x}" y2="${WM.h}" class="m-grid"/>`}).join('')
    +[60,30,0,-30].map(l=>{const [,y]=wproj(0,l);return `<line x1="0" y1="${y}" x2="${WM.w}" y2="${y}" class="m-grid${l===0?' eq':''}"/>`}).join('');
  const [jx1,jy1]=wproj(127,46),[jx2,jy2]=wproj(146.5,25);
  // 点と線
  let prevX=null;const W=[];
  for(const o of pts){const p=wpoint(o.loc,prevX);if(p){W.push({...o,p});prevX=p.x}}
  let segs='';
  for(let k=1;k<W.length;k++){const a=W[k-1].p,b=W[k].p;
    segs+=`<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" class="m-seg" style="stroke:${TAGHEX[W[k].l.t]}"/>`}
  let dest='';
  if(end&&W.length){
    const a=W[W.length-1].p,D=END_DEST[end],col=TAGHEX[end];
    let d=wpoint(D,a.x);if(d.sp&&a.sp===d.sp)d={...d,x:a.x-(a.x>200?150:-150)};
    if(d.sp==='U'||d.sp==='S')d={...d,x:Math.abs(d.x-a.x)<1&&a.sp?a.x-150:d.x};
    const lx=Math.min(WM.w-8,Math.max(8,d.x)),anchor=d.x<120?'start':d.x>WM.w-120?'end':'middle';
    const ly=d.sp==='S'?d.y+6:d.sp?d.y+6:d.y-16;
    dest=`<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${d.x.toFixed(1)}" y2="${d.y.toFixed(1)}" class="m-seg m-final" style="stroke:${col}"/>
      ${d.sp==='S'?`<path d="M${d.x} ${d.y-10} l3 7 7.5 .5 -5.8 4.8 1.9 7.3 -6.6 -4 -6.6 4 1.9 -7.3 -5.8 -4.8 7.5 -.5Z" style="fill:${col}" class="m-dest-star"/>`
        :`<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="11" class="m-dest" style="stroke:${col}"/><circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="4" style="fill:${col}"/>`}
      <text x="${lx+(anchor==='middle'?0:anchor==='start'?14:-14)}" y="${ly}" class="m-label m-destlabel" text-anchor="${anchor}" style="fill:${col}">${D.label}</text>`;
  }
  const dots=W.map(o=>`<circle cx="${o.p.x.toFixed(1)}" cy="${o.p.y.toFixed(1)}" r="${o.p.jp?4:6}" style="fill:${TAGHEX[o.l.t]}" class="m-dot"/>`
    +(o.p.jp?'':`<text x="${(o.p.x+9).toFixed(1)}" y="${(o.p.y+6).toFixed(1)}" class="m-num">${o.i+1}</text>`)).join('');
  const jpCount=W.filter(o=>o.p.jp).length;
  return `<svg class="map world" viewBox="0 0 ${WM.w} ${WM.H}" role="img" aria-label="祖先の足跡の世界地図">
    <rect width="${WM.w}" height="${WM.top}" class="m-space"/>
    <rect y="${WM.top}" width="${WM.w}" height="${WM.h-WM.top}" class="m-sea"/>
    <rect y="${WM.h}" width="${WM.w}" height="${WM.H-WM.h}" class="m-under"/>
    ${(()=>{const r=seeded(11);return [...Array(40)].map(()=>`<circle cx="${(r()*WM.w).toFixed(0)}" cy="${(4+r()*26).toFixed(1)}" r="${r()<.15?1.6:.8}" class="m-starfield"/>`).join('')})()}
    <text x="8" y="22" class="m-label m-band">宇宙</text>
    <text x="8" y="${WM.h+22}" class="m-label m-band">地の底</text>
    ${grid}${land}${seas}
    <rect x="${jx1}" y="${jy1}" width="${jx2-jx1}" height="${jy2-jy1}" class="m-jpbox"/>
    <text x="${(jx1+jx2)/2}" y="${jy2+18}" class="m-label m-jplabel" text-anchor="middle">日本${jpCount?`（${jpCount}代）`:''}</text>
    ${segs}${dest}${dots}
  </svg>`;
}
function japanMap(pts){
  const J=pts.filter(o=>o.loc&&!o.loc.sp&&inJapan(o.loc.lon,o.loc.lat)).map(o=>{const [x,y]=proj(o.loc.lon,o.loc.lat);return{...o,x,y}});
  if(!J.length)return '';
  const land=JP.map(p=>`<path d="${polyPath(p,proj)}" class="m-land"/>`).join('');
  let segs='';
  for(let k=1;k<J.length;k++)segs+=`<line x1="${J[k-1].x.toFixed(1)}" y1="${J[k-1].y.toFixed(1)}" x2="${J[k].x.toFixed(1)}" y2="${J[k].y.toFixed(1)}" class="m-seg" style="stroke:${TAGHEX[J[k].l.t]}"/>`;
  const dots=J.map(o=>`<circle cx="${o.x.toFixed(1)}" cy="${o.y.toFixed(1)}" r="5" style="fill:${TAGHEX[o.l.t]}" class="m-dot"/><text x="${(o.x+8).toFixed(1)}" y="${(o.y+4).toFixed(1)}" class="m-num m-num-s">${o.i+1}</text>`).join('');
  return `<figure class="jp-inset"><figcaption>日本付近の拡大</figcaption><svg class="map" viewBox="0 0 280 336" role="img" aria-label="日本付近の足跡"><rect width="280" height="336" class="m-sea"/>${land}${segs}${dots}</svg></figure>`;
}
function lineageMap(){
  const L=st.lineage,end=st.phase==='end'?pickEnding():null;
  if(!L.length)return '<p class="lead">まだ記録がありません。木箱を開けて、最初の問いに答えてください。</p>';
  const pts=L.map((l,i)=>({i,l,loc:locate(l.place)}));
  const label=o=>{const f=fmtYear(o.l.year);return `${f.pre}${f.num}年・${o.l.place}`};
  return `<div class="map-wrap">${worldMap(pts,end)}</div>
    <div class="map-row">${japanMap(pts)}
    <ol class="map-list">${pts.map(o=>`<li style="--c:${TAGS[o.l.t].c}"><b>${o.i+1}</b><span>${label(o)}${o.loc&&!o.loc.sp&&!inJapan(o.loc.lon,o.loc.lat)?'<em>（海外）</em>':o.loc?.sp?'<em>（地図の外）</em>':''}</span></li>`).join('')}
      ${end?`<li style="--c:${TAGS[end].c}"><b>起</b><span>${ENDINGS[end].place}<em>（${END_DEST[end].label}）</em></span></li>`:''}</ol></div>`;
}

function lineageTree(){
  const L=st.lineage,end=st.phase==='end'?pickEnding():null;
  if(!L.length)return '<p class="lead">まだ記録がありません。木箱を開けて、最初の問いに答えてください。</p>';
  const rows=L.map((l,i)=>{const f=fmtYear(l.year),next=L[i+1];
    return `<li class="t-node" style="--c:${TAGS[l.t].c};--c2:${next?TAGS[next.t].c:end?TAGS[end].c:'var(--line)'}">
      <div class="t-pic">${FX.portrait(l,l.band,46)}</div>
      <div class="t-txt"><b>${l.who}</b><span>${l.job}</span><small>${f.pre}${f.num}年・${l.place}</small></div>
      <div class="t-crest">${FX.crest(seedOf(l),'var(--c)',30)}</div></li>`}).join('');
  const root=end?`<li class="t-root" style="--c:${TAGS[end].c}">${FX.mergedCrest(L.map(seedOf),'var(--gold)',96)}<b>${ENDINGS[end].title}</b><small>${ENDINGS[end].place}</small></li>`
               :`<li class="t-root pending"><b>起源 ■■■</b><small>まだたどり着いていない</small></li>`;
  return `<ol class="tree-view">${rows}${root}</ol>`;
}
let lineTab='tree';
function renderLineage(){
  const p=document.getElementById('linePanel');
  p.innerHTML=`<div class="help-top"><div><small>${st.lineage.length}代の記録</small><h2 id="lineTitle">系譜</h2></div>
      <button class="help-close" type="button" data-close aria-label="系譜を閉じる">✕</button></div>
    <div class="help-tabs" role="tablist">${[['tree','家系図'],['map','足跡の世界地図']].map(([id,l])=>`<button class="help-tab" type="button" role="tab" data-ltab="${id}" aria-selected="${id===lineTab}">${l}</button>`).join('')}</div>
    <div class="help-body" role="tabpanel">${lineTab==='tree'?lineageTree():lineageMap()}</div>`;
}
FX.openLineage=function(tab){
  if(tab)lineTab=tab;renderLineage();
  const d=document.getElementById('lineage');d.hidden=false;document.getElementById('linePanel').focus();Sound.sfx('tap');
};
document.getElementById('lineage').addEventListener('click',e=>{
  if(e.target.closest('[data-close]')){document.getElementById('lineage').hidden=true;return}
  const t=e.target.closest('[data-ltab]');if(t){lineTab=t.dataset.ltab;renderLineage();Sound.sfx('tap')}
});
addEventListener('keydown',e=>{if(e.key==='Escape'){const d=document.getElementById('lineage');if(!d.hidden){d.hidden=true;e.stopImmediatePropagation()}}},true);

/* ---------- 7. 結末の演出 ---------- */
FX.endingFX=function(tag,done){
  if(REDUCED){done();return}
  const c=document.getElementById('fx'),x=c.getContext('2d'),d=Math.min(2,devicePixelRatio||1);
  c.width=innerWidth*d;c.height=innerHeight*d;c.hidden=false;c.style.opacity=1;
  const W=c.width,H=c.height,T=2600,t0=performance.now(),R=seeded(hashStr(tag)+Date.now());
  const parts=[...Array(tag==='書'?60:140)].map(()=>({x:R()*W,y:R()*H,v:.3+R(),s:R(),a:R()*Math.PI*2,r:R()}));
  const glyphs='渦記録血祖遡起源海星地火書印年代系譜魂命時空古夢門声';
  if(tag==='地')document.body.classList.add('quake');
  function frame(now){
    const t=Math.min(1,(now-t0)/T);x.clearRect(0,0,W,H);
    if(tag==='海'){
      const lvl=H*(1-t*1.15);
      x.fillStyle='rgba(8,40,62,.92)';x.beginPath();x.moveTo(0,H);
      for(let i=0;i<=40;i++){const px=i/40*W;x.lineTo(px,lvl+Math.sin(i*.7+now/220)*14*d)}
      x.lineTo(W,H);x.fill();
      x.fillStyle='rgba(180,230,245,.55)';
      for(const p of parts){const py=H-((now/8*p.v+p.y)%H);if(py>lvl)x.beginPath(),x.arc(p.x+Math.sin(now/300+p.a)*6*d,py,(1+p.s*3)*d,0,7),x.fill()}
    }else if(tag==='星'){
      x.fillStyle=`rgba(8,4,20,${t*.85})`;x.fillRect(0,0,W,H);
      for(const p of parts){const rad=(1-t)*(p.r*.7+.3)*Math.hypot(W,H)/2,a=p.a+t*6*(1-p.r*.5);
        x.fillStyle=`rgba(220,210,255,${.4+p.s*.6})`;x.fillRect(W/2+Math.cos(a)*rad,H/2+Math.sin(a)*rad,(1+p.s*2)*d,(1+p.s*2)*d)}
      x.fillStyle=`rgba(255,255,255,${Math.max(0,t-.8)*5})`;x.beginPath();x.arc(W/2,H/2,t*30*d,0,7);x.fill();
    }else if(tag==='地'){
      const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,`rgba(6,4,3,${Math.min(1,t*1.3)})`);g.addColorStop(Math.min(1,t*1.2),`rgba(6,4,3,${Math.min(1,t*1.3)})`);g.addColorStop(1,'rgba(6,4,3,0)');
      x.fillStyle=g;x.fillRect(0,0,W,H);
      x.fillStyle='rgba(168,132,90,.8)';for(const p of parts){const py=(p.y+now*.4*p.v*d)%H;x.fillRect(p.x,py,(2+p.s*4)*d,(2+p.s*4)*d)}
    }else if(tag==='火'){
      x.fillStyle=`rgba(40,6,2,${t*.7})`;x.fillRect(0,0,W,H);
      for(const p of parts){const life=((now/1000*p.v+p.r)%1),py=H-life*H*(.5+t),px=p.x+Math.sin(life*8+p.a)*20*d;
        x.fillStyle=`rgba(255,${(120+p.s*100)|0},40,${(1-life)*.8})`;x.beginPath();x.arc(px,py,(4+p.s*10)*(1-life)*d,0,7);x.fill()}
    }else{
      x.fillStyle=`rgba(244,241,234,${t*.9})`;x.fillRect(0,0,W,H);
      x.font=`${16*d}px "Shippori Mincho B1",serif`;x.fillStyle='rgba(22,20,15,.75)';
      for(const p of parts){const col=p.x,y=H-((now*.25*p.v*d+p.y)%(H+200*d));
        for(let k=0;k<8;k++)x.fillText(glyphs[(p.a*10+k+(now/120|0))%glyphs.length|0],col,y+k*20*d)}
    }
    if(t<1)requestAnimationFrame(frame);
    else{document.body.classList.remove('quake');c.style.opacity=0;setTimeout(()=>{c.hidden=true;x.clearRect(0,0,W,H)},600);done()}
  }
  Sound.sfx('end-'+tag);requestAnimationFrame(frame);
};

/* ---------- 8. 囁きの演出 ---------- */
FX.whisperMode=on=>document.body.classList.toggle('whisper-mode',!!on);
FX.typewrite=function(el,text,done){
  if(REDUCED){el.textContent=text;done&&done();return}
  let i=0;el.textContent='';el.classList.add('typing');
  const tick=()=>{i++;el.textContent=text.slice(0,i);if(i<text.length&&el.isConnected)timer=setTimeout(tick,text[i-1].match(/[、。…]/)?220:55);else{el.classList.remove('typing');done&&done()}};
  let timer=setTimeout(tick,300);
  el.closest('.card')?.addEventListener('click',()=>{if(i<text.length){clearTimeout(timer);i=text.length-1;tick()}},{once:true});
};

/* ---------- 9. 記録札の画像 ---------- */
FX.resultImage=async function(key){
  try{await document.fonts.ready}catch(e){}
  const E=ENDINGS[key],L=st.lineage,W=1080,H=1500,c=document.createElement('canvas');c.width=W;c.height=H;
  const x=c.getContext('2d'),css=getComputedStyle(document.documentElement),v=n=>css.getPropertyValue(n).trim();
  const bg=v('--bg')||'#0f111a',ink=v('--paper')||'#e8e1cc',gold=v('--gold')||'#c9a55c',dim=v('--dim')||'#8e8a7c';
  x.fillStyle=bg;x.fillRect(0,0,W,H);
  const g=x.createRadialGradient(W/2,330,0,W/2,330,600);g.addColorStop(0,TAGHEX[key]+'55');g.addColorStop(1,'transparent');x.fillStyle=g;x.fillRect(0,0,W,H);
  x.strokeStyle=gold;x.lineWidth=3;x.strokeRect(36,36,W-72,H-72);x.lineWidth=1;x.strokeRect(50,50,W-100,H-100);
  const M='"Shippori Mincho B1","Hiragino Mincho ProN",serif',G='"Zen Kaku Gothic New","Hiragino Sans",sans-serif',P='"IBM Plex Mono",monospace';
  x.textAlign='center';x.fillStyle=dim;x.font=`28px ${P}`;x.fillText('RECORD OF LINEAGE ・ 祖先遡行録',W/2,120);
  // 渦紋
  x.save();x.translate(W/2-160,170);x.scale(3.2,3.2);x.strokeStyle=gold;x.lineCap='round';
  L.forEach((l,i)=>{x.globalAlpha=.35+.65*(i+1)/L.length;x.lineWidth=i===L.length-1?4:2.2;x.save();x.translate(50,50);x.rotate(i*40*Math.PI/180);x.translate(-50,-50);
    crestShape(seedOf(l)).paths.forEach(d=>x.stroke(new Path2D(d)));x.restore()});
  x.restore();x.globalAlpha=1;
  x.fillStyle=dim;x.font=`30px ${G}`;x.fillText('あなたの起源は',W/2,560);
  x.fillStyle=gold;x.font=`800 76px ${M}`;x.fillText(E.title,W/2,650);
  x.fillStyle=ink;x.font=`32px ${G}`;x.fillText(`${E.pre||''}${E.num}　${E.place}`,W/2,705);
  // 系譜
  x.textAlign='left';let y=780;
  const imgs=await Promise.all(L.map(l=>new Promise(res=>{const src=ROOTS.jobIcons[l.job];if(!src)return res(null);const im=new Image();const t=setTimeout(()=>res(null),1500);im.onload=()=>{clearTimeout(t);res(im)};im.onerror=()=>{clearTimeout(t);res(null)};im.src=src})));
  L.forEach((l,i)=>{const f=fmtYear(l.year),im=imgs[i];
    if(im){x.save();x.beginPath();x.arc(120,y-10,27,0,7);x.fillStyle=bg;x.fill();x.clip();x.drawImage(im,93,y-37,54,54);x.restore();
      x.strokeStyle=TAGHEX[l.t];x.lineWidth=3;x.beginPath();x.arc(120,y-10,27,0,7);x.stroke();x.lineWidth=1}
    else{x.fillStyle=TAGHEX[l.t];x.beginPath();x.arc(120,y-10,12,0,7);x.fill()}
    x.fillStyle=dim;x.font=`24px ${P}`;x.fillText(`${f.pre}${f.num}年`,162,y);
    x.fillStyle=ink;x.font=`700 30px ${M}`;x.fillText(l.job.length>14?l.job.slice(0,14)+'…':l.job,390,y);
    x.fillStyle=dim;x.font=`22px ${G}`;x.fillText(`${l.who}・${l.place}`.slice(0,26),390,y+27);
    if(i<L.length-1){x.strokeStyle=dim;x.globalAlpha=.4;x.beginPath();x.moveTo(120,y+18);x.lineTo(120,y+32);x.stroke();x.globalAlpha=1}
    y+=60});
  // 血の配合
  const tot=Object.values(st.tags).reduce((a,b)=>a+b,0)||1;let bx=110;
  for(const k of Object.keys(TAGS)){const w=(W-220)*st.tags[k]/tot;x.fillStyle=TAGHEX[k];x.fillRect(bx,H-170,w,18);bx+=w}
  x.textAlign='center';x.fillStyle=dim;x.font=`26px ${G}`;
  x.fillText(Object.keys(TAGS).map(k=>`${k} ${Math.round(st.tags[k]/tot*100)}%`).join('　'),W/2,H-115);
  x.fillStyle=gold;x.font=`26px ${M}`;x.fillText('あなたも、渦の印の木箱を開けてみませんか',W/2,H-72);
  return c.toDataURL('image/png');
};

/* ---------- 10. 環境音と効果音（Web Audio で合成） ---------- */
const Sound=(()=>{
  let ctx=null,master=null,amb=[],timers=[],on=false,want=false,band=null,noiseBuf=null;
  try{want=localStorage.getItem('sokou-sound')==='on'}catch(e){}
  function init(){
    if(ctx)return true;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
    ctx=new AC();master=ctx.createGain();master.gain.value=.55;master.connect(ctx.destination);
    noiseBuf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    return true;
  }
  const now=()=>ctx.currentTime;
  function noise(){const s=ctx.createBufferSource();s.buffer=noiseBuf;s.loop=true;return s}
  function tone(type,freq,t0,dur,gain,out=master,glide){
    const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t0);
    if(glide)o.frequency.exponentialRampToValueAtTime(glide,t0+dur);
    g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(gain,t0+Math.min(.02,dur/4));g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    o.connect(g).connect(out);o.start(t0);o.stop(t0+dur+.05);
  }
  function bed(type,freq,gain,filterF){ // 持続音
    const g=ctx.createGain();g.gain.value=0;g.gain.linearRampToValueAtTime(gain,now()+2);
    let src;
    if(type==='noise'){src=noise();const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=filterF||800;f.Q.value=.7;src.connect(f).connect(g)}
    else{src=ctx.createOscillator();src.type=type;src.frequency.value=freq;if(filterF){const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=filterF;src.connect(f).connect(g)}else src.connect(g)}
    const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=.05+Math.random()*.1;lg.gain.value=gain*.6;lfo.connect(lg).connect(g.gain);lfo.start();
    g.connect(master);src.start();amb.push({src,g,lfo});
  }
  function every(ms,fn,jitter=0){const loop=()=>{if(!on)return;fn();timers.push(setTimeout(loop,ms+Math.random()*jitter))};timers.push(setTimeout(loop,400+Math.random()*ms/2))}
  const PENTA=[293.7,311.1,392,440,466.2,587.3,622.3,784];
  const PRESETS={
    現代:()=>{bed('sine',110,.05);bed('sine',164.8,.03)},
    近代:()=>{bed('noise',0,.018,1800);every(1000,()=>tone('square',1500,now(),.015,.03))},
    近世:()=>{bed('noise',0,.03,450);every(4200,()=>{const f=PENTA[Math.random()*PENTA.length|0];tone('triangle',f,now(),1.2,.07);tone('sine',f*2,now(),.5,.02)},3000)},
    戦国:()=>{bed('noise',0,.012,300);every(2400,()=>{tone('sine',80,now(),.7,.22,master,42);if(Math.random()<.4)tone('sine',80,now()+.3,.5,.12,master,45)},600)},
    中世:()=>{bed('noise',0,.02,600);every(5200,()=>{const f=[293.7,349.2,392,440][Math.random()*4|0];tone('sine',f,now(),2.4,.05);tone('sine',f*1.004,now(),2.4,.03)},2500)},
    古代:()=>{[440,493.9,659.3,740,880].forEach((f,i)=>bed('sine',f*(1+(i%2?.002:-.002)),.012))},
    弥生:()=>{bed('noise',0,.016,3500);every(380,()=>tone('sine',1100+Math.random()*1200,now(),.08,.025),900)},
    太古:()=>{bed('sawtooth',55,.035,180);bed('noise',0,.025,350)},
    終焉:()=>{bed('noise',0,.03,1400);bed('sine',1760,.006)},
    'end-海':()=>{bed('noise',0,.05,500);bed('sine',73.4,.05)},
    'end-星':()=>{[523.3,659.3,784,987.8].forEach(f=>bed('sine',f,.012))},
    'end-地':()=>{bed('sawtooth',41.2,.05,120)},
    'end-火':()=>{bed('noise',0,.04,900);bed('sawtooth',65.4,.025,240)},
    'end-書':()=>{bed('sine',261.6,.02);every(1400,()=>tone('sine',2093,now(),.4,.015),800)}
  };
  function stopAmb(){timers.forEach(clearTimeout);timers=[];
    amb.forEach(a=>{try{a.g.gain.cancelScheduledValues(now());a.g.gain.linearRampToValueAtTime(0,now()+.8);a.src.stop(now()+.9);a.lfo.stop(now()+.9)}catch(e){}});amb=[]}
  function start(){if(!init())return false;ctx.resume&&ctx.resume();on=true;if(band)play(band);return true}
  function play(b){band=b;if(!on)return;stopAmb();(PRESETS[b]||PRESETS.現代)()}
  const SFX={
    tap:()=>tone('sine',1200,now(),.05,.04),
    reveal:()=>{tone('sine',660,now(),.9,.06);tone('sine',990,now()+.08,.9,.04)},
    ok:()=>{tone('sine',880,now(),.5,.09);tone('sine',1318.5,now()+.12,.7,.09)},
    ng:()=>tone('square',130,now(),.35,.06,master,90),
    merge:()=>{for(let i=0;i<9;i++)tone('sine',220*Math.pow(2,i/6),now()+i*.09,.6,.04)},
    whisper:()=>{const s=noise(),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='bandpass';f.frequency.value=1200;f.Q.value=3;
      g.gain.setValueAtTime(0,now());g.gain.linearRampToValueAtTime(.08,now()+.6);g.gain.linearRampToValueAtTime(0,now()+2.2);s.connect(f).connect(g).connect(master);s.start();s.stop(now()+2.3)},
    warp:dur=>{const s=noise(),f=ctx.createBiquadFilter(),g=ctx.createGain(),T=(dur||1300)/1000;f.type='bandpass';f.Q.value=2;
      f.frequency.setValueAtTime(2400,now());f.frequency.exponentialRampToValueAtTime(160,now()+T);
      g.gain.setValueAtTime(0,now());g.gain.linearRampToValueAtTime(.12,now()+T*.3);g.gain.linearRampToValueAtTime(0,now()+T);s.connect(f).connect(g).connect(master);s.start();s.stop(now()+T+.1)},
    'end-海':()=>SFX.warp(2600),'end-星':()=>{for(let i=0;i<12;i++)tone('sine',523.3*Math.pow(2,i/12),now()+i*.18,1,.03)},
    'end-地':()=>tone('sine',60,now(),2.4,.25,master,30),'end-火':()=>{const s=noise(),g=ctx.createGain();g.gain.setValueAtTime(.12,now());g.gain.linearRampToValueAtTime(0,now()+2.4);s.connect(g).connect(master);s.start();s.stop(now()+2.5)},
    'end-書':()=>{for(let i=0;i<20;i++)tone('square',800+Math.random()*1600,now()+i*.11,.03,.02)}
  };
  return{
    get on(){return on},
    toggle(){if(on){on=false;stopAmb();ctx&&ctx.suspend&&ctx.suspend()}else start();try{localStorage.setItem('sokou-sound',on?'on':'off')}catch(e){}return on},
    ambient(b){play(b)},
    sfx(name,arg){if(!on||!ctx)return;try{(SFX[name]||(()=>{}))(arg)}catch(e){}},
    wanted:()=>want,start
  };
})();
function syncSoundBtn(){const b=document.getElementById('sndBtn');b.setAttribute('aria-pressed',Sound.on);b.textContent=Sound.on?'音 入':'音 切'}
document.getElementById('sndBtn').addEventListener('click',()=>{Sound.toggle();syncSoundBtn();Sound.sfx('tap')});
if(Sound.wanted())addEventListener('pointerdown',function first(){removeEventListener('pointerdown',first);if(!Sound.on){Sound.start();syncSoundBtn()}},{once:true});
document.getElementById('lineBtn').addEventListener('click',()=>FX.openLineage());
