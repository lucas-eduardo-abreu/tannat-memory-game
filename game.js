/* ============================================================
   TANNAT · Jogo da Memória  —  lógica do jogo
   Vanilla JS, sem dependências. Ícones vetoriais inline.
   ============================================================ */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- goblet (marca) ---------- */
const GOBLET = `<svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M24 14h52a4 4 0 0 1 4 4v10a30 30 0 0 1-60 0V18a4 4 0 0 1 4-4Z" stroke="currentColor" stroke-width="5.5" stroke-linejoin="round"/>
  <path d="M36 30q14 16 28 0" stroke="currentColor" stroke-width="5.5" stroke-linecap="round"/>
  <path d="M50 58v34" stroke="currentColor" stroke-width="5.5" stroke-linecap="round"/>
  <path d="M30 98h40" stroke="currentColor" stroke-width="5.5" stroke-linecap="round"/>
</svg>`;

/* ---------- goblet usado na marca / dificuldade ---------- */
const ICONS = {
  goblet: `<path d="M7 3h10v3a5 5 0 0 1-10 0z"/><path d="M12 14v6"/><path d="M8 21h8"/>`,
};

/* ---------- baralho de cartas (fotos em assets/cards) ----------
   16 imagens disponíveis; cada dificuldade sorteia aleatoriamente
   quantos pares precisar (6/8/12) a cada partida.                */
const CARD_IMAGES = Array.from({ length: 16 }, (_, i) => `assets/cards/${i + 1}.png`);

/* ---------- config ---------- */
const DIFFS = {
  easy:   { label: "Fácil",   pairs: 6,  cols: 3, time: 60,  maxCell: 200 },
  medium: { label: "Médio",   pairs: 8,  cols: 4, time: 90,  maxCell: 176 },
  hard:   { label: "Difícil", pairs: 12, cols: 6, time: 120, maxCell: 148 },
};
const FLIP_BACK_MS = 700;

/* ---------- estado ---------- */
const S = { diff:null, pairs:0, cols:0, found:0, moves:0, first:null, lock:false,
            timeLeft:0, total:0, end:0, timer:null, idle:null };

/* ---------- telas ---------- */
const scr = {
  start:$("#screen-start"), select:$("#screen-select"), game:$("#screen-game"),
  win:$("#screen-win"), lose:$("#screen-lose"),
};
function show(name){
  $$(".screen").forEach(s=>s.classList.remove("screen--active"));
  scr[name].classList.add("screen--active");
}

/* ---------- utils ---------- */
const shuffle = a => { for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];} return a; };
const fmt = s => { s=Math.max(0,s|0); return `${String((s/60)|0).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`; };

/* ============================================================
   SOM (WebAudio — sem arquivos)
   ============================================================ */
