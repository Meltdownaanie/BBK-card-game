'use strict';
/* 184 (formerly BBK) authoritative multiplayer server. No hidden opponent cards sent to clients. */
const http=require('node:http'),crypto=require('node:crypto');
const {WebSocketServer,WebSocket}=require('ws');
const brain=require('./bot');
const botNames=require('./bot-names');
const PORT=Number(process.env.PORT)||10000;
const rooms=new Map(),peers=new Map();
const userSession=new Map(),userRoom=new Map(),queue=[],casual=[];   // userId -> socket, userId -> room, ranked waiting list
let pendingRecords=0;
const env=n=>(process.env[n]||'').trim();
const SUPABASE_URL=env('SUPABASE_URL').replace(/\/+$/,''),SUPABASE_PUBLISHABLE_KEY=env('SUPABASE_PUBLISHABLE_KEY'),SUPABASE_SECRET_KEY=env('SUPABASE_SECRET_KEY');
const ACCOUNTS=!!(SUPABASE_URL&&SUPABASE_PUBLISHABLE_KEY),RANKED=ACCOUNTS&&!!SUPABASE_SECRET_KEY;
const ALLOWED_ORIGINS=env('ALLOWED_ORIGINS').split(',').map(x=>x.trim().replace(/\/+$/,'')).filter(Boolean);
const RECONNECT_MS=process.env.RECONNECT_MS===undefined?60000:Math.max(0,Number(process.env.RECONNECT_MS)||0);
const RECORD_RETRY_MS=Math.max(10,Number(process.env.RECORD_RETRY_MS)||2000);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const suits=['hammer','paper','scissors'],beats={hammer:'scissors',paper:'hammer',scissors:'paper'};
const PLAN_MS=75000,DISCARD_MS=50000,REVEAL_MS=3600,COMBO_HOLD_MS=+(process.env.COMBO_HOLD_MS||7000);
const pick=a=>a[crypto.randomInt(a.length)];
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){let j=crypto.randomInt(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const send=(ws,data)=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data));};
function code(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let c;do{c=Array.from({length:6},()=>chars[crypto.randomInt(chars.length)]).join('')}while(rooms.has(c));return c;}
function roomCode(){let c;do{c=String(1000+crypto.randomInt(9000))}while(rooms.has(c));return c;}
function makeDeck(){return shuffle(suits.flatMap(suit=>Array.from({length:10},(_,n)=>({id:suit+'-'+n,suit,n}))));}
function dealInitial(p){for(const suit of suits){const i=p.deck.findIndex(c=>c.suit===suit);p.hand.push(p.deck.splice(i,1)[0]);}p.hand=shuffle(p.hand);while(p.hand.length<5)p.hand.push(p.deck.pop());}
const MAX_HAND=10;
// Hand limit: a card drawn beyond 10 forces a random card from the hand onto the discard pile.
function draw(p,count=1){while(count-->0&&p.deck.length){p.hand.push(p.deck.pop());if(p.hand.length>MAX_HAND){const out=p.hand.splice(crypto.randomInt(p.hand.length),1)[0];p.discard.push(out);(p.overflow=p.overflow||[]).push({id:out.id,suit:out.suit,n:out.n});}}}
function clash(a,b){if(!a||!b)return {winner:-1,damage:0};if(a.suit===b.suit){if(a.n===b.n)return{winner:-1,damage:0};return{winner:a.n>b.n?0:1,damage:Math.abs(a.n-b.n)};}return{winner:beats[a.suit]===b.suit?0:1,damage:a.n===b.n?(a.n||10)*2:Math.abs(a.n-b.n)};}
function isTriple(p,n){return p.slots.every(c=>c&&c.n===n);}
// CHARGE!!!: slots 1-2-3 hold consecutive rising numbers (6 7 8), any suits. MESS UP!!!: falling numbers of one suit (8 7 6).
function isCharge(p){const s=p.slots;return s.every(Boolean)&&s[1].n===s[0].n+1&&s[2].n===s[1].n+1;}
function isMessUp(p){const s=p.slots;return s.every(Boolean)&&s[1].n===s[0].n-1&&s[2].n===s[1].n-1&&s[0].suit===s[1].suit&&s[1].suit===s[2].suit;}
function validSlot(g,p,i){return Number.isInteger(i)&&i>=0&&i<3&&g.blocked[p]!==i&&!g.sharedBlocked.includes(i);}
function required(g,p){return Math.min([0,1,2].filter(i=>validSlot(g,p,i)).length,g.players[p].hand.length+g.players[p].slots.filter(Boolean).length);}
function snapshot(room,seat){
 const g=room.game,me=g.players[seat],op=g.players[1-seat];
 return{type:'state',code:room.code,seat,phase:g.phase,round:g.round,deadline:g.deadline,
 hp:[me.hp,op.hp],deck:[me.deck.length,op.deck.length],hand:me.hand,
 opponentHandCount:op.hand.length,ownSlots:me.slots,
 opponentSlots:op.slots.map(c=>g.phase==='plan'?c?{back:true}:null:c),
 lockedOwn:[0,1,2].filter(i=>!validSlot(g,seat,i)),
 lockedOpponent:[0,1,2].filter(i=>!validSlot(g,1-seat,i)),
 ready:me.ready,opponentReady:op.ready,needed:required(g,seat),nextDraw:me.nextDraw,
 yourDiscards:me.discard,history:g.history.slice(-8).map(e=>({round:e.round,cards:e.cards[1-seat],result:e.result})),
 lastResult:g.lastResult,combo:g.combo,overflow:me.overflow||[],opponentOverflow:(op.overflow||[]).length,messUpHit:(g.messHit||[]).map(h=>({mine:h.seat===seat,card:h.seat===seat?h.card:null})),idleDiscard:(g.idleHit||[]).map(h=>({mine:h.seat===seat,card:h.seat===seat?h.card:null})),
 discardOptions:g.phase==='discard'&&picks(g,seat)&&me.discardSelected===null?me.slots.map((c,i)=>c?i:null).filter(x=>x!==null):[],
 discardSelected:me.discardSelected,
 winner:g.winner===null?null:g.winner===-1?-1:g.winner===seat?'you':'opponent',
 reason:g.reason||null,
 names:seat===0?room.names:[room.names[1],room.names[0]],ranked:!!room.ranked};
}
function broadcast(room){if(!room.game){for(const p of room.players)send(p.ws,{type:'lobby',code:room.code,seat:p.seat,players:room.players.map(x=>({seat:x.seat,ready:x.ready})),canStart:room.players.length===2});return;}
 for(const p of room.players)send(p.ws,snapshot(room,p.seat));
}
function stopTimer(room){if(room.timer){clearTimeout(room.timer);room.timer=null;}}
function schedule(room,ms,fn){stopTimer(room);room.timer=setTimeout(()=>{if(rooms.get(room.code)===room)fn();},ms);room.timer.unref?.();}
function endGame(room,winner,reason){const g=room.game;if(!g||g.phase==='over')return;stopTimer(room);g.phase='over';g.deadline=0;g.winner=winner;g.reason=reason;broadcast(room);
 if(room.ranked&&!room.recorded&&room.ids){room.recorded=true;recordResult(room,winner,reason).catch(()=>{});}
 room.players.forEach(p=>{if(p.ws&&p.ws.bot&&p.user&&userRoom.get(p.user.id)===room)userRoom.delete(p.user.id);});}   // the bot can take a new match right away
