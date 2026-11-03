'use strict';
/**
 * BBK Card Game - room server (phase 1: lobby and connections only).
 * This does NOT yet resolve card battles or synchronize the game state.
 */
const http = require('node:http');
const crypto = require('node:crypto');
const { WebSocketServer, WebSocket } = require('ws');
const PORT = Number(process.env.PORT) || 10000;
const MAX_ROOMS = 1000;
const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rooms = new Map();
const peers = new Map();
const send = (ws, value) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(value)); };
const roomCode = () => Array.from({length:6},()=>ROOM_CHARS[crypto.randomInt(ROOM_CHARS.length)]).join('');
function uniqueCode(){for(let i=0;i<20;i++){const c=roomCode();if(!rooms.has(c))return c;}throw new Error('Code pool busy');}
function leave(ws, notify=true){
  const seat = peers.get(ws); if(!seat)return;
  peers.delete(ws);
  const room = rooms.get(seat.code); if(!room)return;
  room.players = room.players.filter(p => p.ws !== ws);
  if(!room.players.length){rooms.delete(seat.code);return;}
  room.players.forEach(p=>{p.ready=false;if(notify)send(p.ws,{type:'opponent_left',code:seat.code});});
  broadcastLobby(room);
}
function broadcastLobby(room){
  const status={type:'lobby',code:room.code,players:room.players.map(p=>({seat:p.seat,ready:p.ready})),full:room.players.length===2};
  room.players.forEach(p=>send(p.ws,status));
}
const server=http.createServer((req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.url==='/' || req.url==='/health'){
    res.writeHead(200);
    res.end(JSON.stringify({name:'BBK Card Game server',status:'online',stage:'lobby',rooms:rooms.size}));
  }else{res.writeHead(404);res.end(JSON.stringify({error:'Not found'}));}
});
const wss=new WebSocketServer({server,maxPayload:4096});
wss.on('connection',ws=>{
  ws.isAlive=true;
  ws.on('pong',()=>{ws.isAlive=true;});
  ws.on('message',raw=>{
    let msg;try{msg=JSON.parse(raw.toString());}catch{return send(ws,{type:'error',message:'Invalid JSON'});}
    if(!msg || typeof msg.type!=='string')return;
    if(msg.type==='create_room'){
      if(peers.has(ws))return send(ws,{type:'error',message:'Leave your current room first'});
      if(rooms.size>=MAX_ROOMS)return send(ws,{type:'error',message:'Server room limit reached'});
      const code=uniqueCode(),room={code,players:[{ws,seat:0,ready:false}]};
      rooms.set(code,room);peers.set(ws,{code,seat:0});
      send(ws,{type:'room_created',code,seat:0});broadcastLobby(room);
    }else if(msg.type==='join_room'){
      if(peers.has(ws))return send(ws,{type:'error',message:'Leave your current room first'});
      const code=String(msg.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6),room=rooms.get(code);
      if(!room)return send(ws,{type:'error',message:'Room not found'});
      if(room.players.length>=2)return send(ws,{type:'error',message:'Room is full'});
      room.players.push({ws,seat:1,ready:false});peers.set(ws,{code,seat:1});
      send(ws,{type:'room_joined',code,seat:1});broadcastLobby(room);
    }else if(msg.type==='ready'){
      const seat=peers.get(ws);if(!seat)return send(ws,{type:'error',message:'Not in a room'});
      const room=rooms.get(seat.code);if(!room)return;
      const player=room.players.find(p=>p.ws===ws);if(!player)return;
      player.ready=Boolean(msg.ready);
      broadcastLobby(room);
      if(room.players.length===2 && room.players.every(p=>p.ready)){
        room.players.forEach(p=>send(p.ws,{type:'both_ready',code:room.code,message:'Connected! Online battle gameplay will be added in phase 2.'}));
        room.players.forEach(p=>p.ready=false);
      }
    }else if(msg.type==='leave_room'){
      leave(ws);send(ws,{type:'room_left'});
    }else if(msg.type==='ping'){send(ws,{type:'pong'});}
    else{send(ws,{type:'error',message:'Unsupported message type'});}
  });
  ws.on('close',()=>leave(ws));
  ws.on('error',()=>leave(ws));
  send(ws,{type:'welcome',message:'BBK Card Game lobby server'});
});
const interval=setInterval(()=>{
  for(const ws of wss.clients){
    if(!ws.isAlive){ws.terminate();continue;}
    ws.isAlive=false;ws.ping();
  }
},30000);interval.unref();
server.listen(PORT,'0.0.0.0',()=>console.log('BBK room server listening on port',PORT));
