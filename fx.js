/* BBK clash effects: forge-sparks (hammer>scissors), fast paper cut (scissors>paper), wrap + freeze + shatter (paper>hammer).
   Smooth canvas drawing, power (0.75..3.2) scales every effect. */
(function(){
'use strict';
const R=(a,b)=>a+Math.random()*(b-a),PK=a=>a[Math.floor(Math.random()*a.length)],TAU=Math.PI*2;
let cv,c,items=[],raf=0,last=0,dpr=1;
function init(){if(cv&&cv.isConnected)return;cv=document.createElement('canvas');cv.style.cssText='position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:1004';dpr=Math.min(2,window.devicePixelRatio||1);cv.width=Math.ceil(innerWidth*dpr);cv.height=Math.ceil(innerHeight*dpr);document.body.appendChild(cv);c=cv.getContext('2d')}
function loop(t){const dt=Math.min(.05,(t-last)/1000||.016);last=t;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,innerWidth,innerHeight);items=items.filter(f=>f(c,dt)!==false);if(items.length)raf=requestAnimationFrame(loop);else{raf=0;cv.remove();cv=null}}
function add(f){init();items.push(f);if(!raf){last=performance.now();raf=requestAnimationFrame(loop)}}
const ease=k=>1-Math.pow(1-k,3);
// timed item: fn(ctx,age,dt) returns false when finished
function at(delay,life,fn){let a=-delay;return(ctx,dt)=>{a+=dt;if(a<0)return true;if(a>life)return false;ctx.save();fn(ctx,a,a/life);ctx.restore()}}
function glow(x,y,r,life,rgb,peak,delay){return at(delay||0,life,(g,a,k)=>{g.globalCompositeOperation='lighter';const q=g.createRadialGradient(x,y,0,x,y,r),al=peak*(1-k);q.addColorStop(0,`rgba(${rgb},${al})`);q.addColorStop(.45,`rgba(${rgb},${al*.4})`);q.addColorStop(1,`rgba(${rgb},0)`);g.fillStyle=q;g.fillRect(x-r,y-r,r*2,r*2)})}
function glint(x,y,len,life){return at(0,life,(g,a,k)=>{g.globalCompositeOperation='lighter';const l=len*(1-k*.4),w=3*(1-k);g.fillStyle=`rgba(255,244,214,${1-k})`;for(const [ang,m] of [[0,1],[Math.PI/2,.8],[Math.PI/4,.5],[-Math.PI/4,.5]]){g.save();g.translate(x,y);g.rotate(ang);g.beginPath();g.moveTo(-l*m,0);g.lineTo(0,-w);g.lineTo(l*m,0);g.lineTo(0,w);g.closePath();g.fill();g.restore()}})}
// forge spark: glowing streak, colour cools white -> yellow -> orange -> dull red
function spark(x,y,vx,vy,life,w){let a=0,px=x,py=y;return(g,dt)=>{a+=dt;if(a>life)return false;vy+=900*dt;vx*=1-1.1*dt;px=x;py=y;x+=vx*dt;y+=vy*dt;const k=a/life,col=k<.15?'255,250,225':k<.4?'255,214,110':k<.7?'255,140,40':'200,60,20';g.save();g.globalCompositeOperation='lighter';g.lineCap='round';g.strokeStyle=`rgba(${col},${1-k*.6})`;g.lineWidth=w*(1-k*.5);g.beginPath();g.moveTo(px-vx*.03,py-vy*.03);g.lineTo(x,y);g.stroke();g.restore()}}
function ember(x,y,vx,vy,life,r){let a=0;return(g,dt)=>{a+=dt;if(a>life)return false;vy-=40*dt;x+=vx*dt;y+=vy*dt;const k=a/life;g.save();g.globalCompositeOperation='lighter';g.fillStyle=`rgba(255,${Math.round(170-k*100)},50,${.9*(1-k)})`;g.beginPath();g.arc(x,y,r*(1-k*.5),0,TAU);g.fill();g.restore()}}
// rigid fragment (blade, shard, paper scrap)
function frag(o){let a=0;return(g,dt)=>{a+=dt;if(a>o.life)return false;o.vy+=(o.g||0)*dt;o.vx*=1-(o.drag||0)*dt;o.x+=o.vx*dt+(o.flutter?Math.sin(a*o.flutter)*30*dt:0);o.y+=o.vy*dt;o.rot+=o.vr*dt;const k=a/o.life;g.save();g.globalAlpha=Math.min(1,(1-k)*2);g.translate(o.x,o.y);g.rotate(o.rot);o.draw(g);g.restore()}}
function poly(g,pts){g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath()}
function label(text,x,y,p,color){const d=document.createElement('div');d.className='fx-label';d.textContent=text;d.style.cssText=`left:${x}px;top:${y}px;font-size:${Math.round(10+p*3)}px;color:${color}`;document.body.appendChild(d);setTimeout(()=>d.remove(),900)}
function jolt(v){if(FX.jolt)FX.jolt(v)}

/* ---------- HAMMER beats SCISSORS: iron on iron, forge sparks ---------- */
function smash(x,y,p){
  add(glow(x,y,70+p*34,.38,'255,150,50',.9));add(glow(x,y,26+p*10,.14,'255,250,230',1));
  add(glint(x,y,34+p*20,.2));
  const n=Math.round(22+p*20);
  for(let i=0;i<n;i++){const a=R(-Math.PI*1.05,Math.PI*.05),sp=R(160,380)+p*130;add(spark(x,y,Math.cos(a)*sp,Math.sin(a)*sp,R(.35,.85),R(1.4,2.6)))}
  for(let i=0;i<Math.round(4+p*4);i++)add(ember(x+R(-14,14),y+R(-8,8),R(-50,50),R(-90,-20),R(.7,1.3),R(1.5,2.6)));
  // steel blade fragments bounce off
  for(let i=0;i<2;i++){const d=i?1:-1;add(frag({x:x+d*6,y,vx:d*R(90,170+p*30),vy:R(-260,-150),g:900,vr:d*R(6,12),rot:R(0,3),life:.9,draw(g){const q=g.createLinearGradient(0,-14,0,14);q.addColorStop(0,'#eef2f8');q.addColorStop(.5,'#9aa4b4');q.addColorStop(1,'#5b6474');g.fillStyle=q;poly(g,[[-3,-16],[4,-12],[3,16],[-4,13]]);g.fill()}}))}
  label('CLANG!',x,y-64-p*6,p,'#ffb347');
}

/* ---------- SCISSORS beat PAPER: one hard, fast cut ---------- */
function cut(x,y,p){
  const ang=(Math.random()<.5?-1:1)*R(.55,.8),len=70+p*34,w=6+p*2.4,dx=Math.cos(ang),dy=Math.sin(ang),nx=-dy,ny=dx,bend=len*.12;
  // blade streak: tapered crescent drawn in ~60ms, hold, fade
  add(at(0,.3,(g,a,k)=>{const grow=Math.min(1,a/.06),fade=a<.12?1:1-(a-.12)/.18,L=len*grow;g.globalCompositeOperation='lighter';const pts=[],N=18;for(let i=0;i<=N;i++){const t=i/N,off=Math.sin(t*Math.PI)*bend;pts.push([x+dx*(t*2-1)*L+nx*off,y+dy*(t*2-1)*L+ny*off,Math.sin(t*Math.PI)])}
    for(const [wd,al,col] of [[w*2.4,.35,'150,220,255'],[w,1,'255,255,255']]){g.fillStyle=`rgba(${col},${al*fade})`;g.beginPath();for(let i=0;i<=N;i++)g.lineTo(pts[i][0]+nx*pts[i][2]*wd*.5,pts[i][1]+ny*pts[i][2]*wd*.5);for(let i=N;i>=0;i--)g.lineTo(pts[i][0]-nx*pts[i][2]*wd*.5,pts[i][1]-ny*pts[i][2]*wd*.5);g.closePath();g.fill()}}));
  add(glow(x,y,46+p*16,.14,'255,255,255',.8));
  // the paper itself falls into two halves along the cut line
  const W=44+p*3,H=60+p*4;
  for(const side of [-1,1]){add(at(.03,.62,(g,a,k)=>{const sep=ease(Math.min(1,a/.22))*(9+p*7)+a*18,rot=side*ease(Math.min(1,a/.4))*(.12+p*.04);g.globalAlpha=1-Math.pow(k,2.2);g.translate(x,y);g.rotate(ang);g.beginPath();g.rect(-300,side<0?-300:0,600,300);g.clip();g.translate(0,side*sep);g.rotate(-ang+rot);
    g.fillStyle='#f4ecd8';g.fillRect(-W/2,-H/2,W,H);g.strokeStyle='#cdbd98';g.lineWidth=2;g.strokeRect(-W/2+1,-H/2+1,W-2,H-2);g.fillStyle='#d8c9a6';for(let i=0;i<4;i++)g.fillRect(-W/2+6,-H/2+10+i*9,W-12,2)}))}
  // paper scraps flutter away
  for(let i=0;i<Math.round(10+p*9);i++){const s=i%2?1:-1,t=R(-.8,.8);add(frag({x:x+dx*t*len*.8,y:y+dy*t*len*.8,vx:nx*s*R(40,170)+R(-20,20),vy:ny*s*R(40,170)-R(20,70),g:260,drag:.8,flutter:R(10,20),vr:R(-9,9),rot:R(0,6),life:R(.55,1),draw(g){g.fillStyle=PK(['#f4ecd8','#e8dcc0','#fff8e6']);const w2=R(3,7),h2=R(2,5);poly(g,[[-w2,-h2],[w2,-h2*.6],[w2*.7,h2],[-w2*.8,h2*.7]]);g.fill()}}))}
  jolt(2+p*1.4);
  label('SLASH!',x,y-64-p*6,p,'#d9f3ff');
}

/* ---------- PAPER beats HAMMER: wrap, freeze, shatter ---------- */
function hammer(g,sc){g.save();g.scale(sc,sc);g.fillStyle='#7b5233';g.fillRect(-4,-6,8,44);g.fillStyle='#5d3d25';g.fillRect(1,-6,3,44);const q=g.createLinearGradient(0,-26,0,-6);q.addColorStop(0,'#d7dce6');q.addColorStop(1,'#7d8798');g.fillStyle=q;g.fillRect(-20,-26,40,20);g.fillStyle='#fff';g.globalAlpha=.5;g.fillRect(-18,-24,36,3);g.restore()}
function blob(rx,ry,n,j){const pts=[];for(let i=0;i<n;i++){const a=i/n*TAU,k=1+R(-j,j);pts.push([Math.cos(a)*rx*k,Math.sin(a)*ry*k])}return pts}
function wrap(x,y,p){
  const sc=.9+p*.12,T1=.42,T2=.82,ice=blob(30*sc,44*sc,11,.1),cracks=[];
  for(let i=0;i<5+Math.round(p*2);i++){const a=R(0,TAU),pts=[[0,0]];let r=0,aa=a;for(let s=0;s<4;s++){r+=R(9,16)*sc;aa+=R(-.5,.5);pts.push([Math.cos(aa)*r,Math.sin(aa)*r])}cracks.push(pts)}
  add(at(0,T2,(g,a,k)=>{g.translate(x,y);
    if(a<T1){hammer(g,sc);
      // paper sheets wind round the hammer and tighten
      for(let i=0;i<3;i++){const s=Math.max(0,Math.min(1,(a-i*.05)/(T1-.12)));if(s<=0)continue;const r=(42-s*20)*sc,st=i*2.1+s*7;g.lineCap='round';g.strokeStyle='#bfae86';g.lineWidth=13*sc;g.beginPath();g.ellipse(0,-2,r*.9,r*1.15,0,st,st+1.6+s*2.4);g.stroke();g.strokeStyle=i%2?'#fbf4e1':'#f1e7cf';g.lineWidth=10*sc;g.beginPath();g.ellipse(0,-2,r*.9,r*1.15,0,st,st+1.6+s*2.4);g.stroke()}
    }else{
      const s=ease(Math.min(1,(a-T1)/.2));g.save();g.scale(.75+.25*s,.75+.25*s);hammer(g,sc);
      // ice grows over the paper-wrapped hammer
      g.globalAlpha=.88*s;const q=g.createLinearGradient(-30,-44,30,44);q.addColorStop(0,'rgba(235,250,255,.92)');q.addColorStop(.5,'rgba(150,215,250,.85)');q.addColorStop(1,'rgba(110,180,235,.88)');g.fillStyle=q;poly(g,ice);g.fill();g.strokeStyle='rgba(255,255,255,.95)';g.lineWidth=2.2;g.stroke();
      g.globalAlpha=.55*s;g.strokeStyle='#fff';g.lineWidth=1.6;for(let i=0;i<4;i++){g.beginPath();g.moveTo(ice[i*2][0]*.2,ice[i*2][1]*.2);g.lineTo(ice[i*2][0]*.85,ice[i*2][1]*.85);g.stroke()}
      g.globalAlpha=.9;g.strokeStyle='#fff';g.lineWidth=1.8;const cr=Math.max(0,(a-T1-.16)/(T2-T1-.16));for(const pl of cracks){g.beginPath();pl.forEach((pt,i)=>{const t=i/(pl.length-1);if(t<=cr||i===0)i?g.lineTo(pt[0],pt[1]):g.moveTo(pt[0],pt[1])});g.stroke()}
      g.restore()}
    // cold mist while freezing
    if(a>.2){g.globalCompositeOperation='lighter';const m=Math.min(1,(a-.2)/.4),q=g.createRadialGradient(0,0,10,0,0,70*sc);q.addColorStop(0,'rgba(180,230,255,0)');q.addColorStop(.7,`rgba(180,230,255,${.2*m})`);q.addColorStop(1,'rgba(180,230,255,0)');g.fillStyle=q;g.fillRect(-80,-80,160,160)}
  }));
  // ice shatters
  setTimeout(()=>{
    add(glow(x,y,64+p*26,.3,'190,235,255',.95));jolt(2+p*1.6);
    const n=Math.round(18+p*14);
    for(let i=0;i<n;i++){const a=R(0,TAU),sp=R(90,230)+p*70,sz=R(4,8)+p*1.1,pts=[[0,-sz*1.5],[sz*R(.5,1),sz*.8],[-sz*R(.5,1),sz*.9]];add(frag({x:x+Math.cos(a)*R(0,14),y:y+Math.sin(a)*R(0,20),vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-70,g:620,vr:R(-12,12),rot:R(0,6),life:R(.6,1.1),draw(g){const q=g.createLinearGradient(-sz,-sz,sz,sz);q.addColorStop(0,'rgba(240,252,255,.95)');q.addColorStop(1,'rgba(120,190,240,.9)');g.fillStyle=q;poly(g,pts);g.fill();g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=1;g.stroke()}}))}
    for(let i=0;i<7;i++){const a=R(0,TAU),r=R(8,22);add(at(0,.6,(g,t,kk)=>{g.globalCompositeOperation='lighter';const px=x+Math.cos(a)*(r+t*70),py=y+Math.sin(a)*(r+t*60)-t*20,rr=14+t*40,q=g.createRadialGradient(px,py,0,px,py,rr);q.addColorStop(0,`rgba(210,240,255,${.35*(1-kk)})`);q.addColorStop(1,'rgba(210,240,255,0)');g.fillStyle=q;g.fillRect(px-rr,py-rr,rr*2,rr*2)}))}
  },T2*1000);
  label('FROZEN!',x,y-72-p*6,p,'#cdeeff');
}
function plain(x,y,p){add(glow(x,y,30+p*14,.2,'255,240,200',.8));for(let i=0;i<Math.round(8+p*5);i++){const a=R(0,TAU),sp=R(100,240);add(spark(x,y,Math.cos(a)*sp,Math.sin(a)*sp-40,R(.25,.5),1.6))}}
const FX={smash,cut,wrap,plain,jolt:null};
window.FX=FX;
})();
