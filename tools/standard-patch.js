//@@HELPERS
/* the opponent's slot that stays empty this round (too few cards, or a banned suit) is marked during planning: a card placed in front of it is a direct hit */
const stdRenderSlots0=renderSlots;
renderSlots=function(){stdRenderSlots0();for(let i=0;i<3;i++){const sl=$('slot1'+i);if(!sl)continue;const open=S.phase==='plan'&&!S.slots[1][i]&&!isBlocked(1,i);sl.classList.toggle('std-open',open);
 if(open){sl.innerHTML='<span class="std-open-tag">EMPTY<small>DIRECT HIT</small></span>';const v=$('vs'+i);if(v)v.innerHTML='<span class="pill std-open-pill">'+(i+1)+' VS —</span>'}}};
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
function stdInfoHTML(c,on,used){const f=C.FX[c],t=C.tier(c)+1;
 if(!on||!f)return '<b>'+esc(C.VI(c))+'<span class="plain">PLAIN</span></b><p>'+(used?'Effect already used this game.':'No effect: plays as a normal card.')+'</p>';
 return '<b>'+esc(C.VI(c))+'<span>'+'★'.repeat(t)+' TIER '+t+'</span></b><i>'+esc(f[0])+'</i><p>'+esc(f[1])+'</p>'}
function stdTipHide(){if(stdTip.el)stdTip.el.hidden=true;stdTip.card=null}
function stdTipFind(x,y){const t=document.elementFromPoint(x,y);if(!t||!t.closest)return null;const tag=t.closest('.fx-trig');if(tag){const c=tag.parentElement&&tag.parentElement.querySelector('.card');if(c)return c}const c=t.closest('.card');return c&&/^[01]-[a-z]+-\d$/.test(c.dataset.id||'')?c:null}
function stdTipShow(card,dock){
 const m=/^([01])-([a-z]+)-(\d)$/.exec(card.dataset.id||'');if(!m)return;const c=ORDER.indexOf(m[2])*10+ +m[3];
 let el=stdTip.el;if(!el){el=stdTip.el=document.createElement('div');el.id='stdTip';el.setAttribute('role','tooltip');document.body.appendChild(el)}
 const on=card.classList.contains('fx'),t=C.tier(c)+1,used=c===9&&STD.g&&STD.g.h9[+m[1]];el.className='std-tip '+(on?'t'+t:'tp');el.innerHTML=stdInfoHTML(c,on,used);el.hidden=false;
 if(dock){el.classList.add('dock');const w=el.offsetWidth,h=el.offsetHeight,f=(document.querySelector('.app')||document.body).getBoundingClientRect();
  let top=Infinity;$('hand').querySelectorAll('.card').forEach(x=>{const r=x.getBoundingClientRect();if(r.width)top=Math.min(top,r.top)});if(!isFinite(top))top=$('hand').getBoundingClientRect().top;
  const cx=f.width?f.left+f.width/2:innerWidth/2;el.style.left=Math.max(6,Math.min(innerWidth-w-6,cx-w/2))+'px';el.style.top=Math.max(6,top-h-30)+'px';stdTip.card=card;return}
 const r=card.getBoundingClientRect(),w=el.offsetWidth,h=el.offsetHeight;let top=r.top-h-12;if(top<6)top=Math.min(innerHeight-h-6,r.bottom+12);
 el.style.left=Math.max(6,Math.min(innerWidth-w-6,r.left+r.width/2-w/2))+'px';el.style.top=Math.max(6,top)+'px';stdTip.card=card}
function stdTipInit(){
 // Touch: tap and drag work exactly like Classic. The effect panel only opens after the finger rests on a card for a moment without moving.
 const HOLD=280;
 document.addEventListener('pointerdown',e=>{stdTip.prev=stdTip.card;if(e.pointerType==='mouse')return;clearTimeout(stdTip.timer);stdTip.block=false;stdTipHide();const card=stdTipFind(e.clientX,e.clientY);if(!card)return;
  stdTip.t0=performance.now();stdTip.x=e.clientX;stdTip.y=e.clientY;stdTip.moved=false;stdTip.scrub=null;
  // a card in the hand: its panel opens at once above the hand; sliding the finger sideways reads card after card (like a mouse hover)
  if(S.phase==='plan'&&card.closest('#hand')){stdTip.scrub={id:e.pointerId,on:false};stdTipShow(card,true);stdTip.timer=setTimeout(()=>{if(!stdTip.moved)stdTip.held=true},HOLD);return}
  stdTip.timer=setTimeout(()=>{if(!stdTip.moved&&document.contains(card))stdTipShow(card)},HOLD)},true);
 document.addEventListener('pointermove',e=>{
  if(e.pointerType==='mouse'){if(e.buttons){stdTipHide();return}const card=stdTipFind(e.clientX,e.clientY);if(card!==stdTip.card){if(card)stdTipShow(card);else stdTipHide()}return}
  const sc=stdTip.scrub;
  if(sc&&sc.id===e.pointerId){
   if(sc.on){e.stopPropagation();if(e.cancelable)e.preventDefault();const card=stdTipFind(e.clientX,e.clientY);if(card&&card!==stdTip.card&&card.closest('#hand'))stdTipShow(card,true);return}
   const dx=e.clientX-stdTip.x,dy=e.clientY-stdTip.y;if(Math.hypot(dx,dy)<=9)return;
   const h=$('hand'),scrolls=h.dataset.many&&h.scrollWidth>h.clientWidth+2;
   if(!scrolls&&Math.abs(dx)>Math.abs(dy)*1.2){sc.on=true;stdTip.moved=true;clearTimeout(stdTip.timer);e.stopPropagation();if(e.cancelable)e.preventDefault();if(typeof touchDrag!=='undefined')touchDrag=null;return}
   stdTip.scrub=null}
  if(!stdTip.moved&&Math.hypot(e.clientX-stdTip.x,e.clientY-stdTip.y)>9){stdTip.moved=true;clearTimeout(stdTip.timer);stdTipHide()}},{capture:true,passive:false});
 const up=e=>{if(e.pointerType==='mouse')return;clearTimeout(stdTip.timer);const sc=stdTip.scrub;stdTip.scrub=null;
  if(sc&&sc.id===e.pointerId){const held=stdTip.held;stdTip.held=false;
   if(sc.on||held){e.stopPropagation();stdTip.block=true;suppressClick=true;setTimeout(()=>{stdTip.block=false;suppressClick=false},350);return}   // read only: keep the panel, do not play the card
   stdTipHide();return}   // a quick tap plays the card as before
  stdTip.held=false;if(stdTip.card&&!stdTip.moved){stdTip.block=true;setTimeout(()=>{stdTip.block=false},350);return}stdTipHide()};
 document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',e=>{if(e.pointerType!=='mouse'){clearTimeout(stdTip.timer);stdTipHide()}},true);
 document.addEventListener('click',e=>{
  if(stdTip.block){stdTip.block=false;e.stopPropagation();e.preventDefault();return}
  if(S.phase==='discard'&&S.canPick&&e.isTrusted!==undefined){const sl=e.target.closest&&e.target.closest('.slot.mine');if(sl&&sl.querySelector('.card')){const i=+sl.id.slice(-1),now=performance.now();
   if(STD.tap.i===i&&now-STD.tap.t<450){STD.tap={i:-1,t:0};return}
   STD.tap={i,t:now};e.stopPropagation();e.preventDefault();document.querySelectorAll('.slot.mine .card.tap1').forEach(c=>c.classList.remove('tap1'));const c=sl.querySelector('.card');c.classList.add('tap1');setTimeout(()=>c.classList.remove('tap1'),460);msg('Double-tap a card to discard it · hold to read its effect')}}},true);
 $('stdUnpeek').addEventListener('click',()=>$('stdModal').classList.remove('peek'));
 document.addEventListener('click',e=>{const pc=e.target.closest&&e.target.closest('#pileOverlay .card');if(!pc)return;const card=stdTipFind(e.clientX,e.clientY)||pc;if(e.pointerType==='mouse'){stdTipShow(card);return}if(stdTip.card===card||stdTip.prev===card){stdTip.prev=null;stdTipHide();return}stdTipShow(card)});
 addEventListener('scroll',e=>{if(stdTip.card&&e.target&&e.target.contains&&e.target.contains(stdTip.card))stdTipHide()},true);addEventListener('blur',stdTipHide)}
