//@@HELPERS
/* ===================== STANDARD MODE (TEST BUILD) ===================== */
const C=window.Std184;
const STD={hist:[],tap:{i:-1,t:0},h9show:[false,false],h9was:[false,false],anim:0,fxNew:new Set(),g:null,mine:0,theirs:0,theirName:'',level:'expert',aiRow:null,ctx:null,rows:null,lastLog:[]};
const OBJ=[{},{}];
function objOf(p,c){return OBJ[p][c]||(OBJ[p][c]={id:`${p}-${ORDER[C.S(c)]}-${C.N(c)}`,suit:ORDER[C.S(c)],n:C.N(c),origin:'hand'})}
const intOf=o=>ORDER.indexOf(o.suit)*10+o.n;
const ownerOf=o=>String(o.id).charAt(0)==='1'?1:0;
const esc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
function stdActive(p,c){return !!STD.g&&(STD.g.active[p]&C.bit(c))!==0}
function stdCls(o){if(!STD.g||!/^[01]-/.test(String(o.id)))return '';const c=intOf(o),p=ownerOf(o);if(c===9&&STD.g.h9[p]&&!STD.h9show[p])return '';return stdActive(p,c)?'fx fx-t'+(C.tier(c)+1):''}
function stdStar(o){return stdCls(o)?'<i class="fx-stars" aria-hidden="true">'+'<b>★</b>'.repeat(C.tier(intOf(o))+1)+'</i>':''}
function stdTitle(o){return ''}
/* Effect tooltip: finger down on an effect card (or mouse hover) shows what the card does. A quick tap still plays the card; a long hold only reads it. */
const stdTip={timer:0,el:null,card:null,t0:0,x:0,y:0,moved:false,block:false};
function stdTipHide(){if(stdTip.el)stdTip.el.hidden=true;stdTip.card=null}
function stdTipFind(x,y){const t=document.elementFromPoint(x,y);return t&&t.closest?t.closest('.card.fx'):null}
function stdTipShow(card){
 const m=/^([01])-([a-z]+)-(\d)$/.exec(card.dataset.id||'');if(!m)return;const c=ORDER.indexOf(m[2])*10+ +m[3],f=C.FX[c];if(!f)return;
 let el=stdTip.el;if(!el){el=stdTip.el=document.createElement('div');el.id='stdTip';el.setAttribute('role','tooltip');document.body.appendChild(el)}
 const t=C.tier(c)+1;el.className='std-tip t'+t;el.innerHTML='<b>'+esc(C.VI(c))+'<span>'+'★'.repeat(t)+' TIER '+t+'</span></b><i>'+esc(f[0])+'</i><p>'+esc(f[1])+'</p>';el.hidden=false;
 const r=card.getBoundingClientRect(),w=el.offsetWidth,h=el.offsetHeight;let top=r.top-h-12;if(top<6)top=Math.min(innerHeight-h-6,r.bottom+12);
 el.style.left=Math.max(6,Math.min(innerWidth-w-6,r.left+r.width/2-w/2))+'px';el.style.top=Math.max(6,top)+'px';stdTip.card=card}
function stdTipInit(){
 // Touch: tap and drag work exactly like Classic. The effect panel only opens after the finger rests on a card for a moment without moving.
 const HOLD=280;
 document.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;clearTimeout(stdTip.timer);stdTip.block=false;stdTipHide();const card=stdTipFind(e.clientX,e.clientY);if(!card)return;
  stdTip.t0=performance.now();stdTip.x=e.clientX;stdTip.y=e.clientY;stdTip.moved=false;stdTip.timer=setTimeout(()=>{if(!stdTip.moved&&document.contains(card))stdTipShow(card)},HOLD)},true);
 document.addEventListener('pointermove',e=>{
  if(e.pointerType==='mouse'){if(e.buttons){stdTipHide();return}const card=stdTipFind(e.clientX,e.clientY);if(card!==stdTip.card){if(card)stdTipShow(card);else stdTipHide()}return}
  if(!stdTip.moved&&Math.hypot(e.clientX-stdTip.x,e.clientY-stdTip.y)>9){stdTip.moved=true;clearTimeout(stdTip.timer);stdTipHide()}},true);
 const up=e=>{if(e.pointerType==='mouse')return;clearTimeout(stdTip.timer);if(stdTip.card&&!stdTip.moved){stdTip.block=true;setTimeout(()=>{stdTip.block=false},350);return}stdTipHide()};
 document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',e=>{if(e.pointerType!=='mouse'){clearTimeout(stdTip.timer);stdTipHide()}},true);
 document.addEventListener('click',e=>{
  if(stdTip.block){stdTip.block=false;e.stopPropagation();e.preventDefault();return}
  if(S.phase==='discard'&&S.canPick&&e.isTrusted!==undefined){const sl=e.target.closest&&e.target.closest('.slot.mine');if(sl&&sl.querySelector('.card')){const i=+sl.id.slice(-1),now=performance.now();
   if(STD.tap.i===i&&now-STD.tap.t<450){STD.tap={i:-1,t:0};return}
   STD.tap={i,t:now};e.stopPropagation();e.preventDefault();document.querySelectorAll('.slot.mine .card.tap1').forEach(c=>c.classList.remove('tap1'));const c=sl.querySelector('.card');c.classList.add('tap1');setTimeout(()=>c.classList.remove('tap1'),460);msg('Chạm nhanh 2 lần vào lá để discard · giữ để đọc hiệu ứng')}}},true);
 addEventListener('scroll',stdTipHide,true);addEventListener('blur',stdTipHide)}
