/* BBK clash FX v2 (DOM + canvas). FX2.play(type, winnerEl, loserEl, power, crit) -> Promise
   type: 'smash' (hammer beats scissors) | 'cut' (scissors beat paper) | 'portal' (paper beats hammer)
   power 0.75..3.2 scales everything; crit = same-number double damage. Total time ~0.45-0.6s. */
(function(){
'use strict';
const R=(a,b)=>a+Math.random()*(b-a),PK=a=>a[Math.floor(Math.random()*a.length)],TAU=Math.PI*2,ease=k=>1-Math.pow(1-k,3);
let cv,c,items=[],raf=0,last=0,dpr=1;
function init(){if(cv&&cv.isConnected)return;cv=document.createElement('canvas');cv.style.cssText='position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:1004';dpr=Math.min(2,window.devicePixelRatio||1);cv.width=Math.ceil(innerWidth*dpr);cv.height=Math.ceil(innerHeight*dpr);document.body.appendChild(cv);c=cv.getContext('2d')}
function loop(t){const dt=Math.min(.05,(t-last)/1000||.016);last=t;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,innerWidth,innerHeight);items=items.filter(f=>f(c,dt)!==false);if(items.length)raf=requestAnimationFrame(loop);else{raf=0;cv.remove();cv=null}}
function add(f){init();items.push(f);if(!raf){last=performance.now();raf=requestAnimationFrame(loop)}}
function at(delay,life,fn){let a=-delay;return(g,dt)=>{a+=dt;if(a<0)return true;if(a>life)return false;g.save();fn(g,a,a/life);g.restore()}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function anim(el,frames,opt){try{return el.animate(frames,Object.assign({fill:'forwards',easing:'cubic-bezier(.2,.8,.2,1)'},opt)).finished.catch(()=>{})}catch(e){return Promise.resolve()}}
const rc=el=>{const r=el.getBoundingClientRect();return{l:r.left,t:r.top,w:r.width,h:r.height,x:r.left+r.width/2,y:r.top+r.height/2}};
function glow(x,y,r,life,rgb,peak,delay){return at(delay||0,life,(g,a,k)=>{g.globalCompositeOperation='lighter';const q=g.createRadialGradient(x,y,0,x,y,r),al=peak*(1-k);q.addColorStop(0,`rgba(${rgb},${al})`);q.addColorStop(.45,`rgba(${rgb},${al*.4})`);q.addColorStop(1,`rgba(${rgb},0)`);g.fillStyle=q;g.fillRect(x-r,y-r,r*2,r*2)})}
function shock(x,y,r0,r1,life,rgb,w,delay){return at(delay||0,life,(g,a,k)=>{const r=r0+(r1-r0)*ease(k);g.strokeStyle=`rgba(${rgb},${1-k})`;g.lineWidth=w*(1-k*.8);g.beginPath();g.arc(x,y,r,0,TAU);g.stroke()})}
function rays(x,y,n,r0,r1,life,rgb,w,delay){const as=Array.from({length:n},(_,i)=>i/n*TAU+R(-.15,.15)),ls=as.map(()=>R(.6,1));return at(delay||0,life,(g,a,k)=>{g.globalCompositeOperation='lighter';g.lineCap='round';as.forEach((an,i)=>{const e=ease(k),a0=r0+(r1-r0)*e*.55,a1=r0+(r1-r0)*e*ls[i];g.strokeStyle=`rgba(${rgb},${1-k})`;g.lineWidth=w*(1-k);g.beginPath();g.moveTo(x+Math.cos(an)*a0,y+Math.sin(an)*a0);g.lineTo(x+Math.cos(an)*a1,y+Math.sin(an)*a1);g.stroke()})})}
function spark(x,y,vx,vy,life,w,rgbs){let a=0,px=x,py=y;rgbs=rgbs||['255,250,225','255,214,110','255,140,40','200,60,20'];return(g,dt)=>{a+=dt;if(a>life)return false;vy+=900*dt;vx*=1-1.1*dt;px=x;py=y;x+=vx*dt;y+=vy*dt;const k=a/life,col=rgbs[Math.min(3,Math.floor(k*4))];g.save();g.globalCompositeOperation='lighter';g.lineCap='round';g.strokeStyle=`rgba(${col},${1-k*.6})`;g.lineWidth=w*(1-k*.5);g.beginPath();g.moveTo(px-vx*.03,py-vy*.03);g.lineTo(x,y);g.stroke();g.restore()}}
function frag(o){let a=0;return(g,dt)=>{a+=dt;if(a>o.life)return false;o.vy+=(o.g||0)*dt;o.vx*=1-(o.drag||0)*dt;o.x+=o.vx*dt;o.y+=o.vy*dt;o.rot+=o.vr*dt;g.save();g.globalAlpha=Math.min(1,(1-a/o.life)*2);g.translate(o.x,o.y);g.rotate(o.rot);o.draw(g);g.restore()}}
function poly(g,p){g.beginPath();p.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.closePath()}
function label(text,x,y,p,color,big){const d=document.createElement('div');d.className='fx-label';d.textContent=text;d.style.cssText=`left:${x}px;top:${y}px;font-size:${Math.round((big?14:10)+p*3.2)}px;color:${color}`;document.body.appendChild(d);setTimeout(()=>d.remove(),800)}
function jolt(v){if(FX2.jolt)FX2.jolt(v)}
function flashScreen(rgb,a){const d=document.createElement('div');d.style.cssText=`position:fixed;inset:0;z-index:1003;pointer-events:none;background:rgba(${rgb},${a})`;document.body.appendChild(d);d.animate([{opacity:1},{opacity:0}],{duration:220,easing:'ease-out'}).finished.then(()=>d.remove(),()=>d.remove())}
/* CRT OVERDRIVE: one dedicated critical-damage effect shared by every clash type */
function critical(x,y,p,damage){
  if(damage==null)damage=FX2._dmg;
  const dmg=damage==null?Math.round((p-.8)/.17):damage,power=Math.min(1,Math.max(0,dmg/20)),duration=.42;
  const parts=Array.from({length:22+Math.floor(power*35)},()=>({angle:R(0,TAU),speed:50+R(0,100+power*150),size:2+R(0,6),color:PK(['#ff3b98','#35f2ff','#ffd34d','#ffffff'])}));
  jolt(5+power*6);
    let t=0;
  add((g,dt)=>{t+=dt;const progress=Math.min(1,t/duration),fade=1-progress,intensity=ease(progress);if(progress>=1)return false;
    g.save();const shake=fade*power*10;g.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
    if(progress<.65){for(let i=0;i<8+Math.floor(power*8);i++){const yy=y-110+Math.random()*220,xx=x-120+Math.random()*130;g.globalAlpha=fade*.7;g.fillStyle=i%2?'#ff3b98':'#35f2ff';g.fillRect(xx,yy,45+Math.random()*140,2+Math.random()*8)}}
    g.globalAlpha=1;
    g.save();g.strokeStyle=`rgba(53,242,255,${fade})`;g.lineWidth=6*fade+1;g.beginPath();g.ellipse(x,y,15+intensity*(70+power*90),10+intensity*(40+power*55),0,0,TAU);g.stroke();g.restore();
    for(const q of parts){const d=q.speed*progress;g.fillStyle=q.color;g.globalAlpha=fade;g.fillRect(x+Math.cos(q.angle)*d,y+Math.sin(q.angle)*d,q.size,q.size)}
    g.globalAlpha=1;
    if(progress<.16){g.fillStyle=`rgba(255,245,210,${(1-progress/.16)*.5})`;g.fillRect(-20,-20,innerWidth+40,innerHeight+40)}
    if(progress<.78){g.save();g.textAlign='center';g.textBaseline='middle';g.font='bold 25px "Press Start 2P", monospace';g.lineWidth=7;g.lineJoin='round';const ty=y-85-intensity*15;g.globalAlpha=Math.min(1,fade*2);g.strokeStyle='#080b18';g.strokeText('CRITICAL ×2',x,ty);g.fillStyle='#35f2ff';g.fillText('CRITICAL ×2',x,ty);g.restore()}
    g.restore()});
}
function clone(el){const r=el.getBoundingClientRect(),cl=el.cloneNode(true);cl.removeAttribute('id');cl.style.cssText+=`;position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0;z-index:1002;pointer-events:none;`;document.body.appendChild(cl);return cl}

/* ---------- SMASH: hammer punches, scissors card is crushed ---------- */
async function smash(win,lose,p,crit){
  const w=rc(win),l=rc(lose),dx=Math.sign(l.x-w.x)||1,dist=(l.x-w.x)-dx*l.w*.42,dy=(l.y-w.y)*.8;
  await anim(win,[{transform:'translate(0,0)',offset:0},{transform:`translate(${-dx*9}px,0) scale(1.04) rotate(${-dx*5}deg)`,offset:.3},{transform:`translate(${dist}px,${dy}px) scale(${1.14+p*.03}) rotate(${dx*5}deg)`}],{duration:120,easing:'cubic-bezier(.55,0,.95,.5)'});
  const ix=l.x-dx*l.w*.3,iy=l.y;
  // impact
  add(glow(ix,iy,50+p*24,.22,'255,230,160',.9));add(shock(ix,iy,6,46+p*20,.2,'255,255,255',6));
  add(rays(ix,iy,10+Math.round(p*3),10,60+p*22,.2,'255,240,200',3));
  for(let i=0;i<Math.round(8+p*8);i++){const a=R(-Math.PI*.9,Math.PI*.1)+(dx>0?0:0),sp=R(180,360)+p*90;add(spark(ix,iy,Math.cos(a)*sp,Math.sin(a)*sp,R(.25,.5),R(1.4,2.4)))}
  // cracks across the crushed card
  const cr=[];for(let i=0;i<6+Math.round(p*2);i++){let a=R(0,TAU),x=ix,y=iy;const pts=[[x,y]];for(let s=0;s<4;s++){a+=R(-.5,.5);x+=Math.cos(a)*R(8,15);y+=Math.sin(a)*R(8,15);pts.push([x,y])}cr.push(pts)}
  add(at(0,.34,(g,a,k)=>{g.lineCap='round';g.lineJoin='round';const f=Math.min(1,a/.06);g.globalAlpha=1-Math.max(0,(k-.6)/.4);for(const [col,wd] of [['#1b0d22',4],['#ffffff',1.6]]){g.strokeStyle=col;g.lineWidth=wd;for(const pl of cr){g.beginPath();pl.forEach((q,i)=>{if(i/(pl.length-1)<=f||i===0)i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1])});g.stroke()}}}));
  label(crit?'SMASH!!!':'SMASH!!',l.x,(crit?l.y+l.h*.72:l.y-l.h*.62-p*4),p,'#ffb347',true);jolt(4+p*1.6);if(crit)critical(ix,iy,p);
  const sq=Math.min(.52,.7-p*.05);
  anim(lose,[{transform:'none',offset:0},{transform:`translate(${dx*6}px,0) scale(${sq},1.16) skewY(${-dx*5}deg)`,offset:.2},{transform:`translate(${dx*10}px,0) scale(${sq+.12},${.62}) skewY(${dx*4}deg)`,offset:.42,opacity:1},{transform:`translate(${dx*(60+p*20)}px,${-30-p*10}px) rotate(${dx*(30+p*10)}deg) scale(.55)`,opacity:0,offset:1}],{duration:360,easing:'ease-out'});
  await anim(win,[{transform:`translate(${dist}px,${dy}px) scale(${1.14+p*.03}) rotate(${dx*5}deg)`},{transform:`translate(${dist-dx*14}px,${dy}px) scale(1.04)`,offset:.5},{transform:'translate(0,0) scale(1)'}],{duration:300,easing:'ease-out'});
}