function stdBanned(p,o){return !!STD.g&&!C.allowed(STD.g,p,intOf(o))}
function stdBanText(){const g=STD.g;if(!g||!g.ban[0])return '';const l=[0,1,2].filter(s=>g.ban[0]&(1<<s)).map(s=>C.SUIT_VI[s]);return l.join(', ')+' is banned for you this round'}
function stdSyncCards(){const g=STD.g;for(let p=0;p<2;p++){S.hand[p]=g.hand[p].map(c=>objOf(p,c));S.deck[p]=g.deck[p].map(c=>objOf(p,c));S.discard[p]=g.disc[p].map(c=>objOf(p,c))}}
function stdSync(){const g=STD.g;S.hp=[g.hp[0],g.hp[1]];stdSyncCards();S.blocked=[g.blocked[0]<0?null:g.blocked[0],g.blocked[1]<0?null:g.blocked[1]];S.endgameBlocked=[];S.nextBlocked=[null,null]}
function stdHud(){const g=STD.g;if(!g)return;
 for(let p=0;p<2;p++){const id=document.querySelector(p===0?'.player-hud .who-id':'.enemy-hud .who-id');if(!id)continue;let line=id.querySelector('.std-nameline');
  if(!line){line=document.createElement('div');line.className='std-nameline';const name=id.querySelector('span');name.textContent=p===0?'YOU':'AI';id.insertBefore(line,name);line.appendChild(name);const t=document.createElement('span');t.className='std-tags';line.appendChild(t)}
  const t=line.querySelector('.std-tags'),tags=[];if(g.dbl[p])tags.push('<b class="t2x">+10</b>');else if(g.dblNext[p])tags.push('<b class="t2x soon">+10</b>');if(g.cnt[p]>0)tags.push('<b class="tdc">D'+g.cnt[p]+'</b>');
  const html=tags.join('');if(t.innerHTML!==html)t.innerHTML=html}}
function stdFan(){const h=$('hand'),it=[...h.children],n=it.length,many=h.dataset.many==='1';it.forEach((el,i)=>{const k=i-(n-1)/2,a=Math.abs(k);el.style.setProperty('--r',(many?0:k*6)+'deg');el.style.setProperty('--y',(many?0:Math.round(3.5*a*a))+'px')})}
function stdAfterHand(){stdFan();stdLogPos();if(!STD.g)return;$('hand').querySelectorAll('button.card').forEach(b=>{const o=S.hand[0].find(x=>x.id===b.dataset.id);b.classList.toggle('std-banned',!!o&&stdBanned(0,o))})}
/* ---- the player did not get to choose (lost the round, or a draw): show which played card is discarded before it flies to the pile ---- */
async function stdLossDiscard(ctx,tok){STD.lossPick=null;const g=STD.g,row=STD.rows[0],played=row.filter(c=>c>=0);if(!played.length)return;
 const P0=C.parse('P0'),S1=C.parse('S1');
 let pick=ctx.winner===1&&played.includes(P0)&&ctx.on[0]&&(g.active[0]&C.bit(P0))?P0:played[Math.floor(Math.random()*played.length)];
 STD.lossPick=pick;const i=row.indexOf(pick),el=$('slot0'+i)&&$('slot0'+i).querySelector('.card');if(!el)return;
 const saved=pick===S1&&ctx.on[0]&&(g.active[0]&C.bit(S1));
 document.querySelectorAll('.slot.mine .card').forEach(c=>{if(c!==el)c.classList.add('std-keep')});
 el.classList.add('std-lossdisc');const tag=stdTag(saved?'BACK TO HAND':'DISCARD',el,saved?'gain low':'loss low');
 msg(saved?'Scissors 1 was chosen for discard: it returns to your hand.':(ctx.winner===1?'Round lost':'Draw')+': your '+cardName(objOf(0,pick))+' is discarded.');
 await sleep(reducedMotion()?250:480);tag.remove();if(tok!==S.token)return;
 document.querySelectorAll('.slot.mine .card.std-keep').forEach(c=>c.classList.remove('std-keep'));el.classList.remove('std-lossdisc');
 if(!saved)S.pickIdx[0]=i}
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
  el.innerHTML='<div class="std-fxlog-h">'+esc(title)+'</div><div class="std-fxlog-b"></div>'+(opt.block?'<div class="std-fxlog-f">tap to continue</div>':'');
  document.body.appendChild(el);const body=el.querySelector('.std-fxlog-b');
  let i=0,done=false,timer=null,skipped=false;const step=reducedMotion()?60:(opt.step||650),hold=opt.hold||1300;
  const finish=()=>{if(done)return;done=true;clearTimeout(timer);el.remove();res()};
  el._finish=finish;
  const add=()=>{if(done)return;if(i<lines.length){const d=document.createElement('div');d.className='std-line '+(lines[i].cls||'');d.innerHTML=lines[i].html;body.appendChild(d);const ln=lines[i];i++;if(ln.mv&&opt.onLine){Promise.resolve(opt.onLine(ln)).catch(()=>{}).then(()=>{if(!done&&!skipped)timer=setTimeout(add,Math.min(step,300))})}else timer=setTimeout(add,step)}else timer=setTimeout(finish,hold)};
  el.addEventListener('click',()=>{if(i<lines.length){skipped=true;if(opt.onSkip)opt.onSkip();while(i<lines.length){const d=document.createElement('div');d.className='std-line '+(lines[i].cls||'');d.innerHTML=lines[i].html;body.appendChild(d);i++}clearTimeout(timer);timer=setTimeout(finish,hold)}else finish()});
  add()})}
