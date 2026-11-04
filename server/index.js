'use strict';
/* BBK Card Game authoritative multiplayer server. No hidden opponent cards sent to clients. */
const http=require('node:http'),crypto=require('node:crypto');
const {WebSocketServer,WebSocket}=require('ws');
const PORT=Number(process.env.PORT)||10000;
const rooms=new Map(),peers=new Map();
const suits=['hammer','paper','scissors'],beats={hammer:'scissors',paper:'hammer',scissors:'paper'};
const PLAN_MS=75000,DISCARD_MS=50000,REVEAL_MS=3600;
const pick=a=>a[crypto.randomInt(a.length)];
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){let j=crypto.randomInt(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const send=(ws,data)=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data));};
function code(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let c;do{c=Array.from({length:6},()=>chars[crypto.randomInt(chars.length)]).join('')}while(rooms.has(c));return c;}
function roomCode(){let c;do{c=String(1000+crypto.randomInt(9000))}while(rooms.has(c));return c;}
function makeDeck(){return shuffle(suits.flatMap(suit=>Array.from({length:10},(_,n)=>({id:suit+'-'+n,suit,n}))));}
function dealInitial(p){for(const suit of suits){const i=p.deck.findIndex(c=>c.suit===suit);p.hand.push(p.deck.splice(i,1)[0]);}p.hand=shuffle(p.hand);while(p.hand.length<5)p.hand.push(p.deck.pop());}
function draw(p,count=1){while(count-->0&&p.deck.length)p.hand.push(p.deck.pop());}
function clash(a,b){if(!a||!b)return {winner:-1,damage:0};if(a.suit===b.suit){if(a.n===b.n)return{winner:-1,damage:0};return{winner:a.n>b.n?0:1,damage:Math.abs(a.n-b.n)};}return{winner:beats[a.suit]===b.suit?0:1,damage:a.n===b.n?a.n*2:Math.abs(a.n-b.n)};}
function isTriple(p,n){return p.slots.every(c=>c&&c.n===n);}
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
 lastResult:g.lastResult,combo:g.combo,
 discardOptions:g.phase==='discard'&&g.roundWinner===seat?me.slots.map((c,i)=>c?i:null).filter(x=>x!==null):[],
 discardSelected:me.discardSelected,
 winner:g.winner===null?null:g.winner===-1?-1:g.winner===seat?'you':'opponent',
 reason:g.reason||null};
}
function broadcast(room){if(!room.game){for(const p of room.players)send(p.ws,{type:'lobby',code:room.code,seat:p.seat,players:room.players.map(x=>({seat:x.seat,ready:x.ready})),canStart:room.players.length===2});return;}
 for(const p of room.players)send(p.ws,snapshot(room,p.seat));
}
function stopTimer(room){if(room.timer){clearTimeout(room.timer);room.timer=null;}}
function schedule(room,ms,fn){stopTimer(room);room.timer=setTimeout(()=>{if(rooms.get(room.code)===room)fn();},ms);room.timer.unref?.();}
function endGame(room,winner,reason){const g=room.game;if(!g||g.phase==='over')return;stopTimer(room);g.phase='over';g.deadline=0;g.winner=winner;g.reason=reason;broadcast(room);}
function newGame(room){
 stopTimer(room);
 const players=[0,1].map(()=>({hp:100,deck:makeDeck(),hand:[],slots:[null,null,null],discard:[],ready:false,locked:null,nextLocked:null,nextDraw:1,discardSelected:null}));
 players.forEach(dealInitial);
 room.game={players,phase:'plan',round:1,deadline:0,blocked:[null,null],sharedBlocked:[],roundWinner:-1,history:[],lastResult:null,combo:null,winner:null,reason:null};
 startPlan(room,true);
}
function configureBlocks(g){
 g.sharedBlocked=[];const left=Math.min(...g.players.map(p=>p.hand.length));
 if(left>=3||left<=0)return;
 const count=3-left,forced=g.blocked.filter(x=>x!==null);
 g.sharedBlocked=[...new Set(forced)].slice(0,count);
 const options=shuffle([0,1,2].filter(i=>!g.sharedBlocked.includes(i)));
 g.sharedBlocked.push(...options.slice(0,count-g.sharedBlocked.length));
}
function autoFill(g,p){const player=g.players[p];for(let i=0;i<3;i++)if(validSlot(g,p,i)&&!player.slots[i]&&player.hand.length){player.slots[i]=player.hand.splice(crypto.randomInt(player.hand.length),1)[0];}}
function startPlan(room,first=false){
 const g=room.game;if(!g)return;
 if(!first){for(const p of g.players)draw(p,p.nextDraw);g.players.forEach(p=>p.nextDraw=1);}
 if(g.players.every(p=>p.deck.length===0&&p.hand.length===0)){return finishByHp(room);}
 if(g.players.every(p=>p.deck.length===0)&&g.players.some(p=>p.hand.length===0)){return finishByHp(room);}
 g.blocked=g.players.map(p=>p.nextLocked);g.players.forEach(p=>{p.nextLocked=null;p.slots=[null,null,null];p.ready=false;p.discardSelected=null;});
 configureBlocks(g);g.phase='plan';g.combo=null;g.lastResult=null;g.roundWinner=-1;
 g.deadline=Date.now()+PLAN_MS;broadcast(room);schedule(room,PLAN_MS,()=>resolveRound(room));
}
function finishByHp(room){const g=room.game;endGame(room,g.players[0].hp===g.players[1].hp?-1:g.players[0].hp>g.players[1].hp?0:1,'No playable cards remain');}
function roundWins(g,wins){const shortened=g.sharedBlocked.length>0||g.blocked.some(x=>x!==null)||g.players.some(p=>p.slots.some(x=>!x));return shortened?(wins[0]===wins[1]?-1:wins[0]>wins[1]?0:1):wins[0]>=2?0:wins[1]>=2?1:-1;}
function resolveRound(room){
 const g=room.game;if(!g||g.phase!=='plan')return;
 stopTimer(room);g.players.forEach((p,i)=>autoFill(g,i));
 const wins=[0,0],damageTaken=[0,0],outcomes=[];
 const used=[0,1,2].filter(i=>g.players[0].slots[i]||g.players[1].slots[i]);
 const left=[0,1].map(p=>used.filter(i=>g.players[p].slots[i]));
 const pairs=[];for(const i of left[0].slice())if(left[1].includes(i)){pairs.push([i,i]);left[0].splice(left[0].indexOf(i),1);left[1].splice(left[1].indexOf(i),1);}
 while(left[0].length&&left[1].length)pairs.push([left[0].shift(),left[1].shift()]);
 for(const [i,j] of pairs){
   const a=g.players[0].slots[i],b=g.players[1].slots[j],r=clash(a,b);
   outcomes.push({slots:[i,j],winner:r.winner,damage:r.damage});
   if(r.winner>=0){wins[r.winner]++;const loser=1-r.winner;g.players[loser].hp-=r.damage;damageTaken[loser]+=r.damage;}
 }
 const winner=roundWins(g,wins);
 if(wins[0]===3||wins[1]===3){const loser=wins[0]===3?1:0;g.players[loser].hp-=5;damageTaken[loser]+=5;}
 const combo=[];
 const pack=[0,1].find(i=>winner===i&&isTriple(g.players[i],7));
 if(pack!==undefined)combo.push({kind:'pack',owner:pack,title:'PACK JOT WIN',description:'Instant victory'});
 const kiants=[0,1].find(i=>winner===1-i&&isTriple(g.players[i],9));
 if(kiants!==undefined){g.players[kiants].hp-=damageTaken[kiants];g.players[1-kiants].nextDraw=2;combo.push({kind:'kiants',owner:kiants,title:'KIANTS GILLER',description:'Double round damage and bonus draw'});}
 for(let p=0;p<2;p++)if(winner===p&&isTriple(g.players[p],0)){const target=1-p,slot=crypto.randomInt(3);g.players[target].nextLocked=slot;combo.push({kind:'zero',owner:p,title:'ZERO TO HERO CALL',description:'One enemy slot sealed next round',slot});}
 g.roundWinner=winner;
 g.lastResult={round:g.round,wins,damageTaken,slots:g.players.map(p=>p.slots),outcomes,roundWinner:winner,fullSweep:wins.includes(3)};
 g.history.push({round:g.round,cards:g.players.map(p=>p.slots.map(c=>c?{suit:c.suit,n:c.n}:null)),result:{wins,damageTaken}});
 g.combo=combo;g.phase='reveal';g.deadline=Date.now()+REVEAL_MS;broadcast(room);
 schedule(room,REVEAL_MS,()=>{
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
 g.players.forEach((p,i)=>{p.discardSelected=null;if(g.roundWinner!==i)p.discardSelected=chooseDiscardIndex(p);});
 broadcast(room);
 if(g.roundWinner===-1||g.players[g.roundWinner].discardSelected!==null)return finishDiscard(room);
 schedule(room,DISCARD_MS,()=>finishDiscard(room));
}
function chooseDiscardIndex(p){const list=p.slots.map((c,i)=>c?i:null).filter(x=>x!==null);return list.length?pick(list):null;}
function finishDiscard(room){
 const g=room.game;if(!g||g.phase!=='discard')return;
 stopTimer(room);
 for(let i=0;i<2;i++){
   const p=g.players[i];if(p.discardSelected===null)p.discardSelected=chooseDiscardIndex(p);
   p.slots.forEach((c,k)=>{if(!c)return;if(k===p.discardSelected)p.discard.push(c);else p.hand.push(c);});
 }
 g.round++;startPlan(room);
}
function leave(ws){
 const info=peers.get(ws);if(!info)return;peers.delete(ws);
 const room=rooms.get(info.code);if(!room)return;
 if(room.game&&room.game.phase!=='over')endGame(room,1-info.seat,'Opponent disconnected / forfeited');
 room.players=room.players.filter(p=>p.ws!==ws);
 if(!room.players.length){stopTimer(room);rooms.delete(room.code);return;}
 // Allow survivor to start new game with the next visitor.
 room.game=null;room.players.forEach(p=>p.ready=false);broadcast(room);
}
const server=http.createServer((req,res)=>{
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Access-Control-Allow-Origin','*');
 const body=req.url==='/health'||req.url==='/'?{status:'online',name:'BBK Card Game',mode:'authoritative-1v1',rooms:rooms.size}:{error:'Not found'};
 res.writeHead(body.error?404:200);res.end(JSON.stringify(body));
});
const wss=new WebSocketServer({server,maxPayload:4096});
wss.on('connection',ws=>{
 ws.alive=true;ws.on('pong',()=>ws.alive=true);
 send(ws,{type:'welcome',message:'Connected to BBK Card Game server'});
 ws.on('message',raw=>{
  let msg;try{msg=JSON.parse(raw.toString());}catch{return send(ws,{type:'error',message:'Invalid message'});}
  if(!msg||typeof msg.type!=='string')return;
  const info=peers.get(ws),room=info?rooms.get(info.code):null,g=room?.game;
  // Both players type the same three-digit number. First arrival creates a
  // room; second arrival joins it. Strings preserve leading zeros (e.g. 007).
  if(msg.type==='enter_room'){
    if(info)return send(ws,{type:'error',message:'You are already in a room'});
    const id=String(msg.code??'').trim();
    if(!/^\d{3}$/.test(id))return send(ws,{type:'error',message:'Enter exactly 3 digits (000–999)'});
    let r=rooms.get(id);
    if(!r){
      if(rooms.size>=1000)return send(ws,{type:'error',message:'Server room limit reached'});
      r={code:id,players:[{seat:0,ws,ready:false}],game:null,timer:null};
      rooms.set(id,r);peers.set(ws,{code:id,seat:0});broadcast(r);return;
    }
    if(r.players.length>=2||r.game)return send(ws,{type:'error',message:'Room '+id+' is full or a match is in progress. Choose another number.'});
    const seat=r.players.some(p=>p.seat===0)?1:0;
    r.players.push({seat,ws,ready:false});peers.set(ws,{code:id,seat});broadcast(r);return;
  }
  // Simple flow: create_room gets a server-made 4-digit code; join_room enters an existing room by that code.
  if(msg.type==='create_room'){
    if(info)return send(ws,{type:'error',message:'You are already in a room'});
    if(rooms.size>=1000)return send(ws,{type:'error',message:'Server room limit reached'});
    const id=roomCode(),r={code:id,players:[{seat:0,ws,ready:false}],game:null,timer:null};
    rooms.set(id,r);peers.set(ws,{code:id,seat:0});broadcast(r);return;
  }
  if(msg.type==='join_room'){
    if(info)return send(ws,{type:'error',message:'You are already in a room'});
    const id=String(msg.code??'').trim();
    if(!/^\d{3,4}$/.test(id))return send(ws,{type:'error',message:'Enter the 4-digit room code'});
    const r=rooms.get(id);
    if(!r)return send(ws,{type:'error',message:'Room '+id+' not found. Check the code or ask your friend for a new one.'});
    if(r.players.length>=2||r.game)return send(ws,{type:'error',message:'Room '+id+' is full or a match is in progress.'});
    const seat=r.players.some(p=>p.seat===0)?1:0;
    r.players.push({seat,ws,ready:false});peers.set(ws,{code:id,seat});broadcast(r);return;
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
  if(msg.type==='discard'&&g.phase==='discard'&&g.roundWinner===info.seat){
    if(!Number.isInteger(msg.slot)||!p.slots[msg.slot])return;
    p.discardSelected=msg.slot;finishDiscard(room);return;
  }
 });
 ws.on('close',()=>leave(ws));ws.on('error',()=>leave(ws));
});
const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},30000);heartbeat.unref();
server.listen(PORT,'0.0.0.0',()=>console.log('BBK authoritative online server on',PORT));