/* ---------- CUT: green scissors snip the paper card in two ---------- */
function scissorsShape(g,x,y,ang,open,sc){g.save();g.translate(x,y);g.rotate(ang);g.scale(sc,sc);
  for(const s of [-1,1]){g.save();g.rotate(s*open);const q=g.createLinearGradient(0,-5,0,5);q.addColorStop(0,'#baffd2');q.addColorStop(1,'#1fb85a');g.fillStyle=q;g.strokeStyle='#08361b';g.lineWidth=2.2;g.lineJoin='round';poly(g,[[-6,s*-2],[44,s*-1],[46,s*3],[-6,s*5]]);g.fill();g.stroke();
   g.strokeStyle='#08361b';g.lineWidth=2.6;g.beginPath();g.arc(-14,s*8,6.5,0,TAU);g.fillStyle='#2de27a';g.fill();g.stroke();g.restore()}
  g.fillStyle='#08361b';g.beginPath();g.arc(0,0,3,0,TAU);g.fill();g.restore()}
async function cut(win,lose,p,crit){
  const l=rc(lose),w=rc(win);
  const flip=Math.random()<.5?1:-1,x0=l.l-26,y0=flip>0?l.t-18:l.t+l.h+18,x1=l.l+l.w+26,y1=flip>0?l.t+l.h+18:l.t-18,ang=Math.atan2(y1-y0,x1-x0),D=170;
  const dur=.12;let started=performance.now();
  // scissors race across with a glowing green cut line
  add(at(0,.4,(g,a,k)=>{const t=Math.min(1,a/dur),e=ease(t),px=x0+(x1-x0)*e,py=y0+(y1-y0)*e;
    g.globalCompositeOperation='lighter';g.lineCap='round';
    for(const [wd,col] of [[10+p*2,'rgba(60,255,140,.45)'],[3.6,'rgba(235,255,240,.95)']]){g.strokeStyle=col;g.lineWidth=wd*(1-Math.max(0,(a-dur)/.28));g.beginPath();g.moveTo(x0,y0);g.lineTo(px,py);g.stroke()}
    g.globalCompositeOperation='source-over';if(a<dur+.06)scissorsShape(g,px,py,ang,.06+Math.abs(Math.sin(a*70))*.38,.9+p*.07)}));
  await sleep(dur*1000-10);
  add(glow(l.x,l.y,60+p*20,.2,'80,255,150',.8));jolt(3+p*1.2);
  // the card itself falls apart in two halves along the cut
  const A=clone(lose),B=clone(lose),pa=flip>0?'polygon(0 0,100% 0,100% 100%)':'polygon(0 0,100% 0,0 100%)',pb=flip>0?'polygon(0 0,100% 100%,0 100%)':'polygon(100% 0,100% 100%,0 100%)';
  A.style.clipPath=pa;B.style.clipPath=pb;lose.style.visibility='hidden';
  const nx=-Math.sin(ang),ny=Math.cos(ang),sep=24+p*10;
  const pa_=anim(A,[{transform:'none',opacity:1},{transform:`translate(${-nx*sep}px,${-ny*sep}px) rotate(${-9-p*2}deg)`,opacity:1,offset:.45},{transform:`translate(${-nx*sep*2}px,${-ny*sep*2+30}px) rotate(${-18-p*3}deg)`,opacity:0}],{duration:360,easing:'ease-out'});
  const pb_=anim(B,[{transform:'none',opacity:1},{transform:`translate(${nx*sep}px,${ny*sep}px) rotate(${9+p*2}deg)`,opacity:1,offset:.45},{transform:`translate(${nx*sep*2}px,${ny*sep*2+30}px) rotate(${18+p*3}deg)`,opacity:0}],{duration:360,easing:'ease-out'});
  for(let i=0;i<Math.round(8+p*6);i++){const t=R(0,1),px=x0+(x1-x0)*t*.8+ (l.x-(x0+x1)/2)*0+l.w*.1,py=y0+(y1-y0)*t,s=i%2?1:-1;add(frag({x:l.l+l.w*t,y:flip>0?l.t+l.h*t:l.t+l.h*(1-t),vx:nx*s*R(60,200),vy:ny*s*R(60,200)-R(20,90),g:300,drag:.8,vr:R(-10,10),rot:R(0,6),life:R(.35,.7),draw(g){g.fillStyle=PK(['#f4ecd8','#e8dcc0','#9dffc0']);const a=R(2,5);poly(g,[[-a,-a],[a,-a*.5],[a*.6,a],[-a*.8,a*.6]]);g.fill()}}))}
  label(crit?'SLASH!!!':'SLASH!!',l.x,(crit?l.y+l.h*.72:l.y-l.h*.62-p*4),p,'#7dffb0',true);if(crit)critical(l.x,l.y,p);
  await anim(win,[{transform:'none'},{transform:`translate(${(l.x-w.x)*.12}px,${(l.y-w.y)*.1}px) scale(1.08)`,offset:.3},{transform:'none'}],{duration:260});
  await Promise.all([pa_,pb_]);A.remove();B.remove();
}