function stdBanned(p,o){return !!STD.g&&!C.allowed(STD.g,p,intOf(o))}
function stdBanText(){const g=STD.g;if(!g||!g.ban[0])return '';const l=[0,1,2].filter(s=>g.ban[0]&(1<<s)).map(s=>C.SUIT_VI[s]);return 'Round này bạn bị cấm chất '+l.join(', ')}
function stdSyncCards(){const g=STD.g;for(let p=0;p<2;p++){S.hand[p]=g.hand[p].map(c=>objOf(p,c));S.deck[p]=g.deck[p].map(c=>objOf(p,c));S.discard[p]=g.disc[p].map(c=>objOf(p,c))}}
function stdSync(){const g=STD.g;S.hp=[g.hp[0],g.hp[1]];stdSyncCards();S.blocked=[g.blocked[0]<0?null:g.blocked[0],g.blocked[1]<0?null:g.blocked[1]];S.endgameBlocked=[];S.nextBlocked=[null,null]}
function stdHud(){const g=STD.g;if(!g)return;
 for(let p=0;p<2;p++){const id=document.querySelector(p===0?'.player-hud .who-id':'.enemy-hud .who-id');if(!id)continue;let line=id.querySelector('.std-nameline');
  if(!line){line=document.createElement('div');line.className='std-nameline';const name=id.querySelector('span');name.textContent=p===0?'YOU':'AI';id.insertBefore(line,name);line.appendChild(name);const t=document.createElement('span');t.className='std-tags';line.appendChild(t)}
  const t=line.querySelector('.std-tags'),tags=[];if(g.dbl[p])tags.push('<b class="t2x">+10</b>');else if(g.dblNext[p])tags.push('<b class="t2x soon">+10</b>');if(g.cnt[p]>0)tags.push('<b class="tdc">D'+g.cnt[p]+'</b>');
  const html=tags.join('');if(t.innerHTML!==html)t.innerHTML=html}}
function stdFan(){const h=$('hand'),it=[...h.children],n=it.length,many=h.dataset.many==='1';it.forEach((el,i)=>{const k=i-(n-1)/2,a=Math.abs(k);el.style.setProperty('--r',(many?0:k*6)+'deg');el.style.setProperty('--y',(many?0:Math.round(3.5*a*a))+'px')})}
function stdAfterHand(){stdFan();stdLogPos();if(!STD.g)return;$('hand').querySelectorAll('button.card').forEach(b=>{const o=S.hand[0].find(x=>x.id===b.dataset.id);b.classList.toggle('std-banned',!!o&&stdBanned(0,o))})}
/* ---- effect animations: cards drawn / returned / discarded by card effects ---- */
const STD_BACK='<div class="mu-back"></div>';
function stdAnchor(p,what){const hud=p===0?'.player-hud':'.enemy-hud';
 if(what==='deck')return document.querySelector(hud+' .deck-stack');
 if(what==='pile')return document.querySelector(p===0?'#openDiscard .pile':'.enemy-hud .discard-counter .pile')||document.querySelector(hud+' .discard-counter');
 return p===0?$('hand'):($('oppHandCount')||document.querySelector('.enemy-hud'))}