function stdLine(e){const who=e.p===0?'YOU':'AI';return {cls:e.p===0?'me':'ai',html:'<b>'+who+' · '+esc(C.VI(e.c))+(e.sys?'':' ★')+'</b> '+esc(e.t||'Effect triggered')}}
/* star burst when an effect triggers: as many stars as the card's tier, in the tier colour, popping out of the card like a clash spark */
function stdStarBurst(card,tier){
 if(!card||reducedMotion())return;const r=card.getBoundingClientRect();if(!r.width)return;
 const col=['#3aa8ff','#b277ff','#ffc21a'][tier-1],cx=r.left+r.width/2,cy=r.top+r.height/2,n=tier,spread=[[0],[-26,26],[-34,0,34]][n-1];
 const ring=document.createElement('div');ring.className='std-burst-ring';ring.style.cssText=`left:${cx}px;top:${cy}px;border-color:${col}`;document.body.appendChild(ring);
 ring.animate([{transform:'translate(-50%,-50%) scale(.2)',opacity:1},{transform:'translate(-50%,-50%) scale(1.5)',opacity:0}],{duration:520,easing:'ease-out'}).finished.then(()=>ring.remove(),()=>ring.remove());
 for(let k=0;k<n;k++){const st=document.createElement('div');st.className='std-burst-star';st.textContent='★';st.style.cssText=`left:${cx}px;top:${cy}px;color:${col}`;document.body.appendChild(st);
  const dx=spread[k],dy=-(r.height*.62+(k===(n-1)/2?10:0));
  st.animate([{transform:'translate(-50%,-50%) scale(.2) rotate(0)',opacity:0,offset:0},{transform:`translate(calc(-50% + ${dx*.7}px),calc(-50% + ${dy*.75}px)) scale(1.45) rotate(${dx>0?20:-20}deg)`,opacity:1,offset:.32},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(1.1) rotate(${dx>0?28:-28}deg)`,opacity:1,offset:.7},{transform:`translate(calc(-50% + ${dx*1.1}px),calc(-50% + ${dy-14}px)) scale(.6)`,opacity:0,offset:1}],{duration:900,easing:'cubic-bezier(.2,.9,.3,1)',delay:k*70}).finished.then(()=>st.remove(),()=>st.remove())}}
/* Hammer 9 after its one and only use: its stars crack and fall off and the card turns plain */
async function stdH9Spend(slot,used){
 const card=slot&&slot.querySelector('.card');if(!card)return;const stars=card.querySelector('.fx-stars');
 const tag=document.createElement('span');tag.className='std-spent '+(used?'used':'lost');tag.textContent=used?'EFFECT USED':'EFFECT LOST';slot.appendChild(tag);
 if(stars&&!reducedMotion()){const r=stars.getBoundingClientRect();
  [...stars.children].forEach((b,k)=>{const q=b.getBoundingClientRect(),f=document.createElement('div');f.className='std-burst-star fall';f.textContent='★';f.style.cssText=`left:${q.left+q.width/2}px;top:${q.top+q.height/2}px;color:#ffc21a;font-size:${Math.max(10,q.height)}px`;document.body.appendChild(f);
   f.animate([{transform:'translate(-50%,-50%)',opacity:1},{transform:`translate(calc(-50% + ${(k-1)*10}px),calc(-50% - 6px)) rotate(${(k-1)*25}deg) scale(1.2)`,opacity:1,offset:.25},{transform:`translate(calc(-50% + ${(k-1)*18}px),calc(-50% + 46px)) rotate(${(k-1)*90}deg) scale(.6)`,opacity:0}],{duration:800,easing:'cubic-bezier(.5,0,.8,.6)',delay:k*60}).finished.then(()=>f.remove(),()=>f.remove())});
  stars.style.visibility='hidden'}
 card.classList.add('std-spending');await sleep(reducedMotion()?200:950);
 if(stars)stars.remove();card.classList.remove('fx','fx-t1','fx-t2','fx-t3','std-spending');
 setTimeout(()=>tag.remove(),reducedMotion()?600:1400)}
/* Coin rain for the jackpot: thick pixel-art gold coins stamped with the Hammer / Paper / Scissors icon pour from the top,
   very dense at first then thinning out, tumbling and spilling out past the bottom of the screen. One canvas behind the banner. */
function stdCoinRain(){
 const cv=document.createElement('canvas');cv.className='jp-coins';cv.setAttribute('aria-hidden','true');document.body.appendChild(cv);
 const ctx=cv.getContext('2d'),dpr=Math.min(2,window.devicePixelRatio||1),W=innerWidth,H=innerHeight;
 cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;
 const D=Math.round(Math.max(26,Math.min(44,W*.085))),G=20;   // coin drawn on a 20 x 20 pixel grid, scaled up crisp
 const px=(x,c,x0,y0,w,h)=>{x.fillStyle=c;x.fillRect(x0,y0,w,h)};
 const disc=(x,fill,edge)=>{for(let y=0;y<G;y++)for(let i=0;i<G;i++){const dx=i+.5-G/2,dy=y+.5-G/2,d=Math.hypot(dx,dy);if(d<=G/2-.2)px(x,d>G/2-1.4?edge:fill,i,y,1,1)}};
 const mk=()=>{const c=document.createElement('canvas');c.width=c.height=G;const x=c.getContext('2d');x.imageSmoothingEnabled=false;return [c,x]};
 // rim (side of the coin) and face sprites
 const [rim,rx]=mk();disc(rx,'#b8700c','#5a3203');
 const face=suit=>{const [c,x]=mk();
  for(let y=0;y<G;y++)for(let i=0;i<G;i++){const dx=i+.5-G/2,dy=y+.5-G/2,d=Math.hypot(dx,dy);if(d>G/2-.2)continue;
   let col=d>G/2-1.4?'#5a3203':d>G/2-2.4?'#e0a020':'#ffd23a';if(d<=G/2-2.4&&dx+dy<-3.5)col='#ffef8a';if(d<=G/2-2.4&&d>G/2-3.4&&dx+dy>2)col='#e8a91f';px(x,col,i,y,1,1)}
  px(x,'#fffbd0',5,4,2,1);px(x,'#fffbd0',4,5,1,2);
  const img=new Image();img.onload=()=>{const t=document.createElement('canvas');t.width=t.height=G;const y=t.getContext('2d');y.imageSmoothingEnabled=false;y.drawImage(img,4,4,12,12);y.globalCompositeOperation='source-in';y.fillStyle='#8a4f05';y.fillRect(0,0,G,G);x.drawImage(t,0,0)};img.src='./icons/'+suit+'.png';return c};
 const faces=['hammer','paper','scissors'].map(face);
 const fall=[];let t0=performance.now(),last=t0,acc=0,alive=true,raf=0;
 const spawn=el=>{const z=.75+Math.random()*.5;fall.push({x:Math.random()*W,y:-D*z-Math.random()*D*2,vy:(el<.4?260:120)+Math.random()*200,vx:(Math.random()-.5)*70,a:(Math.random()-.5)*.8,va:(Math.random()-.5)*3,flip:Math.random()*6.28,vf:(4+Math.random()*7)*(Math.random()<.5?-1:1),s:Math.floor(Math.random()*3),z})};
 const draw=o=>{const w=D*o.z,c=Math.cos(o.flip),sx=Math.max(.08,Math.abs(c)),th=w*.2*Math.sqrt(1-c*c),dir=c>=0?1:-1,ca=Math.cos(o.a),sa=Math.sin(o.a);
  // thickness: the rim drawn twice behind the face, shifted toward the side the coin is turning to
  for(const f of [1,.5]){const ox=dir*th*f;ctx.setTransform(dpr*ca*sx,dpr*sa*sx,-dpr*sa,dpr*ca,dpr*(o.x+ox*ca),dpr*(o.y+ox*sa));ctx.drawImage(rim,-w/2,-w/2,w,w)}
  ctx.setTransform(dpr*ca*sx,dpr*sa*sx,-dpr*sa,dpr*ca,dpr*o.x,dpr*o.y);ctx.drawImage(faces[o.s],-w/2,-w/2,w,w)};
 const tick=now=>{if(!alive)return;const dt=Math.min(.05,(now-last)/1000),el=(now-t0)/1000;last=now;
  const rate=el<7.6?220*Math.exp(-el/1.6)+7:0;acc+=rate*dt;while(acc>=1){acc--;spawn(el)}
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);ctx.imageSmoothingEnabled=false;
  for(let k=fall.length-1;k>=0;k--){const o=fall[k];o.vy=Math.min(1100,o.vy+820*dt);o.y+=o.vy*dt;o.x+=o.vx*dt;o.a+=o.va*dt;o.flip+=o.vf*dt;
   if(o.y-D>H){fall.splice(k,1);continue}draw(o)}
  raf=requestAnimationFrame(tick)};
 raf=requestAnimationFrame(tick);
 return {remove(){alive=false;cancelAnimationFrame(raf);cv.remove()}}}