function newGame(room){
 stopTimer(room);
 const players=[0,1].map(()=>({hp:100,deck:makeDeck(),hand:[],slots:[null,null,null],discard:[],ready:false,locked:null,nextLocked:null,nextDraw:1,discardSelected:null,messUp:false}));
 players.forEach(dealInitial);
 room.names=[0,1].map(seat=>{const pl=room.players.find(x=>x.seat===seat);return (pl&&pl.user&&pl.user.name)||null;});
 room.game={players,phase:'plan',round:1,deadline:0,blocked:[null,null],sharedBlocked:[],roundWinner:-1,history:[],lastResult:null,combo:null,winner:null,reason:null};
 startPlan(room,true);
}
function configureBlocks(g){
 g.sharedBlocked=[];return;   // short hands no longer lock slots: that player just plays fewer cards, in any open slots
 const left=Math.min(...g.players.map(p=>p.hand.length));
 if(left>=3||left<=0)return;
 const count=3-left,forced=g.blocked.filter(x=>x!==null);
 g.sharedBlocked=[...new Set(forced)].slice(0,count);
 const options=shuffle([0,1,2].filter(i=>!g.sharedBlocked.includes(i)));
 g.sharedBlocked.push(...options.slice(0,count-g.sharedBlocked.length));
}
function autoFill(g,p){const player=g.players[p];for(let i=0;i<3;i++)if(validSlot(g,p,i)&&!player.slots[i]&&player.hand.length){player.slots[i]=player.hand.splice(crypto.randomInt(player.hand.length),1)[0];}}
function startPlan(room,first=false){
 const g=room.game;if(!g)return;
 if(!first){for(const p of g.players)p.overflow=[];for(const p of g.players)draw(p,p.nextDraw);g.players.forEach(p=>p.nextDraw=1);}
 if(g.players.every(p=>p.deck.length===0&&p.hand.length===0)){return finishByHp(room);}
 if(g.players.every(p=>p.deck.length===0)&&g.players.some(p=>p.hand.length===0)){return finishByHp(room);}
 g.blocked=g.players.map(p=>p.nextLocked);g.players.forEach(p=>{p.nextLocked=null;p.slots=[null,null,null];p.ready=false;p.discardSelected=null;});
 configureBlocks(g);g.phase='plan';g.combo=null;g.lastResult=null;g.roundWinner=-1;
 g.deadline=Date.now()+PLAN_MS;broadcast(room);schedule(room,PLAN_MS,()=>resolveRound(room));
}
function finishByHp(room){const g=room.game;endGame(room,g.players[0].hp===g.players[1].hp?-1:g.players[0].hp>g.players[1].hp?0:1,'No playable cards remain');}
function isShortened(g){return g.sharedBlocked.length>0||g.blocked.some(x=>x!==null)||g.players.some(p=>p.slots.some(x=>!x));}
// 2+ slot wins takes the round; with one win each and a tied slot, the bigger total damage dealt wins it.
function roundWins(g,wins,dealt){if(isShortened(g))return wins[0]===wins[1]?-1:wins[0]>wins[1]?0:1;if(wins[0]>=2)return 0;if(wins[1]>=2)return 1;if(wins[0]===1&&wins[1]===1&&dealt)return dealt[0]===dealt[1]?-1:dealt[0]>dealt[1]?0:1;return -1;}
function resolveRound(room){
 const g=room.game;if(!g||g.phase!=='plan')return;
 stopTimer(room);   // time is up: slots left empty stay empty (no random auto-fill)
 const wins=[0,0],damageTaken=[0,0],dealt=[0,0],outcomes=[];
 // Slot by slot: two cards fight; a card facing an EMPTY slot hits the other player's HP directly (0 counts as 10).
 for(let i=0;i<3;i++){
   const a=g.players[0].slots[i],b=g.players[1].slots[i];if(!a&&!b)continue;
   let r,direct=false;
   if(a&&b)r=clash(a,b);else{direct=true;r={winner:a?0:1,damage:(a||b).n||10};}
   outcomes.push({slots:[i,i],winner:r.winner,damage:r.damage,direct});
   if(r.winner>=0){wins[r.winner]++;dealt[r.winner]+=r.damage;const loser=1-r.winner;g.players[loser].hp-=r.damage;damageTaken[loser]+=r.damage;}
 }
 const winner=roundWins(g,wins,dealt);
 const bothPick=winner===-1&&!isShortened(g)&&outcomes.length===3&&outcomes.every(o=>o.winner<0);
 if(wins[0]===3||wins[1]===3){const loser=wins[0]===3?1:0;g.players[loser].hp-=5;damageTaken[loser]+=5;}
 const combo=[];
 const pack=[0,1].find(i=>winner===i&&isTriple(g.players[i],7));
 if(pack!==undefined)combo.push({kind:'pack',owner:pack,title:'PACK JOT WIN',description:'Instant victory'});
 for(let p=0;p<2;p++)if(winner===p&&isTriple(g.players[p],0)){const target=1-p,slot=crypto.randomInt(3);g.players[target].nextLocked=slot;combo.push({kind:'zero',owner:p,title:'ZERO TO HERO CALL',description:'One enemy slot sealed next round',slot});}
 for(let p=0;p<2;p++){   // these two fire whether or not the round was won
  const numbers=g.players[p].slots.map(c=>c?c.n:null),suits=g.players[p].slots.map(c=>c?c.suit:null);
  if(isCharge(g.players[p])){g.players[p].nextDraw=Math.max(g.players[p].nextDraw,2);combo.push({kind:'charge',owner:p,title:'CHARGE!!!',description:'Draws 2 cards next round',numbers,suits});}
  if(isMessUp(g.players[p])){g.players[1-p].messUp=true;combo.push({kind:'messup',owner:p,title:'MESS UP!!!',description:'A random card from the opponent’s hand is shuffled back into their deck',numbers,suits});}
 }
 g.roundWinner=winner;g.bothPick=bothPick;
 g.lastResult={round:g.round,wins,damageTaken,slots:g.players.map(p=>p.slots),outcomes,roundWinner:winner,fullSweep:wins.includes(3)};
 g.history.push({round:g.round,cards:g.players.map(p=>p.slots.map(c=>c?{suit:c.suit,n:c.n}:null)),result:{wins,damageTaken}});
 const hold=combo.some(c=>c.kind==='pack'||c.kind==='zero')?COMBO_HOLD_MS:0;   // big combo screens stay up ~7 s
 g.combo=combo;g.phase='reveal';g.deadline=Date.now()+REVEAL_MS+hold;broadcast(room);
 schedule(room,REVEAL_MS+hold,()=>{
   if(pack!==undefined)return endGame(room,pack,'PACK JOT WIN');
   if(g.players[0].hp<=0||g.players[1].hp<=0){
     const a=g.players[0].hp,b=g.players[1].hp;
     return endGame(room,a<=0&&b<=0?-1:a<=0?1:0,'HP depleted');
   }
   startDiscard(room);
 });
}
function startDiscard(room){
 const g=room.game;if(!g||g.phase!=='reveal')return;
 g.phase='discard';g.deadline=Date.now()+DISCARD_MS;
 g.players.forEach((p,i)=>{p.discardSelected=null;if(!picks(g,i))p.discardSelected=chooseDiscardIndex(p);});
 broadcast(room);
 if(g.players.every(p=>p.discardSelected!==null||!p.slots.some(Boolean)))return finishDiscard(room);
 schedule(room,DISCARD_MS,()=>finishDiscard(room));
}
function picks(g,i){return g.roundWinner===i||!!g.bothPick;}
function chooseDiscardIndex(p){const list=p.slots.map((c,i)=>c?i:null).filter(x=>x!==null);return list.length?pick(list):null;}
function finishDiscard(room){
 const g=room.game;if(!g||g.phase!=='discard')return;
 stopTimer(room);g.messHit=[];g.idleHit=[];
 for(let i=0;i<2;i++){
   const p=g.players[i];if(p.discardSelected===null)p.discardSelected=chooseDiscardIndex(p);
   const played=p.slots.some(Boolean);
   p.slots.forEach((c,k)=>{if(!c)return;if(k===p.discardSelected)p.discard.push(c);else p.hand.push(c);});
   // No card played this round: a random card from the hand is discarded.
   if(!played&&p.hand.length){const out=p.hand.splice(crypto.randomInt(p.hand.length),1)[0];p.discard.push(out);g.idleHit.push({seat:i,card:{id:out.id,suit:out.suit,n:out.n}});}
   // MESS UP!!!: once the two played cards are back in hand, one random card goes into the deck and the deck is reshuffled.
   if(p.messUp){p.messUp=false;if(p.hand.length){const out=p.hand.splice(crypto.randomInt(p.hand.length),1)[0];p.deck.push(out);p.deck=shuffle(p.deck);g.messHit.push({seat:i,card:{id:out.id,suit:out.suit,n:out.n}});}}
 }
 g.round++;startPlan(room);
}
/* ---------- accounts, ranked queue, reconnect grace ---------- */
function removePlayer(room,player){
 room.players=room.players.filter(p=>p!==player);
 if(player.user&&userRoom.get(player.user.id)===room)userRoom.delete(player.user.id);
 if(room.players.length&&room.players.every(p=>p.ws&&p.ws.bot)){room.players.forEach(p=>{peers.delete(p.ws);if(p.user&&userRoom.get(p.user.id)===room)userRoom.delete(p.user.id);});room.players=[];}
 if(!room.players.length){stopTimer(room);rooms.delete(room.code);return;}
 // A finished game stays on screen for the player who is still here; a lobby resets for the next visitor.
 if(!room.game){room.players.forEach(p=>p.ready=false);}
 broadcast(room);
}
function leave(ws){
 const info=peers.get(ws);peers.delete(ws);dequeue(ws);
 if(!info)return;
 const room=rooms.get(info.code);if(!room)return;
 const player=room.players.find(p=>p.ws===ws);if(!player)return;
 const live=room.game&&room.game.phase!=='over';
 if(room.intro){   // 'match found' screen: nothing started yet, so nothing is lost; the other player simply searches again
  clearTimeout(room.intro);room.intro=null;
  room.players.forEach(q=>{
   if(q!==player&&q.ws){peers.delete(q.ws);send(q.ws,{type:'match_cancelled',message:'Your opponent left before the match started.'});}
   if(q.user&&userRoom.get(q.user.id)===room)userRoom.delete(q.user.id);
  });
  rooms.delete(room.code);return;
 }
 if(live&&player.user&&RECONNECT_MS>0){
  // Signed-in players get a grace period: their seat is held while they reconnect.
  player.gone=true;player.ws=null;
  const other=room.players.find(p=>p!==player);
  if(other)send(other.ws,{type:'opponent_disconnected',seconds:Math.round(RECONNECT_MS/1000)});
  player.grace=setTimeout(()=>{player.grace=null;if(rooms.get(room.code)!==room||!player.gone)return;endGame(room,1-player.seat,'Opponent disconnected');removePlayer(room,player);},RECONNECT_MS);
  player.grace.unref?.();return;
 }
 if(live)endGame(room,1-player.seat,'Opponent disconnected / forfeited');
 removePlayer(room,player);
}
function fail(ws,message,extra){send(ws,Object.assign({type:'error',message},extra));}
async function sb(path,{method='GET',key,bearer,body}={}){
 const headers={apikey:key,'Content-Type':'application/json'};
 if(bearer)headers.Authorization='Bearer '+bearer;
 const res=await fetch(SUPABASE_URL+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
 const text=await res.text();let data=null;try{data=text?JSON.parse(text):null}catch{}
 return{ok:res.ok,status:res.status,data};
}
async function verifyToken(token){
 if(typeof token!=='string'||token.length<20||token.length>4096)return{invalid:true};
 const u=await sb('/auth/v1/user',{key:SUPABASE_PUBLISHABLE_KEY,bearer:token});
 if(u.status===401||u.status===403||u.status===400)return{invalid:true};
 if(!u.ok||!u.data||!UUID.test(u.data.id||''))throw new Error('auth lookup failed');
 const p=await sb('/rest/v1/profiles?select=id,display_name,rating,games,tutorial_step&id=eq.'+u.data.id,{key:SUPABASE_PUBLISHABLE_KEY,bearer:token});
 if(!p.ok||!Array.isArray(p.data)||!p.data[0])throw new Error('profile lookup failed');
 return{user:{id:u.data.id,name:p.data[0].display_name,rating:p.data[0].rating,games:Number.isFinite(Number(p.data[0].games))&&p.data[0].games!==null?Number(p.data[0].games):null,tutorial:Number(p.data[0].tutorial_step)||0}};
}
function resume(ws,user){
 const room=userRoom.get(user.id);if(!room)return false;
 const player=room.players.find(p=>p.user&&p.user.id===user.id);if(!player)return false;
 const old=player.ws;
 if(old&&old!==ws){old.replaced=true;peers.delete(old);send(old,{type:'error',message:'Signed in from another place'});try{old.close()}catch{}}
 if(player.grace){clearTimeout(player.grace);player.grace=null;}
 player.gone=false;player.ws=ws;peers.set(ws,{code:room.code,seat:player.seat});
 send(ws,{type:'auth_ok',guest:false,name:user.name,rating:user.rating,tutorial:user.tutorial,resumed:true});
 const other=room.players.find(p=>p!==player);if(other)send(other.ws,{type:'opponent_back'});
 broadcast(room);return true;
}
async function handleAuth(ws,msg){
 const seq=++ws.authSeq;
 if(msg.token===null||msg.token===undefined){
  if(!(peers.has(ws)&&ws.user&&userRoom.has(ws.user.id))){   // signing out mid-match keeps the seat until the match ends
   if(ws.user&&userSession.get(ws.user.id)===ws)userSession.delete(ws.user.id);
   ws.user=null;dequeue(ws);
  }
  return send(ws,{type:'auth_ok',guest:true});
 }
 if(!ACCOUNTS)return send(ws,{type:'auth_error',message:'Accounts are not enabled on this server yet. You can still play as a guest.'});
 let r;
 try{r=await verifyToken(msg.token);}
 catch{if(seq===ws.authSeq)send(ws,{type:'auth_error',message:'Could not check your sign-in. Try again in a moment.'});return;}
 if(seq!==ws.authSeq||ws.readyState!==WebSocket.OPEN)return;
 if(r.invalid)return send(ws,{type:'auth_error',invalid:true,message:'Your sign-in expired. Please sign in again.'});
 const user=r.user;
 if(resume(ws,user)){ws.user=user;userSession.set(user.id,ws);return;}
 const prev=userSession.get(user.id);
 if(prev&&prev!==ws){prev.replaced=true;send(prev,{type:'error',message:'Signed in from another place'});dequeue(prev);try{prev.close()}catch{}}
 userSession.set(user.id,ws);ws.user=user;
 const info=peers.get(ws),room=info&&rooms.get(info.code);
 if(room&&!room.game){const pl=room.players.find(p=>p.ws===ws);if(pl)pl.user=user;}
 send(ws,{type:'auth_ok',guest:false,name:user.name,rating:user.rating,tutorial:user.tutorial});
}
/* ---------- recording results ---------- */
async function recordResult(room,winner,reason){
 const [a,b]=room.ids,payload={p_player1:a.id,p_player2:b.id,p_result:winner===-1?'draw':winner===0?'player1':'player2',
  p_reason:String(reason||'').slice(0,80),p_rounds:room.game.round,p_ranked:true,p_match_id:room.matchId};
 pendingRecords++;
 try{
  for(let attempt=0;attempt<8;attempt++){
   try{
    const r=await sb('/rest/v1/rpc/record_match',{method:'POST',key:SUPABASE_SECRET_KEY,body:payload});
    if(r.ok&&r.data&&r.data.player1){
     [[a,r.data.player1],[b,r.data.player2]].forEach(([u,x])=>{
      const ws=userSession.get(u.id);if(ws&&ws.user){ws.user.rating=x.after;if(typeof ws.user.games==='number')ws.user.games++;}
      send(ws,{type:'rating_update',before:x.before,after:x.after});
     });return;
    }
    if(r.status>=400&&r.status<500&&r.status!==429)break; // a request that will never succeed
   }catch{}
   await new Promise(res=>{const t=setTimeout(res,Math.min(RECORD_RETRY_MS*2**attempt,5*60000));t.unref?.();});
  }
  [a,b].forEach(u=>send(userSession.get(u.id),{type:'rating_update',error:true}));
  console.error('record_match failed for',room.matchId);
 }finally{pendingRecords--;}
}
/* ---------- ranked queue ---------- */
function dequeue(ws){
 let hit=false;
 for(const list of [queue,casual]){const i=list.findIndex(q=>q.ws===ws);if(i>=0){list.splice(i,1);hit=true;}}
 return hit;
}
// Random match: first two waiting players are paired, no rating involved (guests allowed).
function pairCasual(){
 while(casual.length>=2){
  const A=casual.shift(),B=casual.shift();
  const flip=crypto.randomInt(2)===1,[p0,p1]=flip?[B,A]:[A,B];
  const id=roomCode(),room={code:id,players:[],game:null,timer:null,ranked:false};
  [p0,p1].forEach((q,seat)=>{
   room.players.push({seat,ws:q.ws,ready:true,user:q.user||null});
   peers.set(q.ws,{code:id,seat});if(q.user)userRoom.set(q.user.id,room);
  });
  rooms.set(id,room);
  const info=q=>({name:q.user?q.user.name:null,rating:q.user?q.user.rating:null});
  send(p0.ws,{type:'match_found',code:id,mode:'random',opponent:info(p1)});
  send(p1.ws,{type:'match_found',code:id,mode:'random',opponent:info(p0)});
  newGame(room);
 }
}
/* Matchmaking keeps the tiers apart: the rating window starts at +-100, widens by 50 every 10 s, and never passes +-300 (one tier).
   Players still in placement (no points lost) are only paired with placed players after both waited 30 s, so they are not free wins. */
const MM_INTRO_MS=process.env.MM_INTRO_MS!==undefined?Math.max(0,Number(process.env.MM_INTRO_MS)||0):3500;   // 'match found' screen before a ranked game starts
const PLACEMENT=5,MM_BASE=100,MM_STEP=50,MM_STEP_MS=10000,MM_CAP=300,MM_PLACEMENT_WAIT=30000,MM_HINT_MS=60000;
const placing=u=>typeof u.games==='number'&&u.games<PLACEMENT;   // unknown games count as placed
function windowFor(q,now){return Math.min(MM_CAP,MM_BASE+MM_STEP*Math.floor((now-q.since)/MM_STEP_MS));}
function canPair(A,B,now){
 if(Math.abs(A.user.rating-B.user.rating)>Math.max(windowFor(A,now),windowFor(B,now)))return false;
 if(placing(A.user)!==placing(B.user)&&Math.max(now-A.since,now-B.since)<MM_PLACEMENT_WAIT)return false;
 return true;
}
function matchmake(){
 const now=Date.now();
 queue.sort((x,y)=>x.since-y.since);
 for(let i=0;i<queue.length;i++){
  for(let j=i+1;j<queue.length;j++){
   const A=queue[i],B=queue[j];
   if(canPair(A,B,now)){queue.splice(j,1);queue.splice(i,1);startRanked(A,B);return matchmake();}
  }
 }
  // Nobody to play after BOT_WAIT_MS: a house bot (2 per rank) steps in so a new player always gets a match.
 for(let i=0;i<queue.length;i++){
  const q=queue[i];if(now-q.since<BOT_WAIT_MS)continue;
  const bot=freeBotFor(q.user);if(!bot)continue;
  queue.splice(i,1);startRanked(q,{ws:makeBotClient(bot),user:bot,since:now});return matchmake();
 }
 // Nobody close enough for a long time (few players online): tell the player once so they can pick another mode.
 queue.forEach(q=>{if(!q.hinted&&now-q.since>=MM_HINT_MS){q.hinted=true;send(q.ws,{type:'queue_hint',seconds:Math.round((now-q.since)/1000)});}});
}
function startRanked(A,B){
 const flip=crypto.randomInt(2)===1,[p0,p1]=flip?[B,A]:[A,B];
 const id=roomCode(),room={code:id,players:[],game:null,timer:null,ranked:true,ids:[p0.user,p1.user],matchId:crypto.randomUUID()};
 [p0,p1].forEach((q,seat)=>{
  room.players.push({seat,ws:q.ws,ready:true,user:q.user});
  peers.set(q.ws,{code:id,seat});userRoom.set(q.user.id,room);
 });
 rooms.set(id,room);
 const pub=u=>({name:u.name,rating:u.rating,games:typeof u.games==='number'?u.games:null});
 send(p0.ws,{type:'match_found',code:id,opponent:pub(p1.user),me:pub(p0.user),startsIn:MM_INTRO_MS});
 send(p1.ws,{type:'match_found',code:id,opponent:pub(p0.user),me:pub(p1.user),startsIn:MM_INTRO_MS});
 // Both players see who they will face first; the game (and its timers) starts when the intro ends.
 room.intro=setTimeout(()=>{room.intro=null;if(rooms.get(id)===room&&room.players.length===2)newGame(room);},MM_INTRO_MS);
 room.intro.unref?.();
}
/* ---------- house bots ---------- */
const BOT_WAIT_MS=process.env.BOT_WAIT_MS!==undefined?Math.max(0,Number(process.env.BOT_WAIT_MS)||0):20000;
const BOT_THINK=process.env.BOT_THINK_SCALE!==undefined?Math.max(0,Number(process.env.BOT_THINK_SCALE)||0):1;   // 1 = human-like pauses
let bots=[];   // {id,name,rating,games,tutorial,bot:true}; a bot is busy while userRoom has it
async function loadBots(){
 if(!RANKED)return;
 try{
  const r=await sb('/rest/v1/profiles?select=id,display_name,rating&is_bot=eq.true',{key:SUPABASE_SECRET_KEY});
  if(r.ok&&Array.isArray(r.data))bots=r.data.filter(b=>b&&b.is_bot!==false&&UUID.test(b.id||'')).map(b=>({id:b.id,name:b.display_name,rating:b.rating,games:10,tutorial:5,bot:true}));
  console.log('house bots loaded:',bots.length);
 }catch(e){console.error('could not load house bots');}
}
function freeBotFor(user){
 const free=bots.filter(b=>!userRoom.has(b.id));
 free.sort((a,b)=>Math.abs(a.rating-user.rating)-Math.abs(b.rating-user.rating));
 return free[0]||null;
}
function makeBotClient(bot){
 const ws={readyState:WebSocket.OPEN,bot:true,user:bot,level:brain.levelForRating(bot.rating),key:'',latest:null,timer:null,
  send(raw){let m;try{m=JSON.parse(raw)}catch{return}if(m&&m.type==='state')botReact(ws,m);},terminate(){},close(){}};
 return ws;
}
function botReact(ws,state){
 if(ws.memCode!==state.code){ws.memCode=state.code;ws.mem=new Map();}   // card memory lasts for one match
 for(const h of state.history||[]){const n=brain.normEntry(h,state.seat);if(n)ws.mem.set(n.round,n);}
 ws.latest=Object.assign({},state,{history:[...ws.mem.values()].sort((a,b)=>a.round-b.round)});
 let key=null,delay=0,act=null;
 if(state.phase==='plan'&&!state.ready){key=state.round+':plan';const lv=ws.level==='easy'?[4,12]:ws.level==='medium'?[7,18]:[9,24];delay=(lv[0]+Math.random()*(lv[1]-lv[0]))*1000;act=botPlan;}
 else if(state.phase==='discard'&&state.discardOptions.length&&state.discardSelected===null){key=state.round+':discard';delay=(2+Math.random()*4)*1000;act=botDiscard;}
 if(!key||key===ws.key)return;
 ws.key=key;if(ws.timer)clearTimeout(ws.timer);
 ws.timer=setTimeout(()=>{ws.timer=null;if(peers.has(ws))act(ws);},delay*BOT_THINK);ws.timer.unref?.();
}
function botPlan(ws){
 const st=ws.latest;if(!st||st.phase!=='plan'||st.ready)return;
 for(const m of brain.planMove(st,ws.level,clash))onMessage(ws,{type:'place',cardId:m.cardId,slot:m.slot});
 onMessage(ws,{type:'lock'});
}
function botDiscard(ws){
 const st=ws.latest;if(!st||st.phase!=='discard'||st.discardSelected!==null)return;
 const slot=brain.discardMove(st,ws.level);if(slot!==null)onMessage(ws,{type:'discard',slot});
}
/* Bots wear ordinary-looking names and get a new one regularly (never while in a match). */
const BOT_RENAME_MS=process.env.BOT_RENAME_HOURS!==undefined?Math.max(0,Number(process.env.BOT_RENAME_HOURS)||0)*3600000:12*3600000;
async function renameBots(){
 for(const bot of bots){
  if(userRoom.has(bot.id))continue;
  for(let attempt=0;attempt<6;attempt++){
   const name=botNames.pick(bots.map(b=>b.name));
   let r;try{r=await sb('/rest/v1/profiles?id=eq.'+bot.id,{method:'PATCH',key:SUPABASE_SECRET_KEY,body:{display_name:name}})}catch{break}
   if(r.ok){bot.name=name;break}
   if(r.status!==409)break;   // 409: a real player already uses that name, try another
  }
 }
}
loadBots().then(()=>{if(bots.length&&RANKED){renameBots().catch(()=>{});if(BOT_RENAME_MS>0){const t=setInterval(()=>renameBots().catch(()=>{}),BOT_RENAME_MS);t.unref?.();}}});
const mmTimer=setInterval(()=>{if(queue.length)matchmake();},2000);mmTimer.unref();

/* ---------- http + websocket ---------- */
const server=http.createServer((req,res)=>{
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Access-Control-Allow-Origin','*');
 const ok=req.url==='/health'||req.url==='/';
 const body=ok?{status:'online',name:'184',mode:'authoritative-1v1',rooms:rooms.size,accounts:ACCOUNTS,ranked:RANKED,queue:queue.length,casual:casual.length,bots:bots.length}:{error:'Not found'};
 res.writeHead(ok?200:404);res.end(JSON.stringify(body));
});
const wss=new WebSocketServer({server,maxPayload:4096});
function allowed(req){
 if(!ALLOWED_ORIGINS.length)return true;
 const o=req&&req.headers&&req.headers.origin;
 return !o||ALLOWED_ORIGINS.includes(o);   // non-browser clients send no Origin
}
function take(ws,cost){
 const now=Date.now();ws.tokens=Math.min(40,ws.tokens+(now-ws.tokenAt)/1000*12);ws.tokenAt=now;
 if(ws.tokens<cost)return false;ws.tokens-=cost;return true;
}
function onMessage(ws,msg){
  const info=peers.get(ws),room=info?rooms.get(info.code):null,g=room?.game;
  if(msg.type==='random_queue'){
   if(info){if(room?.game?.phase==='over')leave(ws);else return fail(ws,'You are already in a room');}
   if(ws.user&&userRoom.has(ws.user.id))return fail(ws,'You already have a match in progress');
   if(casual.some(q=>q.ws===ws)||queue.some(q=>q.ws===ws))return;
   casual.push({ws,user:ws.user,since:Date.now()});send(ws,{type:'queued',mode:'random'});pairCasual();return;
  }
  if(msg.type==='random_cancel'){dequeue(ws);return send(ws,{type:'queue_left'});}
  if(msg.type==='ranked_queue'){
   if(!RANKED)return fail(ws,'Ranked matches are not available yet.');
   if(!ws.user)return fail(ws,'Sign in to play ranked.');
   if(ws.user.tutorial<5)return fail(ws,'Finish the tutorial to unlock ranked matches.',{code:'tutorial_required'});
   {const ci=casual.findIndex(q=>q.ws===ws);if(ci>=0)casual.splice(ci,1);}
   if(info){if(room?.game?.phase==='over')leave(ws);else return fail(ws,'You are already in a room');}
   if(userRoom.has(ws.user.id))return fail(ws,'You already have a match in progress');
   if(queue.some(q=>q.ws===ws))return;
   queue.push({ws,user:ws.user,since:Date.now()});send(ws,{type:'queued',rating:ws.user.rating});matchmake();return;
  }
  if(msg.type==='ranked_cancel'){dequeue(ws);return send(ws,{type:'queue_left'});}
  // Both players type the same three-digit number. First arrival creates a
  // room; second arrival joins it. Strings preserve leading zeros (e.g. 007).
  if(msg.type==='enter_room'){
    if(info)return send(ws,{type:'error',message:'You are already in a room'});
    if(dequeue(ws))send(ws,{type:'queue_left'});
    const id=String(msg.code??'').trim();
    if(!/^\d{3}$/.test(id))return send(ws,{type:'error',message:'Enter exactly 3 digits (000–999)'});
    let r=rooms.get(id);
    if(!r){
      if(rooms.size>=1000)return send(ws,{type:'error',message:'Server room limit reached'});
      r={code:id,players:[{seat:0,ws,ready:false,user:ws.user}],game:null,timer:null};
      rooms.set(id,r);peers.set(ws,{code:id,seat:0});broadcast(r);return;
    }
    if(r.players.length>=2||r.game)return send(ws,{type:'error',message:'Room '+id+' is full or a match is in progress. Choose another number.'});
    const seat=r.players.some(p=>p.seat===0)?1:0;
    r.players.push({seat,ws,ready:false,user:ws.user});peers.set(ws,{code:id,seat});broadcast(r);return;
  }
  // Simple flow: create_room gets a server-made 4-digit code; join_room enters an existing room by that code.
  if(msg.type==='create_room'){
    if(info)return send(ws,{type:'error',message:'You are already in a room'});
    if(dequeue(ws))send(ws,{type:'queue_left'});
    if(rooms.size>=1000)return send(ws,{type:'error',message:'Server room limit reached'});
    const id=roomCode(),r={code:id,players:[{seat:0,ws,ready:false,user:ws.user}],game:null,timer:null};
    rooms.set(id,r);peers.set(ws,{code:id,seat:0});broadcast(r);return;
  }
  if(msg.type==='join_room'){
    if(info)return send(ws,{type:'error',message:'You are already in a room'});
    if(dequeue(ws))send(ws,{type:'queue_left'});
    const id=String(msg.code??'').trim();
    if(!/^\d{3,4}$/.test(id))return send(ws,{type:'error',message:'Enter the 4-digit room code'});
    const r=rooms.get(id);
    if(!r||r.ranked)return send(ws,{type:'error',message:'Room '+id+' not found. Check the code or ask your friend for a new one.'});
    if(r.players.length>=2||r.game)return send(ws,{type:'error',message:'Room '+id+' is full or a match is in progress.'});
    const seat=r.players.some(p=>p.seat===0)?1:0;
    r.players.push({seat,ws,ready:false,user:ws.user});peers.set(ws,{code:id,seat});broadcast(r);return;
  }
  if(msg.type==='leave_room'){leave(ws);return send(ws,{type:'room_left'});}
  if(msg.type==='ping')return send(ws,{type:'pong'});
  if(!info||!room)return send(ws,{type:'error',message:'Join a room first'});
  if(msg.type==='ready'&&!g){const p=room.players.find(x=>x.ws===ws);p.ready=!!msg.ready;broadcast(room);if(room.players.length===2&&room.players.every(x=>x.ready))newGame(room);return;}
  if(!g)return send(ws,{type:'error',message:'Waiting for another player'});
  const p=g.players[info.seat];
  if(msg.type==='forfeit'){return endGame(room,1-info.seat,'Forfeit');}
  if(msg.type==='place'&&g.phase==='plan'&&!p.ready){
    const slot=msg.slot;if(!validSlot(g,info.seat,slot))return;
    const i=p.hand.findIndex(x=>x.id===msg.cardId);if(i<0)return;
    const c=p.hand.splice(i,1)[0];if(p.slots[slot])p.hand.push(p.slots[slot]);p.slots[slot]=c;broadcast(room);return;
  }
  if(msg.type==='return'&&g.phase==='plan'&&!p.ready){
    const i=msg.slot;if(!validSlot(g,info.seat,i)||!p.slots[i])return;
    p.hand.push(p.slots[i]);p.slots[i]=null;broadcast(room);return;
  }
  if(msg.type==='swap'&&g.phase==='plan'&&!p.ready){
    const a=msg.from,b=msg.to;if(!validSlot(g,info.seat,a)||!validSlot(g,info.seat,b)||a===b||!p.slots[a])return;
    [p.slots[a],p.slots[b]]=[p.slots[b],p.slots[a]];broadcast(room);return;
  }
  if(msg.type==='lock'&&g.phase==='plan'){
    if(p.ready)return;
    if(p.slots.filter(Boolean).length!==required(g,info.seat))return send(ws,{type:'error',message:'Place your required cards first'});
    p.ready=true;broadcast(room);
    if(g.players.every(x=>x.ready))resolveRound(room);return;
  }
  if(msg.type==='discard'&&g.phase==='discard'&&picks(g,info.seat)){
    if(p.discardSelected!==null||!Number.isInteger(msg.slot)||!p.slots[msg.slot])return;
    p.discardSelected=msg.slot;
    if(g.players.every(x=>x.discardSelected!==null||!x.slots.some(Boolean)))finishDiscard(room);else broadcast(room);return;
  }
}
wss.on('connection',(ws,req)=>{
 if(!allowed(req)){try{ws.close(1008,'Origin not allowed')}catch{}return;}
 ws.alive=true;ws.user=null;ws.authSeq=0;ws.tokens=40;ws.tokenAt=Date.now();ws.strikes=0;
 ws.on('pong',()=>ws.alive=true);
 send(ws,{type:'welcome',message:'Connected to the 184 game server'});
 ws.on('message',raw=>{
  if(!take(ws,1)){if(++ws.strikes>50)ws.terminate();return;}
  let msg;try{msg=JSON.parse(raw.toString());}catch{return send(ws,{type:'error',message:'Invalid message'});}
  if(!msg||typeof msg.type!=='string')return;
  if(msg.type==='auth'){if(!take(ws,4))return send(ws,{type:'auth_error',message:'Too many sign-in attempts. Wait a moment.'});handleAuth(ws,msg);return;}
  onMessage(ws,msg);
 });
 ws.on('close',()=>{if(ws.replaced){dequeue(ws);return;}leave(ws);if(ws.user&&userSession.get(ws.user.id)===ws)userSession.delete(ws.user.id);});
 ws.on('error',()=>{});
});
const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},30000);heartbeat.unref();
server.listen(PORT,'0.0.0.0',()=>console.log('184 authoritative online server on',PORT,'| accounts:',ACCOUNTS,'| ranked:',RANKED));

if(process.env.BBK_TEST)module.exports={rooms};