/* ---------- PORTAL: paper opens a green portal and sucks the hammer in ---------- */
async function portal(win,lose,p,crit){
  const l=rc(lose),w=rc(win),rx=34+p*7+(crit?10:0),ry=rx*1.3,life=.62,T0=performance.now();
  // swirling particles spiral into the portal
  for(let i=0;i<Math.round(16+p*8);i++){const a0=R(0,TAU),r0=R(60,110+p*14),d=R(.15,.4),tl=R(.25,.4);let a=-d;add((g,dt)=>{a+=dt;if(a<0)return true;if(a>tl)return false;const k=a/tl,r=r0*(1-ease(k)),an=a0+k*5;g.save();g.globalCompositeOperation='lighter';g.fillStyle=`rgba(${PK(['120,255,170','210,255,230','60,230,120'])},${1-k*.5})`;g.beginPath();g.arc(l.x+Math.cos(an)*r,l.y+Math.sin(an)*r*1.25,2.2*(1-k*.5),0,TAU);g.fill();g.restore()})}
  add(at(0,life,(g,a,k)=>{const open=ease(Math.min(1,a/.12)),close=a>life-.14?Math.max(0,1-(a-(life-.14))/.14):1,s=open*close;if(s<=0)return;
    g.translate(l.x,l.y);
    g.globalCompositeOperation='lighter';const q0=g.createRadialGradient(0,0,0,0,0,rx*2.1);q0.addColorStop(0,`rgba(60,255,140,${.55*s})`);q0.addColorStop(1,'rgba(60,255,140,0)');g.fillStyle=q0;g.fillRect(-rx*2.2,-rx*2.2,rx*4.4,rx*4.4);
    g.globalCompositeOperation='source-over';g.scale(s,s);
    const q=g.createRadialGradient(0,0,2,0,0,rx);q.addColorStop(0,'#00100a');q.addColorStop(.6,'#04552a');q.addColorStop(1,'#59ff9c');g.fillStyle=q;g.beginPath();g.ellipse(0,0,rx,ry,0,0,TAU);g.fill();
    for(let i=0;i<4;i++){g.strokeStyle=i%2?'#d8ffe8':'#2ee27a';g.lineWidth=3;g.lineCap='round';g.beginPath();const f=.3+i*.17;g.ellipse(0,0,rx*f,ry*f,0,a*(9+i*2)*(i%2?-1:1),a*(9+i*2)*(i%2?-1:1)+1.5);g.stroke()}
    g.strokeStyle='#e6fff0';g.lineWidth=3.2;g.beginPath();g.ellipse(0,0,rx,ry,0,0,TAU);g.stroke()}));
  add(shock(l.x,l.y,10,rx*1.6,.28,'90,255,160',5,.02));
  label(crit?'PORTAL!!!':'PORTAL!!',l.x,(crit?l.y+l.h*.72:l.y-l.h*.62-p*4),p,'#7dffb0',true);jolt(2+p);if(crit)critical(l.x,l.y,p);
  anim(win,[{transform:'none'},{transform:`translate(${(l.x-w.x)*.1}px,${(l.y-w.y)*.08}px) scale(1.1)`,offset:.35},{transform:'none'}],{duration:420});
  await sleep(90);
  // the hammer is dragged in, spinning and shrinking
  lose.style.position=lose.style.position||'relative';lose.style.zIndex=1005;
  await anim(lose,[{transform:'none',opacity:1,filter:'none'},{transform:'scale(1.06) rotate(-10deg)',offset:.18,opacity:1},{transform:'translate(0,0) scale(.05) rotate(720deg)',opacity:0,filter:'brightness(2) hue-rotate(60deg)'}],{duration:300,easing:'cubic-bezier(.6,0,.9,.4)'});
  add(glow(l.x,l.y,50+p*12,.2,'180,255,210',.9));add(shock(l.x,l.y,4,rx*1.3,.22,'200,255,225',4));
  await sleep(Math.max(0,life*1000-(performance.now()-T0))-60);
}
const FX2={play(type,win,lose,p,crit,damage){p=Math.max(.75,Math.min(3.2,p||1));FX2._dmg=damage;return({smash,cut,portal}[type])(win,lose,p,!!crit)},critical,jolt:null};
window.FX2=FX2;
})();