/* golden aura radiating from behind a stopped 7 (behind the card, never over its face) */
function stdAura(card,extra){const r=card.getBoundingClientRect();if(!r.width)return;const a=document.createElement('div');a.className='jp-aura';a.setAttribute('aria-hidden','true');
 const s=Math.max(r.width,r.height)*2.2;a.style.cssText=`left:${r.left+r.width/2}px;top:${r.top+r.height/2}px;width:${s}px;height:${s}px`;document.body.appendChild(a);extra.push(a);card._aura=a}
/* 7 7 7 JACKPOT: the screen darkens, the three sevens glow and float up into one row (Hammer, Paper, Scissors),
   each card becomes a slot-machine reel of whole cards rolling top to bottom, stopping on its 7 left to right,
   then the Congratulation · JackPot Win · 777 · 7 Heaven banner holds 7.77 s before the end screen. */
function stdJackpot(w,token){return new Promise(res=>{
 const slots=[0,1,2].map(i=>$('slot'+w+i)&&$('slot'+w+i).querySelector('.card')).filter(Boolean);
 const cards=slots.map(el=>({el,suit:ORDER.findIndex(s=>el.classList.contains(s))})).sort((a,b)=>a.suit-b.suit);
 const ov=document.createElement('div');ov.className='jp-overlay';ov.setAttribute('role','dialog');ov.setAttribute('aria-label','Jackpot: three sevens');document.body.appendChild(ov);
 const extra=[],live=()=>token===S.token&&document.body.contains(ov);let done=false;
 const end=()=>{if(done)return;done=true;clones.forEach(c=>c.remove());extra.forEach(x=>x.remove());cards.forEach(c=>c.el.style.visibility='');ov.remove();res(token===S.token)};
 const rm=reducedMotion();
 const plain=c=>{c.classList.remove('win','lose','pick','tap1','fx','fx-t1','fx-t2','fx-t3','discarded');c.querySelectorAll('.fx-stars,.fx-trig').forEach(x=>x.remove());c.removeAttribute('id');c.disabled=true;return c};
 const clones=cards.map(({el})=>{const r=el.getBoundingClientRect(),c=plain(el.cloneNode(true));c.classList.add('jp-card');c.style.cssText=`left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;c._r=r;document.body.appendChild(c);el.style.visibility='hidden';return c});
 const step=async()=>{
  ov.classList.add('dim');await sleep(rm?0:550);if(!live())return end();
  clones.forEach((c,k)=>{c.classList.add('glow');if(!rm)c.animate([{transform:'translateY(0)'},{transform:'translateY(-14px)'}],{duration:700,delay:k*90,easing:'ease-out',fill:'forwards'})});
  await sleep(rm?0:820);if(!live())return end();
  // one row, Hammer · Paper · Scissors
  const r0=clones[0]._r,h0=r0.height,w0=r0.width,frame=(document.querySelector('.app')||document.body).getBoundingClientRect(),fw=frame.width||innerWidth;
  const gap=12,ww=w0+12,sc=Math.max(.8,Math.min(1.7,(Math.min(fw,innerWidth)*.92-2*gap)/(3*ww),(innerHeight*.34)/(h0*1.55))),cx=(frame.width?frame.left+fw/2:innerWidth/2),cy=innerHeight*.44;
  const xs=[-1,0,1].map(k=>cx+k*(ww*sc+gap));
  await Promise.all(clones.map((c,k)=>{const r=c._r,tx=xs[k]-(r.left+r.width/2),ty=cy-(r.top+r.height/2);c._t=`translate(${tx}px,${ty}px) scale(${sc})`;
   return c.animate([{transform:'translateY(-14px)'},{transform:`translate(${tx*.5}px,${ty*.5-36}px) scale(${(1+sc)/2}) rotate(${k===1?0:k?8:-8}deg)`,offset:.55},{transform:c._t}],{duration:rm?1:820,delay:rm?0:k*110,easing:'cubic-bezier(.3,.8,.3,1)',fill:'forwards'}).finished.catch(()=>{})}));
  if(!live())return end();
  // reels: a window per card, a strip of whole cards of that suit rolling downwards, ending on the 7
  const pitch=h0+Math.round(h0*.12),winH=Math.round(h0*1.34),off=(winH-h0)/2;
  const reels=clones.map((c,k)=>{
   const reel=document.createElement('div');reel.className='jp-reel-win';reel.style.cssText=`left:${xs[k]-(w0+12)/2}px;top:${cy-winH/2}px;width:${w0+12}px;height:${winH}px;transform:scale(${sc})`;
   const strip=document.createElement('div');strip.className='jp-strip';const n=16+k*5,nums=[7];
   for(let j=1;j<n;j++){let v;do v=Math.floor(Math.random()*10);while(v===7||v===nums[j-1]);nums.push(v)}nums.push(7);
   nums.forEach((v,j)=>{const it=plain(c.cloneNode(true));it.className=it.className.replace(/\bjp-card\b|\bglow\b/g,'').trim()+' jp-item';it.style.cssText=`top:${off+j*pitch}px;width:${w0}px;height:${h0}px`;const nu=it.querySelector('.number');if(nu)nu.textContent=v;strip.appendChild(it)});
   const mk=document.createElement('div');mk.className='jp-reel-mask';mk.appendChild(strip);reel.appendChild(mk);document.body.appendChild(reel);extra.push(reel);reel._strip=strip;reel._n=nums.length-1;return reel});
  clones.forEach(c=>c.style.opacity='0');
  ov.classList.add('reels');
  await Promise.all(reels.map((reel,k)=>new Promise(r2=>{const st=reel._strip,from=-reel._n*pitch;st.style.transform=`translateY(${from}px)`;
   if(rm){reel.style.visibility='hidden';clones[k].style.opacity='1';clones[k].classList.add('aura');stdAura(clones[k],extra);reel.classList.add('stopped');return r2()}
   st.classList.add('spin');
   st.animate([{transform:`translateY(${from}px)`},{transform:`translateY(${Math.round(pitch*.14)}px)`,offset:.93},{transform:'translateY(0)'}],{duration:1500+k*650,easing:'cubic-bezier(.3,.05,.25,1)',fill:'forwards'}).finished.then(()=>{st.classList.remove('spin');if(!live())return r2();reel.classList.add('stopped');const c=clones[k];reel.style.visibility='hidden';c.style.opacity='1';c.classList.remove('glow');c.classList.add('aura');stdAura(c,extra);
    c.animate([{transform:c._t},{transform:c._t+' scale(1.1)'},{transform:c._t}],{duration:300,easing:'ease-out'});r2()},()=>r2())})));
  if(!live())return end();await sleep(rm?0:1750);if(!live())return end();
  // banner, 7.77 s

  // JACKPOT! WIN sign (pixel art) with 184 on top; the three 7s sit in a panel of card-shaped gold frames
  const pop=document.createElement('div');pop.className='jp-pop jps';
  pop.innerHTML='<div class="jps-float"><div class="jps-art"><img class="sign" src="./jackpot-sign.webp" alt="JACKPOT! WIN">'
   +'<div class="jps-184">184</div><div class="jps-panel"></div>'
   +'<i class="jps-tw t1"></i><i class="jps-tw t2"></i><i class="jps-tw t3"></i><i class="jps-tw t4"></i><i class="jps-tw t5"></i><i class="jps-tw t6"></i>'
   +'<div class="jps-shine" aria-hidden="true"></div>'+(w===0?'<div class="jps-congrats">CONGRATULATION!!!</div>':'')+'</div>'
   +'<div class="jps-sub">7 HEAVEN</div><div class="jps-who">'+(w===0?'YOU WIN THE GAME':'AI WINS THE GAME')+'</div></div>';
  const row=pop.querySelector('.jps-panel');
  document.body.appendChild(pop);extra.push(pop);ov.classList.add('win');
  const tPop=performance.now();
  if(!rm)extra.push(stdCoinRain());
  {const ph=row.clientHeight,ch=Math.round(ph*.9),cw=Math.round(ch*.72);row.style.setProperty('--cw',cw+'px');row.style.setProperty('--ch',ch+'px');row.style.setProperty('--nf',Math.max(10,Math.round(cw*.42))+'px');
   ORDER.forEach((suit,k)=>{const slot=document.createElement('div');slot.className='jps-slot';slot.style.setProperty('--d',(.45+k*.28)+'s');
    const d=document.createElement('div');d.innerHTML=cardHTML({suit,n:7,id:'jpx-'+suit});const c=plain(d.firstElementChild);c.setAttribute('tabindex','-1');c.setAttribute('aria-hidden','true');c.classList.add('jps-seven','wait');slot.appendChild(c);row.appendChild(slot)})}
  // the three 7s that just spun fly from the board into their frames, one after another; the frame flashes when a card lands
  {const slots=[...row.querySelectorAll('.jps-slot')];await sleep(rm?0:620);if(!live())return end();
   const fly=(c,k)=>new Promise(done=>{const sl=slots[k],t=sl.getBoundingClientRect(),r0=c._r,sc2=t.width/r0.width,tx=t.left+t.width/2-(r0.left+r0.width/2),ty=t.top+t.height/2-(r0.top+r0.height/2);
    const land=()=>{c.remove();if(c._aura)c._aura.remove();sl.querySelector('.card').classList.remove('wait');sl.classList.add('hit');done()};
    if(rm)return land();c.style.zIndex='1205';if(c._aura)c._aura.animate([{opacity:1},{opacity:0}],{duration:300,fill:'forwards'});
    const cur=new DOMMatrix(getComputedStyle(c).transform),mx=(cur.e+tx)/2,my=Math.min(cur.f,ty)-60;
    c.animate([{transform:c._t},{transform:`translate(${mx}px,${my}px) scale(${(sc2+cur.a)/2*1.05}) rotate(${k===1?0:k?10:-10}deg)`,offset:.5},{transform:`translate(${tx}px,${ty}px) scale(${sc2})`}],{duration:620,easing:'cubic-bezier(.45,.05,.3,1)',fill:'forwards'}).finished.then(land,land)});
   for(let k=0;k<3;k++){if(!live())return end();await fly(clones[k],k);await sleep(rm?0:90)}}
  if(!rm){const cols=['#3aa8ff','#b277ff','#ffc21a','#ffc21a'];let alive=true;extra.push({remove:()=>{alive=false}});
   const burst=()=>{if(!alive||!live())return;const r=row.getBoundingClientRect();if(!r.width)return;
    for(let k=0;k<5;k++){const st=document.createElement('i');st.className='jp-star';st.textContent='★';const col=cols[Math.floor(Math.random()*cols.length)],ang=Math.random()*Math.PI*2,dist=110+Math.random()*120,sz=14+Math.random()*16;
     st.style.cssText=`left:${r.left+r.width/2}px;top:${r.top+r.height/2}px;color:${col};font-size:${sz}px`;document.body.appendChild(st);
     st.animate([{transform:'translate(-50%,-50%) scale(.2) rotate(0)',opacity:0},{transform:`translate(calc(-50% + ${Math.cos(ang)*dist*.45}px),calc(-50% + ${Math.sin(ang)*dist*.45}px)) scale(1.2) rotate(${ang*40}deg)`,opacity:1,offset:.35},{transform:`translate(calc(-50% + ${Math.cos(ang)*dist}px),calc(-50% + ${Math.sin(ang)*dist}px)) scale(.7) rotate(${ang*80}deg)`,opacity:0}],{duration:1100+Math.random()*500,easing:'cubic-bezier(.2,.8,.3,1)'}).finished.then(()=>st.remove(),()=>st.remove())}
    setTimeout(burst,320)};setTimeout(burst,700)}
  await sleep(Math.max(0,7770-(performance.now()-tPop)));end()};
 step()})}
/* demo of the 7 7 7 animation from the deck builder: every effect off, you (or the AI) play Hammer 7, Paper 7, Scissors 7 and sweep the round */
async function stdDemo777(who){stdEmblems(false);
 STD.mine=0;STD.theirs=0;STD.theirName='Plain cards';STD.level='easy';$('stdBuilder').hidden=true;newGame();
 const tok=S.token;for(let k=0;k<200;k++){if(tok!==S.token)return;if(S.phase==='plan'&&/REVEAL/.test($('mainButton').textContent))break;await sleep(60)}
 const g=STD.g,me=who===0?[7,17,27]:[1,12,23],ai=who===0?[1,12,23]:[7,17,27];
 for(const p of [0,1]){const row=p?ai:me,all=g.deck[p].concat(g.hand[p]);g.hand[p]=row.slice().concat(g.hand[p].filter(c=>!row.includes(c)).slice(0,2));g.deck[p]=all.filter(c=>!g.hand[p].includes(c))}
 stdSync();S.slots[0]=me.map(c=>objOf(0,c));S.slots[1]=ai.map(c=>objOf(1,c));S.hand[0]=S.hand[0].filter(o=>!S.slots[0].includes(o));S.hand[1]=S.hand[1].filter(o=>!S.slots[1].includes(o));render();
 await sleep(500);if(tok===S.token)reveal()}
/* effect notice: appears right when a slot clashes, stays 3 s (tap to close) */
function stdToast(slot,lines,ms){return new Promise(res=>{
  document.querySelectorAll('.std-fxlog').forEach(e=>{if(e._finish)e._finish();else e.remove()});
  const el=document.createElement('div');el.className='std-fxlog std-toast';el.setAttribute('role','status');
  el.innerHTML='<div class="std-fxlog-h">SLOT '+(slot+1)+' · EFFECT</div>'+lines.map(l=>'<div class="std-line '+(l.cls||'')+'">'+l.html+'</div>').join('');
  document.body.appendChild(el);{const f=(document.querySelector('.app')||document.body).getBoundingClientRect(),cx=f.width?f.left+f.width/2:innerWidth/2;el.style.left=Math.round(cx)+'px';el.style.top=Math.round(innerHeight/2)+'px'}
  let done=false;const finish=skip=>{if(done)return;done=true;clearTimeout(timer);el.remove();res(skip===true)};
  const timer=setTimeout(finish,ms);el._finish=finish;el.addEventListener('click',()=>finish(true))})}
/* effect log: every effect that fired, round by round; opened with the small icon on the left edge */
/* counters and lasting effects, for the battle log: discard counter, draw counter (Bao 7), Búa 9 */
function stdStat(g){const h9=p=>!(g.active[p]&C.bit(9))?null:g.dbl[p]?'on':g.dblNext[p]?'on from next round':g.h9[p]?'lost':'not played yet';
 return {dn:[g.dn[0],g.dn[1]],od:[g.cnt[0]-g.dn[0],g.cnt[1]-g.dn[1]],cnt:[g.cnt[0],g.cnt[1]],drawn:[g.drawnN[0],g.drawnN[1]],h9:[h9(0),h9(1)],on:[g.dbl[0]?1:g.dblNext[0]?2:0,g.dbl[1]?1:g.dblNext[1]?2:0]}}
function stdStatHTML(st){const who=['You','AI'];
 return '<div class="std-stat">'+[0,1].map(p=>'<div class="std-stat-row '+(p?'ai':'me')+'"><span>'+who[p]+'</span><em>Draw <b>'+st.drawn[p]+'</b></em><em>Discard <b>'+st.cnt[p]+'</b></em><em>Passive <b class="'+(st.on[p]?'on':'off')+'">'+(st.on[p]===2?'NEXT':st.on[p]?'ON':'OFF')+'</b></em></div>').join('')+'</div>'}
function stdLogStat(round){const h=STD.hist.find(x=>x.round===round);if(h&&STD.g)h.stat=stdStat(STD.g)}
function stdLogPush(round,ents,sum){const l=ents.filter(e=>!e.sys&&e.t);if(!l.length&&!sum)return;let h=STD.hist.find(x=>x.round===round);if(!h){h={round,log:[],sum:null};STD.hist.push(h)}h.log=h.log.concat(l);if(sum)h.sum=sum;const b=$('stdLogBtn');if(b&&$('stdLog').hidden)b.classList.add('new')}
function stdLogRender(){const box=$('stdLogBody');if(!box)return;box.innerHTML=(STD.g?'<h4>NOW</h4>'+stdStatHTML(stdStat(STD.g)):'')+(STD.hist.length?STD.hist.slice(-3).reverse().map(h=>'<h4>ROUND '+h.round+'</h4>'+(h.sum?'<p class="std-log-sum">Dealt <b>'+h.sum.deal+'</b> · Taken <b>'+h.sum.take+'</b>'+(h.sum.heal[0]?' · You healed <b>'+h.sum.heal[0]+'</b>':'')+(h.sum.heal[1]?' · AI healed <b>'+h.sum.heal[1]+'</b>':'')+' · HP '+h.sum.hp[0]+' / '+h.sum.hp[1]+'</p>':'')+(h.log.length?'':'<p class="std-log-empty">No effects this round.</p>')+h.log.map(e=>{const l=stdLine(e);return '<div class="std-line '+l.cls+'">'+l.html+'</div>'}).join('')).join(''):'<p class="std-log-empty">No rounds played yet.</p>')}
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
  const close=v=>{ov.hidden=true;ov.classList.remove('peek');box.innerHTML='';res(v)};
  ov.classList.remove('peek');
  let html='<div class="std-modal-head"><h3>'+esc(spec.title)+'</h3><button type="button" class="secondary std-hide" id="stdHide" aria-label="Hide this window to look at the table">HIDE ▾</button></div>';
  const wire=()=>{$('stdHide').addEventListener('click',()=>{ov.classList.add('peek');stdTipHide();const mb=$('mainButton'),u=$('stdUnpeek');if(mb&&u){const r=mb.getBoundingClientRect();if(r.height&&r.bottom>0&&r.top<innerHeight){u.style.top=(r.top+r.height/2)+'px';u.style.bottom='auto'}else{u.style.top='';u.style.bottom=''}}})};
  if(spec.kind==='suit'){html+='<div class="std-picks">'+[0,1,2].map(s=>'<button type="button" class="std-pick '+ORDER[s]+'" data-s="'+s+'">'+SUITS[ORDER[s]].icon+'<b>'+C.SUIT_VI[s]+'</b></button>').join('')+'</div>';box.innerHTML=html;wire();
   box.querySelectorAll('.std-pick').forEach(b=>b.addEventListener('click',()=>close(+b.dataset.s)));ov.hidden=false;return}
  const owner=spec.owner===undefined?0:spec.owner,k=Math.min(spec.k,spec.list.length),sel=new Set();
  html+='<div class="std-picks">'+spec.list.map((c,i)=>{const on=stdActive(owner,c);return '<button type="button" class="std-pick '+ORDER[C.S(c)]+(on?' fx fx-t'+(C.tier(c)+1):'')+'" data-i="'+i+'">'+SUITS[ORDER[C.S(c)]].icon+'<b>'+C.N(c)+'</b>'+(on?'<i class="fx-stars">'+'★'.repeat(C.tier(c)+1)+'</i>':'')+'</button>'}).join('')+'</div>';
  html+='<div class="std-pick-info" id="stdPickInfo"><p>Choose '+k+' card'+(k>1?'s':'')+'. Tap a card to read it.</p></div><div class="std-modal-actions">'+(spec.optional?'<button type="button" class="secondary" id="stdSkip">SKIP</button>':'')+'<button type="button" class="primary" id="stdOk" disabled>CONFIRM</button></div>';
  box.innerHTML=html;wire();
  const info=$('stdPickInfo'),ok=$('stdOk');
  box.querySelectorAll('.std-pick').forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.i;if(sel.has(i))sel.delete(i);else{if(k===1)sel.clear();if(sel.size<k)sel.add(i)}
    box.querySelectorAll('.std-pick').forEach(x=>x.classList.toggle('sel',sel.has(+x.dataset.i)));ok.disabled=sel.size!==k;
    const c=spec.list[i],on=stdActive(owner,c);info.className='std-pick-info card-info '+(on?'t'+(C.tier(c)+1):'tp');info.innerHTML=stdInfoHTML(c,on)+'<small>'+(owner===1?'Opponent card':'Your card')+' · selected '+sel.size+' / '+k+'</small>'}));
  ok.addEventListener('click',()=>close([...sel].map(i=>spec.list[i])));
  if(spec.optional)$('stdSkip').addEventListener('click',()=>close([]));
  if(spec.list.length===k&&!spec.optional){spec.list.forEach((_,i)=>sel.add(i));box.querySelectorAll('.std-pick').forEach(x=>x.classList.add('sel'));ok.disabled=false;info.innerHTML='<p>Only '+k+' matching card'+(k>1?'s':'')+'. Tap a card to read it.</p>'}
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
  if(g.reason==='pack'){title=g.winner===0?'🏆 PACK JOT WIN!':'AI WINS!';text=g.winner===0?'You won the round with three sevens — instant victory!':'AI won the round with three sevens.'}
  else if(g.winner<0){title='DRAW!';text=g.reason==='cards'?'Out of cards with equal HP.':'Both players ran out of HP.'}
  else if(g.winner===0){title='YOU WIN!';text=g.reason==='cards'?'Out of cards: you have more HP.':'You defeated the AI.'}
  else{title='AI WINS!';text=g.reason==='cards'?'Out of cards: the AI has more HP.':'Try again.'}
  stdEmblems(g.reason==='pack');showDialog(title,text)}
function stdEmblems(seven){document.querySelectorAll('#overlay .emblems .mini b').forEach((b,k)=>{b.textContent=seven?'7':['1','8','4'][k]});const e=document.querySelector('#overlay .emblems');if(e)e.classList.toggle('jp-777',!!seven)}
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
  $('stdStart').disabled=over;$('stdCount').textContent=over?'Over the limit: turn some cards off':list.length+' effect card'+(list.length===1?'':'s')+' on · the rest are plain';
  $('stdRows').querySelectorAll('.std-row').forEach(b=>b.addEventListener('click',()=>{const c=+b.dataset.c;if(stdSel.has(c))stdSel.delete(c);else stdSel.add(c);const y=$('stdBuilder').scrollTop;stdBuilderRender();$('stdBuilder').scrollTop=y}));
}
function stdOpenBuilder(){
  S.token++;clearInterval(S.timer);S.phase='idle';$('overlay').hidden=true;$('forfeitOverlay').hidden=true;closeDiscardPile();updateForfeitButton();
  stdSel=new Set(stdLoadDeck());
  const names=Object.keys(C.PRESETS);
  $('stdPreset').innerHTML='<option value="">Preset deck…</option>'+names.map((n,i)=>'<option value="'+i+'">'+esc(n)+'</option>').join('')+'<option value="none">All off (plain cards)</option>';
  $('stdAi').innerHTML='<option value="rand">AI: random preset</option>'+names.map((n,i)=>'<option value="'+i+'">AI: '+esc(n)+'</option>').join('')+'<option value="none">AI: plain cards</option>';
  stdBuilderRender();$('stdBuilder').hidden=false;$('stdBuilder').scrollTop=0}
function stdStartMatch(){stdEmblems(false);
  const list=[...stdSel];if(!C.validDeck(list))return;
  try{localStorage.setItem(STD_KEY,JSON.stringify(list))}catch(e){}
  const names=Object.keys(C.PRESETS),a=$('stdAi').value;let ai=[],nm='Plain cards';
  if(a!=='none'){const i=a==='rand'?Math.floor(Math.random()*names.length):+a;nm=names[i];ai=C.PRESETS[nm].map(C.parse)}
  STD.mine=C.mask(list);STD.theirs=C.mask(ai);STD.theirName=nm;STD.level=$('stdLevel').value;
  $('stdBuilder').hidden=true;newGame()}
function stdFillHelp(){
  const g=STD.g,mk=(p)=>{const l=C.unmask(g.active[p]);return l.length?l.map(c=>'<article><span class="tutorial-step">'+esc(C.VI(c))+'</span><div><strong>'+esc(C.FX[c][0])+'</strong><p>'+esc(C.FX[c][1])+'</p></div></article>').join(''):'<p>No effect cards.</p>'};
  $('tutorialTitle').textContent='STANDARD · EFFECTS';
  const intro=document.querySelector('#tutorialOverlay .tutorial-intro');if(intro)intro.textContent='Cards with stars have their effect on: 1 blue star = Tier 1, 2 purple stars = Tier 2, 3 gold stars = Tier 3. Hold a card (or hover) to read its effect. Effects trigger right after their slot is decided (a direct hit on an empty slot counts as a win), in order slot 1 → 2 → 3, winner before loser. Damage is totalled after slot 3.';
  const guide=document.querySelector('#tutorialOverlay .tutorial-guide');if(!guide)return;
  guide.innerHTML='<h3 class="std-help-h">YOUR EFFECT CARDS</h3>'+mk(0)+'<h3 class="std-help-h">AI EFFECT CARDS ('+esc(STD.theirName)+')</h3>'+mk(1)+(STD.lastLog.length?'<h3 class="std-help-h">LAST ROUND EFFECTS</h3>'+STD.lastLog.map(e=>'<p class="std-help-log">'+stdLine(e).html+'</p>').join(''):'')}
function stdInit(){
  $('overlay').hidden=true;window.__STD={STD,S,render,C,objOf,sync:stdSync,ask:stdAsk};   // test hook (test build only)
  $('showTutorialGame').textContent='★ EFFECTS';$('dialogBack').textContent='← DECK BUILDER';$('backToMenu').textContent='☰ CHANGE DECK / LEVEL';
  $('showTutorialGame').addEventListener('click',()=>{if(STD.g)stdFillHelp()},true);
  $('stdPreset').addEventListener('change',e=>{const v=e.target.value;if(v==='')return;stdSel=new Set(v==='none'?[]:Object.values(C.PRESETS)[+v].map(C.parse));e.target.value='';stdBuilderRender()});
  $('stdStart').addEventListener('click',stdStartMatch);$('stdDemoMe').addEventListener('click',()=>stdDemo777(0));$('stdDemoAi').addEventListener('click',()=>stdDemo777(1));
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
async function startRound(first=false){document.querySelectorAll('.std-flytag').forEach(e=>e.remove());
 const g=STD.g;clearInterval(S.timer);S.round=g.round;S.phase='dealing';
 S.slots=[[null,null,null],[null,null,null]];S.target=null;S.result=null;S.canPick=false;S.pickIdx=[null,null];
 stdSync();renderPreviousRound();render();
 if(g.over){stdGameOver();return}
 aiPlay();S.duration=roundTime();S.deadline=Date.now()+S.duration*1000;S.phase='plan';
 $('clock').classList.remove('urgent');S.timer=setInterval(tick,150);render();tick();
 const lines=[];const bt=stdBanText();if(bt)lines.push({cls:'ai',html:esc(bt)});
 if(g.ban[1])lines.push({cls:'me',html:[0,1,2].filter(s=>g.ban[1]&(1<<s)).map(s=>C.SUIT_VI[s]).join(', ')+' is banned for the AI'});
 if(g.blocked[0]>=0)lines.push({cls:'ai',html:'Your slot '+(g.blocked[0]+1)+' is locked this round'});
 if(g.blocked[1]>=0)lines.push({cls:'me',html:'AI slot '+(g.blocked[1]+1)+' is locked this round'});
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
 const out=C.outcomes(rows),gen=++STD.anim;
 STD.h9show=[rows[0].includes(9)&&!g.h9[0],rows[1].includes(9)&&!g.h9[1]];
 const pill=(i,w,direct,d)=>{const v=$('vs'+i);v.className='versus '+(w===0?'me':w===1?'ai':'tie');v.innerHTML=`<span class="pill">${w<0?'Tie':(direct?'Direct hit ':w===0?'Deals ':'Received ')+d}</span>`};
 // Slot by slot (1 -> 3): the clash decides the slot, then that slot's effects fire at once (winner first, loser second) before the next slot clashes.
 // A dry run tells which cards will fire, so the TRIGGERED tag can show at the clash.
 const seed0=C.getSeed(),dry=C.clone(g);dry.log=[];C.resolve(dry,rows);C.setSeed(seed0);
 const fired=[[false,false,false],[false,false,false]];
 for(const e of dry.log)if(e.slot>=0&&!e.sys&&rows[e.p][e.slot]===e.c&&!/effect lost/.test(e.t))fired[e.p][e.slot]=true;
 let shown=-1;const told=[0,0,0],spent=[false,false,false];
 const slotOf=log=>{const r=log.map(e=>e.slot);for(let k=r.length-1;k>=0;k--)if(r[k]<0)r[k]=k+1<r.length?r[k+1]:Math.max(0,shown);return r};
 const present=async(t,upto,fin)=>{
  const log=t.log||[],where=slotOf(log);
  for(let i=0;i<=upto;i++){
   const r=out[i],a=S.slots[0][i],b=S.slots[1][i];
   if(i>shown){shown=i;if(r){
    const result={w:r[0],dmg:r[1],dbl:!!(a&&b&&a.suit!==b.suit&&a.n===b.n),direct:!(a&&b)};
    if(a&&b)await animateClash(i,result,tok,a,b);else await animateDirectHit(result.w,i,a||b,result.dmg,tok);
    if(tok!==S.token)return;
    pill(i,result.w,result.direct,result.dmg);
    if(result.w===0){$('slot0'+i).querySelector('.card')?.classList.add('win');$('slot1'+i).querySelector('.card')?.classList.add('lose')}
    else if(result.w===1){$('slot1'+i).querySelector('.card')?.classList.add('win');$('slot0'+i).querySelector('.card')?.classList.add('lose')}
    await sleep(reducedMotion()?80:260);if(tok!==S.token)return}}
   const ents=log.filter((e,k)=>where[k]===i).slice(told[i]);
   if(ents.length){told[i]+=ents.length;
    // one card's effect at a time: the slot winner's effect plays out fully (tag, moves, notice), then the loser's
    const groups=[];for(const e of ents){const last=groups[groups.length-1];if(last&&(last.p===e.p||e.sys))last.list.push(e);else groups.push({p:e.p,list:[e]})}
    for(const gr of groups){
     const p=gr.p,sl=$('slot'+p+i);if(fired[p]&&fired[p][i]&&sl&&!sl.querySelector('.fx-trig')){const m=document.createElement('span');m.className='fx-trig';m.textContent='TRIGGERED';sl.appendChild(m);stdStarBurst(sl.querySelector('.card'),C.tier(rows[p][i])+1)}
     const moves=(async()=>{for(const e of gr.list)if(e.mv)await stdPlayMoves(e.mv,gen,tok)})();
     const skipped=await stdToast(i,gr.list.map(stdLine),2600);if(tok!==S.token)return;
     if(!skipped)await moves;if(tok!==S.token)return}}
   for(let p=0;p<2;p++)if(fired[p][i]&&(fin||i<upto)){const sl=$('slot'+p+i);if(sl&&!sl.querySelector('.fx-trig')){const m=document.createElement('span');m.className='fx-trig';m.textContent='TRIGGERED';sl.appendChild(m)}}
   if(r&&r[0]>=0&&t.slotDmg&&t.slotDmg[i]!==r[1])pill(i,r[0],!(a&&b),t.slotDmg[i]);
   if(!spent[i]&&(fin||i<upto)){spent[i]=true;for(let p=0;p<2;p++)if(rows[p][i]===9&&STD.h9show[p]){await stdH9Spend($('slot'+p+i),fired[p][i]);if(tok!==S.token)return}}   // Kéo 5 / Kéo 3 changed this slot's damage
  }};
 const {t,ctx}=await stdResolve(rows,part=>present(part,part.curSlot<0?0:part.curSlot));if(tok!==S.token)return;
 await present(t,2,true);if(tok!==S.token)return;
 // After slot 3 is done, the total damage dealt / taken of the round is applied.
 const log=t.log||[];t.log=null;STD.g=t;STD.ctx=ctx;STD.rows=rows;STD.lastLog=log.slice();stdLogPush(S.round,log,{deal:ctx.dmg[1],take:ctx.dmg[0],heal:[ctx.heal[0],ctx.heal[1]],hp:[Math.max(0,t.hp[0]),Math.max(0,t.hp[1])]});stdLogStat(S.round);
 STD.anim++;for(const c of t.hand[0])if(!g.hand[0].includes(c)){STD.fxNew.add(c);objOf(0,c).origin='new'}stdSyncCards();renderHud();renderHand();
 if(ctx.sweep>=0)msg('⚡ PERFECT SWEEP — +5 BONUS DAMAGE!');
 const before=[S.hp[0],S.hp[1]];S.hp=[t.hp[0],t.hp[1]];renderHud();
 for(let p=0;p<2;p++)if(ctx.dmg[p]>0)animateHpHit(p,ctx.dmg[p],before[p]);
 S.history.push({round:S.round,cards:S.slots[1].map(c=>c?{suit:c.suit,n:c.n}:null),playerCards:S.slots[0].map(c=>c?{suit:c.suit,n:c.n}:null),oppWins:ctx.wins[0],myWins:ctx.wins[1],oppDealt:ctx.dmg[1],myDealt:ctx.dmg[0]});
 renderHistory();renderPreviousRound();
 await sleep(reducedMotion()?150:700);if(tok!==S.token)return;
 if(ctx.combo.pack>=0){const desc=ctx.combo.pack===0?'You won the round with three sevens — instant victory!':'AI won the round with three sevens — instant victory!';if(!await stdJackpot(ctx.combo.pack,S.token))return;stdGameOver();return}
 if(t.over){stdGameOver();return}
 if(ctx.combo.zero>=0){if(!await celebrateCombo('zero',ctx.combo.zero,`${ctx.combo.zero===0?'You locked an AI slot':'AI locked one of your slots'} for the next round!`,S.token))return}
 for(let p=0;p<2;p++){if(ctx.combo.charge[p]){if(!await flashCombo('charge',S.token))return}if(ctx.combo.messup[p]){if(!await flashCombo('messup',S.token))return}}
 S.phase='discard';S.result={wins:ctx.wins,winner:ctx.winner,bothPick:ctx.bothPick};S.pickIdx=[null,null];
 S.canPick=(ctx.winner===0||ctx.bothPick)&&S.slots[0].some(Boolean);
 S.discardDeadline=Date.now()+S.discardDuration*1000;clearInterval(S.timer);S.timer=setInterval(tick,150);$('clock').classList.remove('urgent');
 markDiscards();updateButton();if(S.canPick)tick();else{await stdLossDiscard(ctx,tok);if(tok!==S.token)return;completeDiscardSelection(false)}
}
//@@FINISHROUND
async function finishRound(){if(S.phase!=='discard'||S.canPick)return;clearInterval(S.timer);
 const g=STD.g,tok=S.token;g.log=[];
 const myPick=S.pickIdx[0]!==null&&S.pickIdx[0]!==undefined&&S.slots[0][S.pickIdx[0]]?intOf(S.slots[0][S.pickIdx[0]]):null;
 const res=C.finishRound(g,STD.rows,STD.ctx,(gg,p,played,on)=>p===0&&myPick!==null&&played.includes(myPick)?myPick:C.chooseDiscardSmart(gg,p,played,on),[STD.lossPick,null]);STD.lossPick=null;
 const log=g.log;g.log=null;
 S.animateHand.clear();
 for(const c of g.hand[0]){const o=objOf(0,c);o.origin=res.drawn[0].includes(c)||STD.fxNew.has(c)?'new':STD.rows[0].includes(c)?'returned':'hand';if(o.origin!=='hand')S.animateHand.add(o.id)}
 for(const c of res.drawn[0])S.animateHand.delete(objOf(0,c).id);
 STD.fxNew.clear();STD.h9show=[false,false];S.slots=[[null,null,null],[null,null,null]];S.phase='dealing';stdSync();render();
 for(const c of res.drawn[0]){if(!g.hand[0].includes(c))continue;await animateDealtCard(objOf(0,c),tok);if(tok!==S.token)return}
 const lines=log.filter(e=>e.p===0||!e.sys||/MESS UP/.test(e.t)).map(e=>e.p===1&&e.sys?{cls:'ai',html:'<b>AI</b> '+esc(e.t)}:stdLine(e));
 STD.lastLog=STD.lastLog.concat(log.filter(e=>e.p===0||!e.sys));stdLogPush(g.round-1,log);stdLogStat(g.round-1);
 if(lines.length){await stdPanel('END OF ROUND',lines,{step:300,hold:1400});if(tok!==S.token)return}
 startRound(false)}