let AC=null, soundOn = localStorage.getItem("tannat_sound")!=="off";
function ac(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return AC; }
function tone(freq, dur=.12, type="sine", vol=.16, when=0){
  if(!soundOn) return; const c=ac(); if(!c) return;
  const t=c.currentTime+when, o=c.createOscillator(), g=c.createGain();
  o.type=type; o.frequency.value=freq; o.connect(g); g.connect(c.destination);
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.01);
  g.gain.exponentialRampToValueAtTime(.0001,t+dur); o.start(t); o.stop(t+dur+.02);
}
const sfx = {
  flip:  ()=>tone(420,.09,"triangle",.10),
  match: ()=>{ tone(587,.12,"sine",.15); tone(880,.16,"sine",.13,.09); },
  wrong: ()=>tone(150,.18,"sawtooth",.08),
  win:   ()=>[523,659,784,1046].forEach((f,i)=>tone(f,.28,"triangle",.16,i*.1)),
  lose:  ()=>[392,330,262].forEach((f,i)=>tone(f,.3,"sine",.14,i*.13)),
  click: ()=>tone(660,.06,"square",.07),
};
function syncSoundBtns(){
  const on = soundOn;
  $$("#btn-sound,#btn-sound-2").forEach(b=>{
    b.innerHTML = on
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>`;
    b.setAttribute("aria-pressed", String(on));
  });
}
function toggleSound(){ soundOn=!soundOn; localStorage.setItem("tannat_sound", soundOn?"on":"off"); if(soundOn){ac()&&sfx.click();} syncSoundBtns(); }

/* ============================================================
   RECORDES + RANKING DA SESSÃO (localStorage)
   ============================================================ */
const BEST_KEY = d => `tannat_best_${d}`;
const RANK_KEY = d => `tannat_rank_${d}`;
const loadBest = d => { const v=localStorage.getItem(BEST_KEY(d)); return v!=null?+v:null; };
function saveBest(d, secs){ const b=loadBest(d); if(b==null||secs<b){ localStorage.setItem(BEST_KEY(d), secs); return true; } return false; }
const loadRank = d => { try{ return JSON.parse(localStorage.getItem(RANK_KEY(d)))||[]; }catch{ return []; } };
function saveRank(d, entry){
  const list=loadRank(d); list.push(entry);
  list.sort((a,b)=> a.time-b.time || a.moves-b.moves);
  const top=list.slice(0,8); localStorage.setItem(RANK_KEY(d), JSON.stringify(top));
  return top.indexOf(entry);
}

/* ============================================================
   SELEÇÃO DE DIFICULDADE
   ============================================================ */
const GLASS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS.goblet}</svg>`;
function buildSelect(){
  const grid=$("#diff-grid"); grid.innerHTML="";
  Object.entries(DIFFS).forEach(([key,cfg],idx)=>{
    const best=loadBest(key);
    const glasses = Array.from({length:3},(_,i)=>`<span class="${i<=idx?'':'dim'}">${GLASS}</span>`).join("");
    const el=document.createElement("button");
    el.className="diff"; el.dataset.diff=key; el.type="button";
    el.innerHTML = `
      <div class="diff__glasses" aria-hidden="true">${glasses}</div>
      <div class="diff__name">${cfg.label}</div>
      <div class="diff__meta"><span><b>${cfg.pairs}</b> pares</span><span><b>${cfg.cols}×${Math.ceil(cfg.pairs*2/cfg.cols)}</b></span><span><b>${cfg.time}s</b></span></div>
      <div class="diff__best">${best!=null?`Recorde · ${fmt(best)}`:"Sem recorde ainda"}</div>`;
    el.addEventListener("click", ()=>{ sfx.click(); startGame(key); });
    grid.appendChild(el);
  });
}

/* ============================================================
   TABULEIRO
   ============================================================ */
function startGame(diff){
  const cfg=DIFFS[diff];
  Object.assign(S,{diff,pairs:cfg.pairs,cols:cfg.cols,found:0,moves:0,first:null,lock:false,total:cfg.time,timeLeft:cfg.time});

  $("#hud-diff").textContent=cfg.label;
  $("#hud-pairs").textContent=`0/${cfg.pairs}`;
  $("#hud-moves").textContent="0";
  $("#hud-time").textContent=fmt(cfg.time);
  $("#timer-fill").style.width="100%";
  $("#timer").classList.remove("is-low");

  const board=$("#board");
  board.className="board board--"+diff;
  board.innerHTML="";
  board.style.pointerEvents="auto";

  const picks=shuffle([...CARD_IMAGES]).slice(0,cfg.pairs);
  const deck=shuffle(picks.flatMap(k=>[{k},{k}]));

  deck.forEach(({k})=>{
    const card=document.createElement("div");
    card.className="card"; card.dataset.k=k; card.tabIndex=0; card.setAttribute("role","gridcell");
    card.innerHTML=`
      <div class="card__inner">
        <div class="card__face card__face--back"><div class="card-goblet">${GOBLET}</div></div>
        <div class="card__face card__face--front"><img class="card-img" src="${k}" alt="" draggable="false"></div>
      </div>`;
    const act=()=>flip(card);
    card.addEventListener("click",act);
    card.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); act(); } });
    board.appendChild(card);
  });

  stopTimer();
  show("game");
  requestAnimationFrame(fitBoard);
}

/* Calcula o tamanho da célula (quadrada) para caber sem scroll,
   em qualquer tela — celular, desktop ou totem. */
function fitBoard(){
  if(!S.diff) return;
  const board=$("#board");
  const cfg=DIFFS[S.diff];
  const cols=cfg.cols, total=cfg.pairs*2, rows=Math.ceil(total/cols);
  const cs=getComputedStyle(board);
  const gap=parseFloat(cs.rowGap||cs.gap)||12;
  const w=board.clientWidth, h=board.clientHeight;
  const cellW=(w-(cols-1)*gap)/cols;
  const cellH=(h-(rows-1)*gap)/rows;
  const cell=Math.max(44, Math.min(cellW, cellH, cfg.maxCell));
  document.documentElement.style.setProperty("--cell-size", Math.floor(cell)+"px");
}