function stdBump(el){if(!el)return;el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');setTimeout(()=>el.classList.remove('bump'),400)}
function stdTag(text,at,cls){const r=at.getBoundingClientRect(),t=document.createElement('div');t.className='mu-tag std-flytag '+(cls||'');t.textContent=text;t.style.left=Math.max(52,Math.min(innerWidth-52,r.left+r.width/2))+'px';t.style.top=(/low/.test(cls||'')?r.bottom+6:Math.max(18,r.top-4))+'px';document.body.appendChild(t);return t}
async function stdFly(html,from,to,cls){
 if(reducedMotion()||!from||!to)return;const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();if(!a.width||!b.width)return;
 const w=54,h=75,el=document.createElement('div');el.className='std-fly '+(cls||'');el.style.cssText=`position:fixed;left:${a.left+a.width/2-w/2}px;top:${a.top+a.height/2-h/2}px;width:${w}px;height:${h}px;z-index:1000;pointer-events:none`;
 el.innerHTML=html;const inner=el.firstElementChild;if(inner){inner.style.cssText+=';width:100%!important;height:100%!important;min-width:0;position:static'}document.body.appendChild(el);
 const dx=b.left+b.width/2-(a.left+a.width/2),dy=b.top+b.height/2-(a.top+a.height/2),lift=dy>0?-16:16;
 try{await el.animate([{transform:'translate(0,0) scale(.35)',opacity:.2,offset:0},{transform:`translate(${dx*.12}px,${dy*.12+lift}px) scale(1.15) rotate(-5deg)`,opacity:1,offset:.28},{transform:`translate(${dx*.2}px,${dy*.2+lift}px) scale(1.15) rotate(5deg)`,opacity:1,offset:.55},{transform:`translate(${dx}px,${dy}px) scale(.3) rotate(${dx<0?-160:160}deg)`,opacity:.35,offset:1}],{duration:560,easing:'ease-in-out',fill:'forwards'}).finished}catch(e){}
 el.remove();stdBump(to)}
/* a card arrives in the player's hand from the deck or the discard pile */
async function stdToHand(o,src){
 if(reducedMotion())return;const target=[...$('hand').querySelectorAll('button.card')].find(el=>el.dataset.id===o.id);if(!target||!src)return;
 const end=target.getBoundingClientRect(),start=src.getBoundingClientRect();if(!end.width||!start.width)return;
 const {copy}=flightCopy(target);target.style.visibility='hidden';const x0=start.left+start.width/2-end.width/2,y0=start.top+start.height/2-end.height/2;
 copy.style.left=x0+'px';copy.style.top=y0+'px';copy.classList.add('std-gain');const dx=end.left-x0,dy=end.top-y0;
 try{await copy.animate([{transform:'translate(0,0) rotate(-14deg) scale(.4)',opacity:.15},{transform:`translate(${dx*.5}px,${dy*.5-22}px) rotate(8deg) scale(1.15)`,opacity:1,offset:.5},{transform:`translate(${dx}px,${dy}px) rotate(0) scale(1)`,opacity:1}],{duration:520,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'}).finished}catch(e){}
 copy.remove();target.style.visibility=''}
function stdShift(p,c,from,to){const o=objOf(p,c);S[from][p]=S[from][p].filter(x=>x!==o);if(!S[to][p].includes(o))S[to][p].push(o);return o}
async function stdMove(m,gen,tok){
 const live=()=>gen===STD.anim&&tok===S.token,p=m.p,o=objOf(p,m.c);
 if(m.k==='draw'||m.k==='back'){const from=m.k==='draw'?'deck':'discard',src=stdAnchor(p,m.k==='draw'?'deck':'pile');
  if(p===0){STD.fxNew.add(m.c);o.origin='new';stdShift(0,m.c,from,'hand');renderHud();renderHand();const tag=stdTag(m.k==='draw'?'DRAW':'FROM DISCARD',$('hand'),'gain');await stdToHand(o,src);tag.remove()}
  else{const tag=stdTag(m.k==='draw'?'DRAW':'FROM DISCARD',stdAnchor(1,'deck'),'gain low');await stdFly(STD_BACK,src,stdAnchor(1,'hand'),'gain');tag.remove();if(!live())return;stdShift(1,m.c,from,'hand');renderHud()}
  return}
 if(m.k==='drop'){await animateHandLimit(p,p===0?o:null,tok,'DISCARD');if(!live())return;stdShift(p,m.c,'hand','discard');renderHud();if(p===0)renderHand();return}
 if(m.k==='mill'){const tag=stdTag('DISCARD',stdAnchor(p,'deck'),'loss'+(p===1?' low':''));await stdFly(p===0?cardHTML(o):STD_BACK,stdAnchor(p,'deck'),stdAnchor(p,'pile'),'loss');tag.remove();if(!live())return;stdShift(p,m.c,'deck','discard');renderHud()}}
async function stdPlayMoves(mv,gen,tok){for(const m of mv){if(gen!==STD.anim||tok!==S.token)return;await stdMove(m,gen,tok);await sleep(90)}}
/* effect log panel: lines appear one by one over the board; tap to skip */
function stdPanel(title,lines,opt={}){return new Promise(res=>{
  if(!lines.length){res();return}
  document.querySelectorAll('.std-fxlog').forEach(e=>{if(e._finish)e._finish();else e.remove()});
  const board=document.querySelector('.board').getBoundingClientRect();
  const el=document.createElement('div');el.className='std-fxlog';el.style.top=Math.max(8,board.top+8)+'px';
  el.innerHTML='<div class="std-fxlog-h">'+esc(title)+'</div><div class="std-fxlog-b"></div>'+(opt.block?'<div class="std-fxlog-f">chạm để tiếp tục</div>':'');
  document.body.appendChild(el);const body=el.querySelector('.std-fxlog-b');
  let i=0,done=false,timer=null,skipped=false;const step=reducedMotion()?60:(opt.step||650),hold=opt.hold||1300;
  const finish=()=>{if(done)return;done=true;clearTimeout(timer);el.remove();res()};
  el._finish=finish;
  const add=()=>{if(done)return;if(i<lines.length){const d=document.createElement('div');d.className='std-line '+(lines[i].cls||'');d.innerHTML=lines[i].html;body.appendChild(d);const ln=lines[i];i++;if(ln.mv&&opt.onLine){Promise.resolve(opt.onLine(ln)).catch(()=>{}).then(()=>{if(!done&&!skipped)timer=setTimeout(add,Math.min(step,300))})}else timer=setTimeout(add,step)}else timer=setTimeout(finish,hold)};
  el.addEventListener('click',()=>{if(i<lines.length){skipped=true;if(opt.onSkip)opt.onSkip();while(i<lines.length){const d=document.createElement('div');d.className='std-line '+(lines[i].cls||'');d.innerHTML=lines[i].html;body.appendChild(d);i++}clearTimeout(timer);timer=setTimeout(finish,hold)}else finish()});
  add()})}
function stdLine(e){const who=e.p===0?'BẠN':'ĐỐI THỦ';return {cls:e.p===0?'me':'ai',html:'<b>'+who+' · '+esc(C.VI(e.c))+(e.sys?'':' ★')+'</b> '+esc(e.t||'Hiệu ứng kích hoạt')}}
/* effect notice: appears right when a slot clashes, stays 3 s (tap to close) */
function stdToast(slot,lines,ms){return new Promise(res=>{
  document.querySelectorAll('.std-fxlog').forEach(e=>{if(e._finish)e._finish();else e.remove()});
  const el=document.createElement('div');el.className='std-fxlog std-toast';el.setAttribute('role','status');
  el.innerHTML='<div class="std-fxlog-h">SLOT '+(slot+1)+' · HIỆU ỨNG</div>'+lines.map(l=>'<div class="std-line '+(l.cls||'')+'">'+l.html+'</div>').join('');
  document.body.appendChild(el);el.style.top='8px';
  let done=false;const finish=skip=>{if(done)return;done=true;clearTimeout(timer);el.remove();res(skip===true)};
  const timer=setTimeout(finish,ms);el._finish=finish;el.addEventListener('click',()=>finish(true))})}
/* effect log: every effect that fired, round by round; opened with the small icon on the left edge */
function stdLogPush(round,ents,sum){const l=ents.filter(e=>!e.sys&&e.t);if(!l.length&&!sum)return;let h=STD.hist.find(x=>x.round===round);if(!h){h={round,log:[],sum:null};STD.hist.push(h)}h.log=h.log.concat(l);if(sum)h.sum=sum;const b=$('stdLogBtn');if(b&&$('stdLog').hidden)b.classList.add('new')}
function stdLogRender(){const box=$('stdLogBody');if(!box)return;box.innerHTML=STD.hist.length?STD.hist.slice().reverse().map(h=>'<h4>ROUND '+h.round+'</h4>'+(h.sum?'<p class="std-log-sum">Gây <b>'+h.sum.deal+'</b> sát thương · Nhận <b>'+h.sum.take+'</b>'+(h.sum.heal[0]?' · Bạn hồi <b>'+h.sum.heal[0]+'</b>':'')+(h.sum.heal[1]?' · AI hồi <b>'+h.sum.heal[1]+'</b>':'')+' · HP '+h.sum.hp[0]+' / '+h.sum.hp[1]+'</p>':'')+(h.log.length?'':'<p class="std-log-empty">Không có hiệu ứng nào.</p>')+h.log.map(e=>{const l=stdLine(e);return '<div class="std-line '+l.cls+'">'+l.html+'</div>'}).join('')).join(''):'<p class="std-log-empty">Chưa có hiệu ứng nào được kích hoạt.</p>'}
function stdLogToggle(open){const ov=$('stdLog'),b=$('stdLogBtn');const show=open===undefined?ov.hidden:open;if(show){stdLogRender();b.classList.remove('new')}ov.hidden=!show;b.classList.toggle('open',show);b.setAttribute('aria-expanded',show?'true':'false')}
function stdLogPos(){const b=$('stdLogBtn'),v=$('vs0'),bd=document.querySelector('.board');if(!b||!v||!bd)return;const r=v.getBoundingClientRect(),br=bd.getBoundingClientRect();b.style.left=Math.max(2,br.left+2)+'px';b.style.top=(r.top+r.height/2-11)+'px';b.hidden=!STD.g}
function stdLogInit(){
 const b=document.createElement('button');b.type='button';b.id='stdLogBtn';b.hidden=true;b.setAttribute('aria-label','Effect log');b.setAttribute('aria-expanded','false');b.innerHTML='<span aria-hidden="true">≡</span>';document.body.appendChild(b);
 b.addEventListener('click',()=>stdLogToggle());
 $('stdLog').addEventListener('click',e=>{if(e.target===$('stdLog')||e.target.closest('#stdLogClose'))stdLogToggle(false)});
 addEventListener('resize',stdLogPos)}
/* choice dialog for "tìm" effects, Bao 1, Búa 8 and Kéo 7 */
function stdAsk(spec){return new Promise(res=>{
  const ov=$('stdModal'),box=ov.querySelector('.std-modal-box');
  const close=v=>{ov.hidden=true;box.innerHTML='';res(v)};
  let html='<h3>'+esc(spec.title)+'</h3>';
  if(spec.kind==='suit'){html+='<div class="std-picks">'+[0,1,2].map(s=>'<button type="button" class="std-pick '+ORDER[s]+'" data-s="'+s+'">'+SUITS[ORDER[s]].icon+'<b>'+C.SUIT_VI[s]+'</b></button>').join('')+'</div>';box.innerHTML=html;
   box.querySelectorAll('.std-pick').forEach(b=>b.addEventListener('click',()=>close(+b.dataset.s)));ov.hidden=false;return}
  const owner=spec.owner===undefined?0:spec.owner,k=Math.min(spec.k,spec.list.length),sel=new Set();
  html+='<div class="std-picks">'+spec.list.map((c,i)=>{const on=stdActive(owner,c);return '<button type="button" class="std-pick '+ORDER[C.S(c)]+(on?' fx fx-t'+(C.tier(c)+1):'')+'" data-i="'+i+'">'+SUITS[ORDER[C.S(c)]].icon+'<b>'+C.N(c)+'</b>'+(on?'<i class="fx-stars">'+'★'.repeat(C.tier(c)+1)+'</i>':'')+'</button>'}).join('')+'</div>';
  html+='<p class="std-pick-info" id="stdPickInfo">Chọn '+k+' lá.</p><div class="std-modal-actions">'+(spec.optional?'<button type="button" class="secondary" id="stdSkip">BỎ QUA</button>':'')+'<button type="button" class="primary" id="stdOk" disabled>XÁC NHẬN</button></div>';
  box.innerHTML=html;
  const info=$('stdPickInfo'),ok=$('stdOk');
  box.querySelectorAll('.std-pick').forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.i;if(sel.has(i))sel.delete(i);else{if(k===1)sel.clear();if(sel.size<k)sel.add(i)}
    box.querySelectorAll('.std-pick').forEach(x=>x.classList.toggle('sel',sel.has(+x.dataset.i)));ok.disabled=sel.size!==k;
    const c=spec.list[i],f=C.FX[c];info.textContent=C.VI(c)+(stdActive(owner,c)&&f?' ★ '+f[0]+': '+f[1]:' (bài thường)')}));
  ok.addEventListener('click',()=>close([...sel].map(i=>spec.list[i])));
  if(spec.optional)$('stdSkip').addEventListener('click',()=>close([]));
  if(spec.list.length===k&&!spec.optional){spec.list.forEach((_,i)=>sel.add(i));box.querySelectorAll('.std-pick').forEach(x=>x.classList.add('sel'));ok.disabled=false;info.textContent='Chỉ có '+k+' lá phù hợp.'}
  ov.hidden=false})}
/* run the round on a copy; whenever an effect needs the player's choice, ask, then replay with the answers so far */
async function stdResolve(rows,onNeed){
  const base=C.clone(STD.g),seed0=C.getSeed(),answers=[];
  for(;;){
    const t=C.clone(base);t.log=[];t.human=0;let qi=0;
    t.ask=spec=>{if(qi<answers.length)return answers[qi++];throw {need:spec}};
    C.setSeed(seed0);
    try{const ctx=C.resolve(t,rows);t.ask=null;t.human=-1;return {t,ctx}}
    catch(e){if(!e||!e.need)throw e;if(onNeed)await onNeed(t);answers.push(await stdAsk(e.need))}
  }
}
function stdGameOver(){const g=STD.g;S.phase='over';clearInterval(S.timer);render();
  let title,text;
  if(g.reason==='pack'){title=g.winner===0?'🏆 PACK JOT WIN!':'AI WINS!';text=g.winner===0?'Bạn thắng round với ba lá 7: thắng ngay!':'AI thắng round với ba lá 7.'}
  else if(g.winner<0){title='DRAW!';text=g.reason==='cards'?'Hết bài, hai bên bằng HP.':'Cả hai cùng hết HP.'}
  else if(g.winner===0){title='YOU WIN!';text=g.reason==='cards'?'Hết bài: bạn nhiều HP hơn.':'Bạn đã hạ AI.'}
  else{title='AI WINS!';text=g.reason==='cards'?'Hết bài: AI nhiều HP hơn.':'Thử lại nhé.'}
  showDialog(title,text)}
/* ---------- deck builder ---------- */
const STD_KEY='bbk.std.deck.v1';
function stdLoadDeck(){try{const l=JSON.parse(localStorage.getItem(STD_KEY)||'null');if(Array.isArray(l)&&C.validDeck(l))return l}catch(e){}return Object.values(C.PRESETS)[0].map(C.parse)}
let stdSel=new Set();
function stdBuilderRender(){
  const list=[...stdSel],lim=C.limits(list),cnt=[0,0,0];for(const c of list)cnt[C.tier(c)]++;
  const over=cnt.some((n,i)=>n>lim[i]);
  let html='';
  for(let t=0;t<3;t++){
    html+='<div class="std-tier-h"><b>TIER '+(t+1)+'</b><span class="'+(cnt[t]>lim[t]?'bad':cnt[t]===lim[t]?'full':'')+'">'+cnt[t]+' / '+lim[t]+'</span></div>';
    for(let c=0;c<30;c++){if(C.tier(c)!==t)continue;const f=C.FX[c],on=stdSel.has(c);
      html+='<button type="button" class="std-row'+(on?' on':'')+'" data-c="'+c+'" aria-pressed="'+on+'"><span class="std-chip '+ORDER[C.S(c)]+'">'+SUITS[ORDER[C.S(c)]].icon+'<b>'+C.N(c)+'</b></span><span class="txt"><small>'+esc(C.VI(c))+' · '+esc(f[0])+'</small>'+esc(f[1])+'</span><span class="std-check" aria-hidden="true">'+(on?'★':'')+'</span></button>'}
  }
  $('stdRows').innerHTML=html;
  $('stdStart').disabled=over;$('stdCount').textContent=over?'Vượt giới hạn: bỏ bớt lá':'Đã bật '+list.length+' lá hiệu ứng · còn lại là bài thường';
  $('stdRows').querySelectorAll('.std-row').forEach(b=>b.addEventListener('click',()=>{const c=+b.dataset.c;if(stdSel.has(c))stdSel.delete(c);else stdSel.add(c);const y=$('stdBuilder').scrollTop;stdBuilderRender();$('stdBuilder').scrollTop=y}));
}
function stdOpenBuilder(){
  S.token++;clearInterval(S.timer);S.phase='idle';$('overlay').hidden=true;$('forfeitOverlay').hidden=true;closeDiscardPile();updateForfeitButton();
  stdSel=new Set(stdLoadDeck());
  const names=Object.keys(C.PRESETS);
  $('stdPreset').innerHTML='<option value="">Deck mẫu…</option>'+names.map((n,i)=>'<option value="'+i+'">'+esc(n)+'</option>').join('')+'<option value="none">Tắt hết (bài thường)</option>';
  $('stdAi').innerHTML='<option value="rand">AI: deck mẫu ngẫu nhiên</option>'+names.map((n,i)=>'<option value="'+i+'">AI: '+esc(n)+'</option>').join('')+'<option value="none">AI: bài thường</option>';
  stdBuilderRender();$('stdBuilder').hidden=false;$('stdBuilder').scrollTop=0}
function stdStartMatch(){
  const list=[...stdSel];if(!C.validDeck(list))return;
  try{localStorage.setItem(STD_KEY,JSON.stringify(list))}catch(e){}
  const names=Object.keys(C.PRESETS),a=$('stdAi').value;let ai=[],nm='Bài thường';
  if(a!=='none'){const i=a==='rand'?Math.floor(Math.random()*names.length):+a;nm=names[i];ai=C.PRESETS[nm].map(C.parse)}
  STD.mine=C.mask(list);STD.theirs=C.mask(ai);STD.theirName=nm;STD.level=$('stdLevel').value;
  $('stdBuilder').hidden=true;newGame()}
function stdFillHelp(){
  const g=STD.g,mk=(p)=>{const l=C.unmask(g.active[p]);return l.length?l.map(c=>'<article><span class="tutorial-step">'+esc(C.VI(c))+'</span><div><strong>'+esc(C.FX[c][0])+'</strong><p>'+esc(C.FX[c][1])+'</p></div></article>').join(''):'<p>Không bật lá nào.</p>'};
  $('tutorialTitle').textContent='STANDARD · EFFECTS';
  const intro=document.querySelector('#tutorialOverlay .tutorial-intro');if(intro)intro.textContent='Lá có sao là lá đã bật hiệu ứng: 1 sao xanh = Tier 1, 2 sao tím = Tier 2, 3 sao vàng = Tier 3. Đặt ngón tay lên lá (hoặc rê chuột) để đọc hiệu ứng; giữ lâu thì bảng ở lại cho tới lần chạm kế tiếp. Hiệu ứng chạy khi lá thắng slot của nó (đánh thẳng vào slot trống cũng tính), theo thứ tự slot 1 → 2 → 3, thắng trước thua sau.';
  const guide=document.querySelector('#tutorialOverlay .tutorial-guide');if(!guide)return;
  guide.innerHTML='<h3 class="std-help-h">BÀI HIỆU ỨNG CỦA BẠN</h3>'+mk(0)+'<h3 class="std-help-h">BÀI HIỆU ỨNG CỦA AI ('+esc(STD.theirName)+')</h3>'+mk(1)+(STD.lastLog.length?'<h3 class="std-help-h">HIỆU ỨNG ROUND VỪA RỒI</h3>'+STD.lastLog.map(e=>'<p class="std-help-log">'+stdLine(e).html+'</p>').join(''):'')}
function stdInit(){
  $('overlay').hidden=true;window.__STD={STD,S,render,C,objOf,sync:stdSync};   // test hook (test build only)
  $('showTutorialGame').textContent='★ EFFECTS';$('dialogBack').textContent='← DECK BUILDER';$('backToMenu').textContent='☰ ĐỔI DECK / ĐỘ KHÓ';
  $('showTutorialGame').addEventListener('click',()=>{if(STD.g)stdFillHelp()},true);
  $('stdPreset').addEventListener('change',e=>{const v=e.target.value;if(v==='')return;stdSel=new Set(v==='none'?[]:Object.values(C.PRESETS)[+v].map(C.parse));e.target.value='';stdBuilderRender()});
  $('stdStart').addEventListener('click',stdStartMatch);
  stdTipInit();stdLogInit();stdOpenBuilder()}
//@@NEWGAME
async function newGame(){
 S.token++;clearInterval(S.timer);C.setSeed((Date.now()^Math.floor(Math.random()*1e9))|0);
 OBJ[0]={};OBJ[1]={};STD.fxNew.clear();STD.h9show=[false,false];STD.anim++;STD.g=C.newGame(STD.mine,STD.theirs);STD.lastLog=[];STD.hist=[];STD.ctx=null;STD.rows=null;
 S.messUp=[false,false];S.phase='dealing';S.round=0;S.target=null;S.result=null;S.canPick=false;S.pickIdx=[null,null];S.history=[];S.playerObservations=[];S.difficulty='hard';S.dragId=null;S.animateHand.clear();S.nextDraws=[1,1];S.roundHpStart=[100,100];S.kiantsBonus=null;S.slots=[[null,null,null],[null,null,null]];
 $('difficultyStatus').textContent='STANDARD · '+(STD.level==='easy'?'EASY':STD.level==='normal'?'NORMAL':'EXPERT');
 $('comboCelebration').hidden=true;$('comboCelebration').innerHTML='';closeDiscardPile();$('overlay').hidden=true;$('stdBuilder').hidden=true;
 stdSync();renderHistory();renderPreviousRound();updateForfeitButton();stdFillHelp();
 {const token=S.token,mine=S.hand[0].slice(),theirs=S.hand[1].slice(),zone=$('hand').closest('.hand-zone');
  S.deck[0]=S.deck[0].concat(mine);S.deck[1]=S.deck[1].concat(theirs);S.hand=[[],[]];$('hand').innerHTML='';render();msg('Dealing the opening five cards…');if(zone)zone.classList.add('is-dealing');
  for(let i=0;i<Math.max(mine.length,theirs.length);i++){
   if(theirs[i]){S.hand[1].push(theirs[i]);S.deck[1]=S.deck[1].filter(x=>x!==theirs[i])}
   const card=mine[i];if(card){card.origin='hand';S.hand[0].push(card);S.deck[0]=S.deck[0].filter(x=>x!==card)}
   renderHud();if(card){renderHand();await animateDealtCard(card,token)}
   if(token!==S.token)return;await sleep(reducedMotion()?0:110);if(token!==S.token)return}
  if(zone)zone.classList.remove('is-dealing');stdSync()}
 await startRound(true);
}
//@@AIPLAY
function aiPlay(){
 const g=STD.g;
 STD.aiRow=STD.level==='easy'?C.randomRow(g,1):C.planExpert(g,1,STD.level==='normal'?4:12,7);
 S.slots[1]=STD.aiRow.map(c=>c<0?null:objOf(1,c));S.hand[1]=S.hand[1].filter(o=>!S.slots[1].includes(o));
}
//@@STARTROUND
async function startRound(first=false){
 const g=STD.g;clearInterval(S.timer);S.round=g.round;S.phase='dealing';
 S.slots=[[null,null,null],[null,null,null]];S.target=null;S.result=null;S.canPick=false;S.pickIdx=[null,null];
 stdSync();renderPreviousRound();render();
 if(g.over){stdGameOver();return}
 aiPlay();S.duration=roundTime();S.deadline=Date.now()+S.duration*1000;S.phase='plan';
 $('clock').classList.remove('urgent');S.timer=setInterval(tick,150);render();tick();
 const lines=[];const bt=stdBanText();if(bt)lines.push({cls:'ai',html:esc(bt)});
 if(g.ban[1])lines.push({cls:'me',html:'AI bị cấm chất '+[0,1,2].filter(s=>g.ban[1]&(1<<s)).map(s=>C.SUIT_VI[s]).join(', ')});
 if(g.blocked[0]>=0)lines.push({cls:'ai',html:'Slot '+(g.blocked[0]+1)+' của bạn bị khóa round này'});
 if(g.blocked[1]>=0)lines.push({cls:'me',html:'Slot '+(g.blocked[1]+1)+' của AI bị khóa round này'});
 if(lines.length)stdPanel('ROUND '+g.round,lines,{step:250,hold:1800});
}
//@@REVEAL
async function reveal(timeout=false){
 if(S.phase!=='plan')return;S.phase='reveal';clearInterval(S.timer);S.target=null;render();
 document.querySelectorAll('.std-fxlog').forEach(e=>e.remove());
 const tok=S.token,g=STD.g;
 const rows=[S.slots[0].map(c=>c?intOf(c):-1),S.slots[1].map(c=>c?intOf(c):-1)];
 g.hand[0]=C.withoutRow(g.hand[0],rows[0]);g.hand[1]=C.withoutRow(g.hand[1],rows[1]);
 S.roundHpStart=[...S.hp];
 await sleep(300);if(tok!==S.token)return;
 for(let i=0;i<3;i++)if(S.slots[1][i])$('slot1'+i).innerHTML=cardHTML(S.slots[1][i]);
 const out=C.outcomes(rows),gen=++STD.anim,first=out.findIndex(Boolean);
 STD.h9show=[rows[0].includes(9)&&!g.h9[0],rows[1].includes(9)&&!g.h9[1]];
 const pill=(i,w,direct,d)=>{const v=$('vs'+i);v.className='versus '+(w===0?'me':w===1?'ai':'tie');v.innerHTML=`<span class="pill">${w<0?'Tie':(direct?'Direct hit ':w===0?'Deals ':'Received ')+d}</span>`};
 // 1) The three slots clash one after another. A card whose effect is going to fire gets an "EFFECT TRIGGERED" mark right at its clash.
 const seed0=C.getSeed(),dry=C.clone(g);dry.log=[];C.resolve(dry,rows);C.setSeed(seed0);
 const fired=[[false,false,false],[false,false,false]];
 for(const e of dry.log)if(e.slot>=0&&!e.sys&&rows[e.p][e.slot]===e.c&&!/hiệu ứng mất/.test(e.t))fired[e.p][e.slot]=true;
 for(let i=0;i<3;i++){
  const r=out[i];if(!r)continue;const a=S.slots[0][i],b=S.slots[1][i],d=r[0]<0?r[1]:dry.slotDmg[i];
  const result={w:r[0],dmg:d,dbl:!!(a&&b&&a.suit!==b.suit&&a.n===b.n),direct:!(a&&b)};
  if(a&&b)await animateClash(i,result,tok,a,b);else await animateDirectHit(result.w,i,a||b,result.dmg,tok);
  if(tok!==S.token)return;
  pill(i,result.w,result.direct,result.dmg);
  if(result.w===0){$('slot0'+i).querySelector('.card')?.classList.add('win');$('slot1'+i).querySelector('.card')?.classList.add('lose')}
  else if(result.w===1){$('slot1'+i).querySelector('.card')?.classList.add('win');$('slot0'+i).querySelector('.card')?.classList.add('lose')}
  for(let p=0;p<2;p++)if(fired[p][i]){const s=$('slot'+p+i);if(s&&!s.querySelector('.fx-trig')){const m=document.createElement('span');m.className='fx-trig';m.textContent='TRIGGERED';s.appendChild(m)}}
  await sleep(reducedMotion()?80:(fired[0][i]||fired[1][i]?320:260));if(tok!==S.token)return;
 }
 // 2) After all three clashes the effects resolve in order (slot 1 -> 3, winner first): a 3 s notice + card animations each, choice dialogs in between.
 const told=[0,0,0];
 const slotOf=log=>{const r=log.map(e=>e.c===15&&/^Chặn/.test(e.t)?first:e.slot);for(let k=r.length-1;k>=0;k--)if(r[k]<0)r[k]=k+1<r.length?r[k+1]:0;return r};
 const present=async(t,upto)=>{
  const log=t.log||[],where=slotOf(log);
  for(let i=0;i<=upto;i++){
   const ents=log.filter((e,k)=>where[k]===i).slice(told[i]);if(!ents.length)continue;told[i]+=ents.length;
   const moves=(async()=>{for(const e of ents)if(e.mv)await stdPlayMoves(e.mv,gen,tok)})();
   const skipped=await stdToast(i,ents.map(stdLine),1600);if(tok!==S.token)return;
   if(!skipped)await moves;if(tok!==S.token)return;
  }};
 const {t,ctx}=await stdResolve(rows,part=>present(part,part.curSlot<0?0:part.curSlot));if(tok!==S.token)return;
 await present(t,2);if(tok!==S.token)return;
 // 3) Only now the total damage / healing of the round is applied.
 const log=t.log||[];t.log=null;STD.g=t;STD.ctx=ctx;STD.rows=rows;STD.lastLog=log.slice();stdLogPush(S.round,log,{deal:ctx.dmg[1],take:ctx.dmg[0],heal:[ctx.heal[0],ctx.heal[1]],hp:[Math.max(0,t.hp[0]),Math.max(0,t.hp[1])]});
 STD.anim++;for(const c of t.hand[0])if(!g.hand[0].includes(c)){STD.fxNew.add(c);objOf(0,c).origin='new'}stdSyncCards();renderHud();renderHand();
 if(ctx.sweep>=0)msg('⚡ PERFECT SWEEP — +5 BONUS DAMAGE!');
 const before=[S.hp[0],S.hp[1]];S.hp=[t.hp[0],t.hp[1]];renderHud();
 for(let p=0;p<2;p++)if(ctx.dmg[p]>0)animateHpHit(p,ctx.dmg[p],before[p]);
 S.history.push({round:S.round,cards:S.slots[1].map(c=>c?{suit:c.suit,n:c.n}:null),playerCards:S.slots[0].map(c=>c?{suit:c.suit,n:c.n}:null),oppWins:ctx.wins[0],myWins:ctx.wins[1],oppDealt:ctx.dmg[1],myDealt:ctx.dmg[0]});
 renderHistory();renderPreviousRound();
 await sleep(reducedMotion()?150:700);if(tok!==S.token)return;
 if(ctx.combo.pack>=0){const desc=ctx.combo.pack===0?'You won the round with three sevens — instant victory!':'AI won the round with three sevens — instant victory!';if(!await celebrateCombo('pack',ctx.combo.pack,desc,S.token))return;stdGameOver();return}
 if(t.over){stdGameOver();return}
 if(ctx.combo.zero>=0){if(!await celebrateCombo('zero',ctx.combo.zero,`${ctx.combo.zero===0?'You locked an AI slot':'AI locked one of your slots'} for the next round!`,S.token))return}
 for(let p=0;p<2;p++){if(ctx.combo.charge[p]){if(!await flashCombo('charge',S.token))return}if(ctx.combo.messup[p]){if(!await flashCombo('messup',S.token))return}}
 S.phase='discard';S.result={wins:ctx.wins,winner:ctx.winner,bothPick:ctx.bothPick};S.pickIdx=[null,null];
 S.canPick=(ctx.winner===0||ctx.bothPick)&&S.slots[0].some(Boolean);
 S.discardDeadline=Date.now()+S.discardDuration*1000;clearInterval(S.timer);S.timer=setInterval(tick,150);$('clock').classList.remove('urgent');
 markDiscards();updateButton();if(S.canPick)tick();else completeDiscardSelection(false);
}
//@@FINISHROUND
async function finishRound(){if(S.phase!=='discard'||S.canPick)return;clearInterval(S.timer);
 const g=STD.g,tok=S.token;g.log=[];
 const myPick=S.pickIdx[0]!==null&&S.pickIdx[0]!==undefined&&S.slots[0][S.pickIdx[0]]?intOf(S.slots[0][S.pickIdx[0]]):null;
 const res=C.finishRound(g,STD.rows,STD.ctx,(gg,p,played,on)=>p===0&&myPick!==null&&played.includes(myPick)?myPick:C.chooseDiscardSmart(gg,p,played,on));
 const log=g.log;g.log=null;
 S.animateHand.clear();
 for(const c of g.hand[0]){const o=objOf(0,c);o.origin=res.drawn[0].includes(c)||STD.fxNew.has(c)?'new':STD.rows[0].includes(c)?'returned':'hand';if(o.origin!=='hand')S.animateHand.add(o.id)}
 for(const c of res.drawn[0])S.animateHand.delete(objOf(0,c).id);
 STD.fxNew.clear();STD.h9show=[false,false];S.slots=[[null,null,null],[null,null,null]];S.phase='dealing';stdSync();render();
 for(const c of res.drawn[0]){if(!g.hand[0].includes(c))continue;await animateDealtCard(objOf(0,c),tok);if(tok!==S.token)return}
 const lines=log.filter(e=>e.p===0||!e.sys||/MESS UP/.test(e.t)).map(e=>e.p===1&&e.sys?{cls:'ai',html:'<b>ĐỐI THỦ</b> '+esc(e.t)}:stdLine(e));
 STD.lastLog=STD.lastLog.concat(log.filter(e=>e.p===0||!e.sys));stdLogPush(g.round-1,log);
 if(lines.length){await stdPanel('KẾT THÚC ROUND',lines,{step:300,hold:1400});if(tok!==S.token)return}
 startRound(false)}
