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

/* ---------- simple clash: both cards meet, the winner pops in its suit colour with small sparks ---------- */
const COL={smash:['#ff7a59','255,140,100'],cut:['#6fd3a0','120,240,170'],portal:['#5aa9e8','120,190,255']};
async function clash(type,win,lose,p,crit){
  const [hex,rgb]=COL[type],w=rc(win),l=rc(lose),vx=l.x-w.x,vy=l.y-w.y,len=Math.hypot(vx,vy)||1,ux=vx/len,uy=vy/len;
  const gap=Math.max(0,len-(Math.abs(uy)>Math.abs(ux)?l.h:l.w)*.98),mx=l.x-ux*(l.w*.5),my=l.y-uy*(l.h*.5);
  win.style.zIndex=1006;lose.style.zIndex=1005;
  // 1) rush together
  const toward=gap*.5+4;
  await Promise.all([
    anim(win,[{transform:'none'},{transform:`translate(${ux*toward}px,${uy*toward}px) scale(1.08)`}],{duration:90,easing:'cubic-bezier(.5,0,.9,.5)'}),
    anim(lose,[{transform:'none'},{transform:`translate(${-ux*Math.min(gap*.5,14)}px,${-uy*Math.min(gap*.5,14)}px)`}],{duration:90,easing:'cubic-bezier(.5,0,.9,.5)'})]);
  // 2) impact: small sparks in the winner's colour
  const ix=(w.x+ux*toward+l.x)/2,iy=(w.y+uy*toward+l.y)/2;
  add(glow(ix,iy,34+p*10,.18,rgb,.9));
  const n=Math.round(7+p*5);
  for(let i=0;i<n;i++){const a=Math.atan2(uy,ux)+Math.PI+R(-1.3,1.3),sp=R(120,240)+p*50;add(spark(ix,iy,Math.cos(a)*sp,Math.sin(a)*sp-30,R(.18,.34),R(1.3,2),[ '255,255,255',rgb,rgb,rgb ]))}
  for(let i=0;i<n;i++){const a=R(0,TAU),sp=R(80,200)+p*40;add(spark(ix,iy,Math.cos(a)*sp,Math.sin(a)*sp-30,R(.16,.3),R(1.2,1.8),['255,255,255',rgb,rgb,rgb]))}
  jolt(1+p);if(crit)critical(ix,iy,p);
  const push=10+p*5;
  win.style.filter=`drop-shadow(0 0 8px ${hex}) drop-shadow(0 0 14px ${hex})`;
  const wa=anim(win,[{transform:`translate(${ux*toward}px,${uy*toward}px) scale(1.08)`},{transform:`translate(${ux*(toward+6)}px,${uy*(toward+6)}px) scale(${1.2+p*.02})`,offset:.35},{transform:`translate(${ux*(toward+4)}px,${uy*(toward+4)}px) scale(1.14)`}],{duration:260,easing:'ease-out'});
  await anim(lose,[{transform:`translate(${-ux*Math.min(gap*.5,14)}px,${-uy*Math.min(gap*.5,14)}px)`,opacity:1},{transform:`translate(${ux*push}px,${uy*push}px) rotate(${(ux>=0?1:-1)*7}deg) scale(.9)`,opacity:.75,offset:.35},{transform:`translate(${ux*(push-2)}px,${uy*(push-2)}px) rotate(${(ux>=0?1:-1)*5}deg) scale(.9)`,opacity:.6}],{duration:260,easing:'ease-out'});
  await wa;
  // 3) settle back
  await Promise.all([anim(win,[{transform:`translate(${ux*(toward+4)}px,${uy*(toward+4)}px) scale(1.14)`},{transform:'none'}],{duration:110}),anim(lose,[{transform:`translate(${ux*(push-2)}px,${uy*(push-2)}px) rotate(5deg) scale(.9)`,opacity:.6},{transform:'none',opacity:.6}],{duration:110})]);
  win.style.filter='';
}
const FX2={play(type,win,lose,p,crit,damage){p=Math.max(.75,Math.min(3.2,p||1));FX2._dmg=damage;return clash(type,win,lose,p,!!crit)},critical,jolt:null};
window.FX2=FX2;
})();