function flip(card){
  if(S.lock || card.classList.contains("flipped") || card.classList.contains("matched")) return;
  card.classList.add("flipped"); sfx.flip();
  if(!S.timer) startTimer();

  if(!S.first){ S.first=card; return; }

  S.moves++; $("#hud-moves").textContent=S.moves;
  const match = S.first.dataset.k===card.dataset.k;

  if(match){
    const a=S.first, b=card; S.first=null; S.found++;
    $("#hud-pairs").textContent=`${S.found}/${S.pairs}`;
    setTimeout(()=>{ a.classList.add("matched"); b.classList.add("matched"); sfx.match(); },160);
    if(S.found===S.pairs){ stopTimer(); setTimeout(win,520); }
  } else {
    S.lock=true;
    const a=S.first, b=card;
    a.classList.add("wrong"); b.classList.add("wrong"); sfx.wrong();
    setTimeout(()=>{
      a.classList.remove("flipped","wrong"); b.classList.remove("flipped","wrong");
      S.first=null; S.lock=false;
    }, FLIP_BACK_MS);
  }
}

/* ---------- timer ---------- */
function startTimer(){
  S.end=Date.now()+S.timeLeft*1000;
  S.timer=setInterval(()=>{
    S.timeLeft=Math.max(0,Math.ceil((S.end-Date.now())/1000));
    $("#hud-time").textContent=fmt(S.timeLeft);
    const pct=S.timeLeft/S.total; $("#timer-fill").style.width=(pct*100)+"%";
    $("#timer").classList.toggle("is-low", pct<=0.25);
    if(S.timeLeft<=0){ stopTimer(); lose(); }
  },250);
}
function stopTimer(){ clearInterval(S.timer); S.timer=null; }

/* ---------- vitória ---------- */
function win(){
  const elapsed=S.total-S.timeLeft;
  const record=saveBest(S.diff, elapsed);
  const best=loadBest(S.diff);

  $("#win-time").textContent=fmt(elapsed);
  $("#win-moves").textContent=S.moves;
  $("#win-best").textContent=fmt(best);
  const rec=$("#win-record");
  if(record){ rec.hidden=false; $("#win-record-txt").textContent="🏆 Novo recorde!"; }
  else rec.hidden=true;

  // reseta bloco de nome/ranking
  $("#name-row").style.display="flex";
  $("#ranks").hidden=true;
  $("#win-name").value="";
  win._pending={diff:S.diff, time:elapsed, moves:S.moves};

  show("win");
  sfx.win();
  startConfetti();
}

function commitName(){
  const p=win._pending; if(!p) return;
  const name=($("#win-name").value.trim()||"Convidado").slice(0,14);
  const entry={name, time:p.time, moves:p.moves, ts:Date.now()};
  const pos=saveRank(p.diff, entry);
  renderRanks(p.diff, entry);
  $("#name-row").style.display="none";
  sfx.click();
}
function renderRanks(diff, me){
  const list=loadRank(diff);
  const ol=$("#ranks-list"); ol.innerHTML="";
  list.forEach((r,i)=>{
    const li=document.createElement("li");
    if(me && r.ts===me.ts) li.classList.add("me");
    li.innerHTML=`<span class="pos">${i+1}</span><span class="nm">${escapeHTML(r.name)}</span><span class="tm">${fmt(r.time)}</span>`;
    ol.appendChild(li);
  });
  $("#ranks").hidden=false;
}
const escapeHTML = s => s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ---------- derrota ---------- */
function lose(){
  S.lock=true; $("#board").style.pointerEvents="none";
  $("#lose-pairs").textContent=`${S.found}/${S.pairs}`;
  $("#lose-moves").textContent=S.moves;
  show("lose"); sfx.lose();
}

/* ============================================================
   NAVEGAÇÃO
   ============================================================ */
$("#btn-play").addEventListener("click",()=>{ ac(); sfx.click(); buildSelect(); show("select"); });
$("#btn-back-start").addEventListener("click",()=>{ sfx.click(); show("start"); });
$("#btn-exit").addEventListener("click",()=>{ stopTimer(); sfx.click(); buildSelect(); show("select"); });

$("#btn-again").addEventListener("click",()=>{ stopConfetti(); sfx.click(); startGame(S.diff); });
$("#btn-menu").addEventListener("click",()=>{ stopConfetti(); stopTimer(); sfx.click(); show("start"); });
$("#btn-retry").addEventListener("click",()=>{ sfx.click(); startGame(S.diff); });
$("#btn-lose-menu").addEventListener("click",()=>{ stopTimer(); sfx.click(); show("start"); });

