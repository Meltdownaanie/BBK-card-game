//@@HELPERS
/* ===================== STANDARD MODE (TEST BUILD) ===================== */
const C=window.Std184;
const STD={g:null,mine:0,theirs:0,theirName:'',level:'expert',aiRow:null,ctx:null,rows:null,lastLog:[]};
const OBJ=[{},{}];
function objOf(p,c){return OBJ[p][c]||(OBJ[p][c]={id:`${p}-${ORDER[C.S(c)]}-${C.N(c)}`,suit:ORDER[C.S(c)],n:C.N(c),origin:'hand'})}
const intOf=o=>ORDER.indexOf(o.suit)*10+o.n;
const ownerOf=o=>String(o.id).charAt(0)==='1'?1:0;
const esc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
function stdActive(p,c){return !!STD.g&&(STD.g.active[p]&C.bit(c))!==0}
function stdCls(o){if(!STD.g||!/^[01]-/.test(String(o.id)))return '';const c=intOf(o);return stdActive(ownerOf(o),c)?'fx fx-t'+(C.tier(c)+1):''}
function stdStar(o){return stdCls(o)?'<i class="fx-stars" aria-hidden="true">'+'<b>★</b>'.repeat(C.tier(intOf(o))+1)+'</i>':''}
function stdTitle(o){return ''}
/* Effect tooltip: finger down on an effect card (or mouse hover) shows what the card does. A quick tap still plays the card; a long hold only reads it. */
const stdTip={el:null,card:null,t0:0,x:0,y:0,moved:false,block:false};
function stdTipHide(){if(stdTip.el)stdTip.el.hidden=true;stdTip.card=null}
function stdTipFind(x,y){const t=document.elementFromPoint(x,y);return t&&t.closest?t.closest('.card.fx'):null}
function stdTipShow(card){
 const m=/^([01])-([a-z]+)-(\d)$/.exec(card.dataset.id||'');if(!m)return;const c=ORDER.indexOf(m[2])*10+ +m[3],f=C.FX[c];if(!f)return;
 let el=stdTip.el;if(!el){el=stdTip.el=document.createElement('div');el.id='stdTip';el.setAttribute('role','tooltip');document.body.appendChild(el)}
 const t=C.tier(c)+1;el.className='std-tip t'+t;el.innerHTML='<b>'+esc(C.VI(c))+'<span>'+'★'.repeat(t)+' TIER '+t+'</span></b><i>'+esc(f[0])+'</i><p>'+esc(f[1])+'</p>';el.hidden=false;
 const r=card.getBoundingClientRect(),w=el.offsetWidth,h=el.offsetHeight;let top=r.top-h-12;if(top<6)top=Math.min(innerHeight-h-6,r.bottom+12);
 el.style.left=Math.max(6,Math.min(innerWidth-w-6,r.left+r.width/2-w/2))+'px';el.style.top=Math.max(6,top)+'px';stdTip.card=card}
function stdTipInit(){
 document.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;const card=stdTipFind(e.clientX,e.clientY);stdTip.block=false;if(!card){stdTipHide();return}
  stdTip.t0=performance.now();stdTip.x=e.clientX;stdTip.y=e.clientY;stdTip.moved=false;stdTipShow(card)},true);
 document.addEventListener('pointermove',e=>{
  if(e.pointerType==='mouse'){if(e.buttons){stdTipHide();return}const card=stdTipFind(e.clientX,e.clientY);if(card!==stdTip.card){if(card)stdTipShow(card);else stdTipHide()}return}
  if(stdTip.card&&Math.hypot(e.clientX-stdTip.x,e.clientY-stdTip.y)>9){stdTip.moved=true;stdTipHide()}},true);
 const up=e=>{if(e.pointerType==='mouse')return;if(stdTip.card&&!stdTip.moved&&performance.now()-stdTip.t0>=400){stdTip.block=true;setTimeout(()=>{stdTip.block=false},350);return}stdTipHide()};
 document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',e=>{if(e.pointerType!=='mouse')stdTipHide()},true);
 document.addEventListener('click',e=>{if(stdTip.block){stdTip.block=false;e.stopPropagation();e.preventDefault()}},true);
 addEventListener('scroll',stdTipHide,true);addEventListener('blur',stdTipHide)}
