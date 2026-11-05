/* BBK one-screen fit: sizes the cards (--sw / --cw) so the whole match fits the visible viewport.
   It measures the real layout (real fonts, real browser chrome) instead of guessing, so nothing can end up under a bar. */
(function(){
 var body=document.body,MIN=22,raf=0,running=false;
 function el(s){return document.querySelector(s)}
 function overflow(){
  var app=el('.app'),b=el('.board');if(!app||!b)return 0;
  return Math.max(0,app.scrollHeight-app.clientHeight,b.scrollHeight-b.clientHeight);
 }
 function limits(){
  var w=window.innerWidth,desktop=w>=980&&w/window.innerHeight>=1.25,b=el('.board');
  var bw=b?b.clientWidth:w-22,wide=(bw-12)/3-10;
  return Math.max(MIN,Math.floor(Math.min(wide,desktop?150:112)));
 }
 function set(v){body.style.setProperty('--sw',v+'px');body.style.setProperty('--cw',v+'px')}
 function fit(){
  if(running)return;running=true;
  try{
   var lo=MIN,hi=limits();
   set(hi);
   if(overflow()>0.5){
    while(hi-lo>1){var mid=(lo+hi)>>1;set(mid);if(overflow()>0.5)hi=mid;else lo=mid}
    set(lo);
   }
  }finally{running=false}
 }
 function schedule(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;fit()})}
 window.addEventListener('resize',schedule);window.addEventListener('orientationchange',schedule);
 if(window.visualViewport)window.visualViewport.addEventListener('resize',schedule);
 if(document.fonts&&document.fonts.ready)document.fonts.ready.then(schedule);
 window.addEventListener('load',schedule);
 if(window.ResizeObserver){
  var ro=new ResizeObserver(schedule);
  ['.top','.status','.hud-row','#coach','#blockAlert','.lockrow','.played-tracker','.message'].forEach(function(s){document.querySelectorAll(s).forEach(function(n){ro.observe(n)})});
  ro.observe(body);
 }
 if(window.MutationObserver){
  var mo=new MutationObserver(schedule);
  ['#coach','#blockAlert'].forEach(function(s){var n=el(s);if(n)mo.observe(n,{attributes:true,childList:true,subtree:true,characterData:true})});
  mo.observe(body,{attributes:true,attributeFilter:['class']});
 }
 schedule();
 window.BBKFit={run:fit};
})();