$("#btn-save-name").addEventListener("click",commitName);
$("#win-name").addEventListener("keydown",e=>{ if(e.key==="Enter") commitName(); });

$("#btn-sound").addEventListener("click",toggleSound);
$("#btn-sound-2").addEventListener("click",toggleSound);

/* fullscreen */
$("#btn-fs").addEventListener("click",()=>{
  sfx.click();
  if(!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
});

/* ---------- exit por teclado (Esc) ---------- */
document.addEventListener("keydown",e=>{
  if(e.key==="Escape" && scr.game.classList.contains("screen--active")){ stopTimer(); buildSelect(); show("select"); }
});

/* ============================================================
   ATTRACT MODE (totem) — pulsa a dica após inatividade
   ============================================================ */
function resetIdle(){
  document.body.classList.remove("attract");
  clearTimeout(S.idle);
  S.idle=setTimeout(()=>{
    if(scr.start.classList.contains("screen--active")) document.body.classList.add("attract");
  }, 25000);
}
["click","keydown","touchstart","mousemove"].forEach(ev=>window.addEventListener(ev,resetIdle,{passive:true}));

/* refit do tabuleiro ao redimensionar / girar / tela cheia */
let fitT;
function onResize(){ clearTimeout(fitT); fitT=setTimeout(()=>{ if(scr.game.classList.contains("screen--active")) fitBoard(); },120); }
window.addEventListener("resize", onResize);
window.addEventListener("orientationchange", ()=>setTimeout(fitBoard,250));
document.addEventListener("fullscreenchange", ()=>setTimeout(fitBoard,150));

/* ============================================================
   BOOT
   ============================================================ */
$("#brand-goblet").innerHTML=GOBLET;
$("#rule-goblet").innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS.goblet}</svg>`;
syncSoundBtns();
buildSelect();
resetIdle();
show("start");

/* ============================================================
   CONFETE — ouro + prata (disco) + vinho
   ============================================================ */
let cRAF=null, parts=[], cStart=0;
const C_COLORS=["#f0d27f","#e3b95a","#f7e6ad","#cfd3da","#e9edf2","#9a1f27","#ee6f87"];
const C_COUNT=280, C_MS=6500, C_G=0.13, C_DRAG=0.995;
const canvas=()=>$("#confetti");
function resizeC(){ const c=canvas(); if(!c) return; const d=Math.max(1,devicePixelRatio||1);
  c.width=c.clientWidth*d|0; c.height=c.clientHeight*d|0; c.getContext("2d").setTransform(d,0,0,d,0,0); }
function mkPart(w){ const a=Math.random()*Math.PI*2, s=3+Math.random()*6;
  return {x:Math.random()*w,y:-20+Math.random()*40,vx:Math.cos(a)*s*.6,vy:Math.sin(a)*s*.2,
    size:5+Math.random()*8,rot:Math.random()*6.28,vr:(Math.random()-.5)*.25,
    color:C_COLORS[(Math.random()*C_COLORS.length)|0],rect:Math.random()<.55}; }
function startConfetti(){ const c=canvas(); if(!c) return; resizeC();
  parts=Array.from({length:C_COUNT},()=>mkPart(c.clientWidth)); cStart=performance.now();
  cancelAnimationFrame(cRAF); tickC(); }
function stopConfetti(){ cancelAnimationFrame(cRAF); cRAF=null; const c=canvas(); if(c) c.getContext("2d").clearRect(0,0,c.width,c.height); }
function tickC(ts){ const c=canvas(); if(!c) return; const ctx=c.getContext("2d"), w=c.clientWidth, h=c.clientHeight;
  if(ts && ts-cStart>C_MS){ stopConfetti(); return; }
  ctx.clearRect(0,0,c.width,c.height);
  for(const p of parts){
    p.vx*=C_DRAG; p.vy=p.vy*C_DRAG+C_G; p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr;
    if(p.y>h+20){ p.y=-20; p.x=Math.random()*w; p.vy=1+Math.random()*2; }
    ctx.save(); ctx.globalAlpha=.85; ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle=p.color;
    if(p.rect) ctx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);
    else { ctx.beginPath(); ctx.arc(0,0,p.size*.5,0,6.28); ctx.fill(); }
    ctx.restore();
  }
  cRAF=requestAnimationFrame(tickC);
}
window.addEventListener("resize",()=>{ if(scr.win.classList.contains("screen--active")) resizeC(); });