function stdBanned(p,o){return !!STD.g&&!C.allowed(STD.g,p,intOf(o))}
function stdBanText(){const g=STD.g;if(!g||!g.ban[0])return '';const l=[0,1,2].filter(s=>g.ban[0]&(1<<s)).map(s=>C.SUIT_VI[s]);return 'Round này bạn bị cấm chất '+l.join(', ')}
function stdSync(){const g=STD.g;S.hp=[g.hp[0],g.hp[1]];for(let p=0;p<2;p++){S.hand[p]=g.hand[p].map(c=>objOf(p,c));S.deck[p]=g.deck[p].map(c=>objOf(p,c));S.discard[p]=g.disc[p].map(c=>objOf(p,c))}S.blocked=[g.blocked[0]<0?null:g.blocked[0],g.blocked[1]<0?null:g.blocked[1]];S.endgameBlocked=[];S.nextBlocked=[null,null]}
function stdHud(){const g=STD.g;if(!g)return;
 for(let p=0;p<2;p++){const id=document.querySelector(p===0?'.player-hud .who-id':'.enemy-hud .who-id');if(!id)continue;let line=id.querySelector('.std-nameline');
  if(!line){line=document.createElement('div');line.className='std-nameline';const name=id.querySelector('span');name.textContent=p===0?'YOU':'AI';id.insertBefore(line,name);line.appendChild(name);const t=document.createElement('span');t.className='std-tags';line.appendChild(t)}
  const t=line.querySelector('.std-tags'),tags=[];if(g.dbl[p])tags.push('<b class="t2x">×2</b>');else if(g.dblNext[p])tags.push('<b class="t2x soon">×2</b>');if(g.cnt[p]>0)tags.push('<b class="tdc">D'+g.cnt[p]+'</b>');
  const html=tags.join('');if(t.innerHTML!==html)t.innerHTML=html}}
function stdAfterHand(){if(!STD.g)return;$('hand').querySelectorAll('button.card').forEach(b=>{const o=S.hand[0].find(x=>x.id===b.dataset.id);b.classList.toggle('std-banned',!!o&&stdBanned(0,o))})}
/* effect log panel: lines appear one by one over the board; tap to skip */
function stdPanel(title,lines,opt={}){return new Promise(res=>{
  if(!lines.length){res();return}
  document.querySelectorAll('.std-fxlog').forEach(e=>{if(e._finish)e._finish();else e.remove()});
  const board=document.querySelector('.board').getBoundingClientRect();
  const el=document.createElement('div');el.className='std-fxlog';el.style.top=Math.max(8,board.top+8)+'px';
  el.innerHTML='<div class="std-fxlog-h">'+esc(title)+'</div><div class="std-fxlog-b"></div>'+(opt.block?'<div class="std-fxlog-f">chạm để tiếp tục</div>':'');
  document.body.appendChild(el);const body=el.querySelector('.std-fxlog-b');
  let i=0,done=false,timer=null;const step=reducedMotion()?60:(opt.step||650),hold=opt.hold||1300;
  const finish=()=>{if(done)return;done=true;clearTimeout(timer);el.remove();res()};
  el._finish=finish;
  const add=()=>{if(done)return;if(i<lines.length){const d=document.createElement('div');d.className='std-line '+(lines[i].cls||'');d.innerHTML=lines[i].html;body.appendChild(d);i++;timer=setTimeout(add,step)}else timer=setTimeout(finish,hold)};
  el.addEventListener('click',()=>{if(i<lines.length){while(i<lines.length){const d=document.createElement('div');d.className='std-line '+(lines[i].cls||'');d.innerHTML=lines[i].html;body.appendChild(d);i++}clearTimeout(timer);timer=setTimeout(finish,hold)}else finish()});
  add()})}
