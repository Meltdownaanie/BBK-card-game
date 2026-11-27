/* ===================== CLASSIC + (Standard-mode UI on the Classic page) =====================
   Loaded only by index.html (build_standard.py strips it from standard.html). Rules stay Classic:
   no effect cards, 100 HP. What it adds, same as Standard:
   - the AI's empty slot is not revealed while planning (face-down like the others)
   - winner discards with a double tap (tutorial keeps single tap)
   - lost / tied round: the randomly discarded card is shown before it flies to the pile
   - fanned hand
   - 7 7 7: the jackpot animation (7 HEAVEN WIN, coin rain)
   - battle log (≡ on the left edge of the board): every slot, combo and the round's damage / HP */
(function(){
if(window.Std184)return;
const CL={hist:[],cur:null,tap:{i:-1,t:0},loss:false};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---- empty AI slot stays face-down while planning ---- */
const rs0=renderSlots;
renderSlots=function(){rs0.apply(this,arguments);if(S.phase!=='plan'||TUT.on)return;for(let i=0;i<3;i++){const sl=$('slot1'+i);if(!sl||S.slots[1][i]||isBlocked(1,i))continue;
 sl.innerHTML='<div class="card back" aria-label="Face-down AI card"></div>'}};

/* ---- fanned hand + log button position after every hand render ---- */
function clFan(){const h=$('hand');if(!h)return;const it=[...h.children],n=it.length,many=h.dataset.many==='1';it.forEach((el,i)=>{const k=i-(n-1)/2,a=Math.abs(k);el.style.setProperty('--r',(many?0:k*6)+'deg');el.style.setProperty('--y',(many?0:Math.round(3.5*a*a))+'px')})}
const rh0=renderHand;
renderHand=function(){const r=rh0.apply(this,arguments);clFan();clLogPos();return r};

/* ---- double tap to discard ---- */
const gt0=guideText;
guideText=function(){const t=gt0.apply(this,arguments);return t==='Round won · tap one of your played cards to discard it'?'Round won · double-tap a played card to discard it':t};
document.addEventListener('click',e=>{
 if(TUT.on||S.phase!=='discard'||!S.canPick)return;const sl=e.target.closest&&e.target.closest('.slot.mine');if(!sl||!sl.querySelector('.card'))return;
 const i=+sl.id.slice(-1),now=performance.now();
 if(CL.tap.i===i&&now-CL.tap.t<450){CL.tap={i:-1,t:0};return}
 CL.tap={i,t:now};e.stopPropagation();e.preventDefault();
 document.querySelectorAll('.slot.mine .card.tap1').forEach(c=>c.classList.remove('tap1'));const c=sl.querySelector('.card');c.classList.add('tap1');setTimeout(()=>c.classList.remove('tap1'),460);
 msg('Double-tap a card to discard it')},true);

/* ---- lost / tied round: show which played card is discarded ---- */
const cds0=completeDiscardSelection;
completeDiscardSelection=function(timedOut){
 if(TUT.on||timedOut||CL.loss||S.phase!=='discard'||S.canPick)return cds0.apply(this,arguments);
 const i=S.pickIdx[0],el=i!==null&&i!==undefined&&$('slot0'+i)&&$('slot0'+i).querySelector('.card');if(!el)return cds0.apply(this,arguments);
 CL.loss=true;const tok=S.token,lost=S.result&&S.result.winner===1;
 document.querySelectorAll('.slot.mine .card').forEach(c=>{if(c!==el)c.classList.add('std-keep')});
 el.classList.add('std-lossdisc');const tag=stdTag('DISCARD',el,'loss low');
 msg((lost?'Round lost':'Draw')+': your '+cardName(S.slots[0][i])+' is discarded.');
 setTimeout(()=>{tag.remove();document.querySelectorAll('.slot.mine .card.std-keep').forEach(c=>c.classList.remove('std-keep'));el.classList.remove('std-lossdisc');CL.loss=false;
  if(tok===S.token)cds0.call(this,timedOut)},reducedMotion()?250:480)};

/* ---- 7 7 7: jackpot animation instead of the old banner ---- */
const cc0=celebrateCombo;
celebrateCombo=function(kind,player,description,token){if(kind==='pack'&&!TUT.on)return stdJackpot(player,token);return cc0.apply(this,arguments)};

/* ---- battle log ---- */
const card=c=>c?{suit:c.suit,n:c.n}:null;
const ce0=countCombo;
countCombo=function(p,name){if(CL.cur)CL.cur.combos.push([p,name]);return ce0.apply(this,arguments)};
const er0=endReveal;
endReveal=async function(wins,outcomes){
 if(TUT.on)return er0.apply(this,arguments);
 const slots=[0,1,2].map(i=>({i,me:card(S.slots[0][i]),ai:card(S.slots[1][i])})).filter(x=>x.me||x.ai);
 const rec={round:S.round,slots:slots.map((x,k)=>Object.assign(x,{o:outcomes[k]||null})),wins:[wins[0],wins[1]],start:[S.roundHpStart[0],S.roundHpStart[1]],combos:[],end:null,disc:null};
 CL.hist.push(rec);CL.cur=rec;
 try{return await er0.apply(this,arguments)}finally{CL.cur=null;rec.end=[S.hp[0],S.hp[1]];clLogNew()}};
const fr0=finishRound;
finishRound=function(){const h=CL.hist[CL.hist.length-1];if(h&&h.round===S.round&&S.phase==='discard'&&!S.canPick){const i=S.pickIdx[0];if(i!==null&&i!==undefined)h.disc=card(S.slots[0][i])}return fr0.apply(this,arguments)};
const ng0=newGame;
newGame=function(){CL.hist=[];CL.cur=null;const b=$('stdLogBtn');if(b)b.classList.remove('new');clLogToggle(false);return ng0.apply(this,arguments)};

const SUITN={hammer:'Hammer',paper:'Paper',scissors:'Scissors'};
function clChip(c){return c?'<span class="lg-card '+c.suit+'">'+SUITS[c.suit].icon+'<b>'+c.n+'</b></span>':'<span class="lg-card none">—</span>'}
const COMBO={'777':['7 7 7','won the match with three sevens'],'000':['ZERO TO HERO','locks one opponent slot next round'],'CHARGE!!!':['CHARGE!!!','draws 2 cards next round'],'MESS UP!!!':['MESS UP!!!','a random card from the opponent\'s hand goes back into the deck']};
function clRow(x){const o=x.o||{},who=o.w===0?'me':o.w===1?'ai':'tie';
 const res=o.w<0?'<span class="fxt num">TIE</span>':(o.direct?'DIRECT HIT ':'')+(o.w===0?'<span class="lg-who me">YOU</span> deal':'<span class="lg-who ai">AI</span> deals')+' <span class="fxt bonus">'+o.dmg+'</span>';
 return '<div class="lg-row cl-slot '+who+'">'+clChip(x.me)+'<span class="cl-vs">VS</span>'+clChip(x.ai)+'<div class="lg-main"><div class="lg-cap">SLOT '+(x.i+1)+(x.me?' · '+SUITN[x.me.suit]+' '+x.me.n:' · empty')+' vs '+(x.ai?SUITN[x.ai.suit]+' '+x.ai.n:'empty')+'</div><div class="lg-txt">'+res+'</div></div></div>'}
function clRound(h){
 const deal=Math.max(0,h.start[1]-(h.end?h.end[1]:S.hp[1])),take=Math.max(0,h.start[0]-(h.end?h.end[0]:S.hp[0])),hp=h.end||S.hp;
 let html='<h4>ROUND '+h.round+'</h4><div class="lg-sum"><span class="lg-chip deal">DEALT '+deal+'</span><span class="lg-chip take">TAKEN '+take+'</span><span class="lg-chip">'+h.wins[0]+' – '+h.wins[1]+'</span><span class="lg-hp">HP <b class="me">'+Math.max(0,hp[0])+'</b> / <b class="ai">'+Math.max(0,hp[1])+'</b></span></div>';
 html+=h.slots.map(clRow).join('');
 if(h.wins[0]===3||h.wins[1]===3){const p=h.wins[0]===3?0:1;html+='<div class="lg-row cl-combo '+(p?'ai':'me')+'"><div class="lg-main"><div class="lg-cap"><span class="lg-who">'+(p?'AI':'YOU')+'</span> · PERFECT SWEEP</div><div class="lg-txt">Won all 3 slots: <span class="fxt bonus">+5</span> bonus damage</div></div></div>'}
 html+=h.combos.map(([p,n])=>{const d=COMBO[n]||[n,''];return '<div class="lg-row cl-combo '+(p?'ai':'me')+'"><div class="lg-main"><div class="lg-cap"><span class="lg-who">'+(p?'AI':'YOU')+'</span> · COMBO</div><div class="lg-txt"><span class="fxt bonus">'+esc(d[0])+'</span> '+esc(d[1])+'</div></div></div>'}).join('');
 if(h.disc)html+='<p class="cl-disc">Your discard: '+SUITN[h.disc.suit]+' '+h.disc.n+'</p>';
 return html}
function clLogRender(){const box=$('stdLogBody');if(!box)return;box.innerHTML=CL.hist.length?CL.hist.slice(-3).reverse().map(clRound).join(''):'<p class="std-log-empty">No rounds played yet.</p>'}
function clLogNew(){const b=$('stdLogBtn');if(b&&$('stdLog').hidden)b.classList.add('new');if(!$('stdLog').hidden)clLogRender()}
function clLogToggle(open){const ov=$('stdLog'),b=$('stdLogBtn');if(!ov||!b)return;const show=open===undefined?ov.hidden:open;if(show){clLogRender();b.classList.remove('new')}ov.hidden=!show;b.classList.toggle('open',show);b.setAttribute('aria-expanded',show?'true':'false')}
function clLogPos(){const b=$('stdLogBtn'),v=$('vs0'),bd=document.querySelector('.board');if(!b)return;
 if(!v||!bd||TUT.on||S.round<1||S.phase==='idle'){b.hidden=true;return}const r=v.getBoundingClientRect(),br=bd.getBoundingClientRect();b.style.left=Math.max(2,br.left+2)+'px';b.style.top=(r.top+r.height/2-11)+'px';b.hidden=false}
function clLogInit(){
 const ov=document.createElement('div');ov.className='overlay std-modal std-logov';ov.id='stdLog';ov.hidden=true;
 ov.innerHTML='<section class="std-modal-box" role="dialog" aria-modal="true" aria-labelledby="stdLogTitle"><div class="std-log-h"><h3 id="stdLogTitle">BATTLE LOG</h3><button type="button" id="stdLogClose" aria-label="Close">✕</button></div><div id="stdLogBody"></div></section>';
 document.body.appendChild(ov);
 const b=document.createElement('button');b.type='button';b.id='stdLogBtn';b.hidden=true;b.setAttribute('aria-label','Battle log');b.setAttribute('aria-expanded','false');b.innerHTML='<span aria-hidden="true">≡</span>';document.body.appendChild(b);
 b.addEventListener('click',()=>clLogToggle());
 ov.addEventListener('click',e=>{if(e.target===ov||e.target.closest('#stdLogClose'))clLogToggle(false)});
 addEventListener('resize',clLogPos);setInterval(clLogPos,700)}
clLogInit();
window.__CL={CL,log:clLogToggle};