function stdLine(e){const who=e.p===0?'BẠN':'ĐỐI THỦ';return {cls:e.p===0?'me':'ai',html:'<b>'+who+' · '+esc(C.VI(e.c))+(e.sys?'':' ★')+'</b> '+esc(e.t)}}
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
async function stdResolve(rows){
  const base=C.clone(STD.g),seed0=C.getSeed(),answers=[];
  for(;;){
    const t=C.clone(base);t.log=[];t.human=0;let qi=0;
    t.ask=spec=>{if(qi<answers.length)return answers[qi++];throw {need:spec}};
    C.setSeed(seed0);
    try{const ctx=C.resolve(t,rows);t.ask=null;t.human=-1;return {t,ctx}}
    catch(e){if(!e||!e.need)throw e;answers.push(await stdAsk(e.need))}
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
  stdTipInit();stdOpenBuilder()}
//@@NEWGAME
async function newGame(){
 S.token++;clearInterval(S.timer);C.setSeed((Date.now()^Math.floor(Math.random()*1e9))|0);
 OBJ[0]={};OBJ[1]={};STD.g=C.newGame(STD.mine,STD.theirs);STD.lastLog=[];STD.ctx=null;STD.rows=null;
 S.messUp=[false,false];S.phase='dealing';S.round=0;S.target=null;S.result=null;S.canPick=false;S.pickIdx=[null,null];S.history=[];S.playerObservations=[];S.difficulty='hard';S.dragId=null;S.animateHand.clear();S.nextDraws=[1,1];S.roundHpStart=[100,100];S.kiantsBonus=null;S.slots=[[null,null,null],[null,null,null]];
 $('difficultyStatus').textContent='STANDARD · '+(STD.level==='easy'?'EASY':STD.level==='normal'?'NORMAL':'EXPERT');
 $('comboCelebration').hidden=true;$('comboCelebration').innerHTML='';closeDiscardPile();$('overlay').hidden=true;$('stdBuilder').hidden=true;
 stdSync();renderHistory();renderPreviousRound();updateForfeitButton();render();stdFillHelp();
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
 const out=C.outcomes(rows);
 const pill=(i,w,direct,d)=>{const v=$('vs'+i);v.className='versus '+(w===0?'me':w===1?'ai':'tie');v.innerHTML=`<span class="pill">${w<0?'Tie':(direct?'Direct hit ':w===0?'Deals ':'Received ')+d}</span>`};
 for(let i=0;i<3;i++){
  const r=out[i];if(!r)continue;const a=S.slots[0][i],b=S.slots[1][i];
  const result={w:r[0],dmg:r[1],dbl:!!(a&&b&&a.suit!==b.suit&&a.n===b.n),direct:!(a&&b)};
  if(a&&b)await animateClash(i,result,tok,a,b);else await animateDirectHit(result.w,i,a||b,result.dmg,tok);
  if(tok!==S.token)return;
  pill(i,result.w,result.direct,result.dmg);
  if(result.w===0){$('slot0'+i).querySelector('.card')?.classList.add('win');$('slot1'+i).querySelector('.card')?.classList.add('lose')}
  else if(result.w===1){$('slot1'+i).querySelector('.card')?.classList.add('win');$('slot0'+i).querySelector('.card')?.classList.add('lose')}
  await sleep(reducedMotion()?80:260);if(tok!==S.token)return;
 }
 // effects: may ask the player to choose
 const {t,ctx}=await stdResolve(rows);if(tok!==S.token)return;
 const log=t.log||[];t.log=null;STD.g=t;STD.ctx=ctx;STD.rows=rows;STD.lastLog=log.slice();
 for(let i=0;i<3;i++)if(out[i]&&out[i][0]>=0&&ctx.slotDmg[i]!==out[i][1])pill(i,out[i][0],!(S.slots[0][i]&&S.slots[1][i]),ctx.slotDmg[i]);
 const lines=log.map(stdLine);
 if(ctx.sweep>=0)lines.push({cls:ctx.sweep===0?'me':'ai',html:'<b>PERFECT SWEEP</b> +5 sát thương'});
 for(let p=0;p<2;p++)if(t.dbl[p]&&ctx.dmg[1-p]>0)lines.push({cls:p===0?'me':'ai',html:'<b>'+(p===0?'BẠN':'ĐỐI THỦ')+' ×2</b> sát thương và hồi máu đang nhân đôi'});
 if(lines.length){lines.push({cls:'sum',html:'Bạn: −'+ctx.dmg[0]+(ctx.heal[0]?' / +'+ctx.heal[0]:'')+' HP · AI: −'+ctx.dmg[1]+(ctx.heal[1]?' / +'+ctx.heal[1]:'')+' HP'});await stdPanel('HIỆU ỨNG ROUND '+S.round,lines,{block:true,hold:1500});if(tok!==S.token)return}
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
 for(const c of g.hand[0]){const o=objOf(0,c);o.origin=res.drawn[0].includes(c)?'new':STD.rows[0].includes(c)?'returned':'hand';if(o.origin!=='hand')S.animateHand.add(o.id)}
 S.slots=[[null,null,null],[null,null,null]];S.phase='dealing';stdSync();render();
 const lines=log.filter(e=>e.p===0||!e.sys||/MESS UP/.test(e.t)).map(e=>e.p===1&&e.sys?{cls:'ai',html:'<b>ĐỐI THỦ</b> '+esc(e.t)}:stdLine(e));
 STD.lastLog=STD.lastLog.concat(log.filter(e=>e.p===0||!e.sys));
 if(lines.length){await stdPanel('KẾT THÚC ROUND',lines,{step:300,hold:1400});if(tok!==S.token)return}
 startRound(false)}
