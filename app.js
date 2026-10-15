(function(){
'use strict';
var API=(window.OURHOME_API||'').replace(/\/+$/,''),K='hd2',S=new Date(2026,8,29),MS=[30,50,100,200,365,500,1000],P=document.body.getAttribute('data-page'),ISO=/^\d{4}-\d{2}-\d{2}$/,tt;
var I={},dirty={},cfg={},D,otherSeen=0,busy=false,dead=false,timer=null,appBootAt=Date.now(),notifiedChat={},memoryFlipTimer=null,lastSyncAt=0;

/* ---------- اعتبارسنجی ---------- */
function str(v,n){return typeof v==='string'?v.slice(0,n):''}
function clean(c,v){
  if(c==='story')return ISO.test(v.d)&&str(v.t,1)?{d:v.d,t:str(v.t,120),x:str(v.x,3000),img:typeof v.img==='string'&&/^data:image\/(?:jpeg|png|webp);base64,/.test(v.img)&&v.img.length<=180000?v.img:''}:0;
  if(c==='letters')return ISO.test(v.c)&&str(v.t,1)?{f:v.f?1:0,t:str(v.t,120),x:str(v.x,20000),c:v.c,u:ISO.test(v.u)?v.u:''}:0;
  if(c==='wishes')return str(v.t,1)?{t:str(v.t,200),k:v.k?1:0,p:['low','normal','high'].indexOf(v.p)>-1?v.p:'normal',budget:Math.max(0,Math.min(1000000000,Number(v.budget)||0)),due:ISO.test(v.due)?v.due:'',owner:['0','1','both'].indexOf(String(v.owner))>-1?String(v.owner):'both',note:str(v.note,500)}:0;
  if(c==='events')return ISO.test(v.d)&&str(v.t,1)?{d:v.d,t:str(v.t,120),r:!!v.r}:0;
  return 0;
}
function norm(d){ /* برای فایل پشتیبان و داده‌ی نسخه‌ی قبل */
  if(!d||typeof d!=='object'||!Array.isArray(d.story))return null;
  var r={names:[0,1].map(function(i){return str(d.names&&d.names[i],24).trim()||['من','پارتنرم'][i]}),qa:{}};
  ['story','letters','wishes','events'].forEach(function(c){r[c]=(Array.isArray(d[c])?d[c]:[]).slice(0,2000).map(function(e){return e&&typeof e==='object'?clean(c,e):0}).filter(Boolean)});
  if(d.qa&&typeof d.qa==='object')Object.keys(d.qa).slice(0,3000).forEach(function(k){var a=d.qa[k];if(/^\d+$/.test(k)&&Array.isArray(a))r.qa[k]=[str(a[0],3000),str(a[1],3000)]});
  return r;
}

/* ---------- حافظه: هر مورد یک کلید جدا با زمان (آخرین تغییر برنده) ---------- */
function rid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,5)}
function save(){try{var safeCfg=Object.assign({},cfg);['id','tok','other','viewer'].forEach(function(k){delete safeCfg[k]});localStorage.setItem(K,JSON.stringify({I:I,cfg:safeCfg,dirty:dirty}))}catch(e){toast('ذخیره ممکن نیست؛ مرورگر در حالت خصوصی است یا حافظه پر شده. فضای ذخیره‌سازی مرورگر را بررسی کنید.')}}
function loadLS(){var r=null;try{r=JSON.parse(localStorage.getItem(K))}catch(e){}if(r&&r.I&&typeof r.I==='object'){I=r.I;dirty=r.dirty||{};cfg=r.cfg||{};return true}return false}
function build(){
  var d={names:['من','پارتنرم'],story:[],letters:[],wishes:[],events:[],qa:{}};
  Object.keys(I).forEach(function(k){
    var o=I[k],p=k.split(':'),c=p[0];if(!o||o.v===null||o.v===undefined)return;var v=o.v;
    if(c==='names'){if(typeof v==='string'&&v.trim()&&(p[1]==='0'||p[1]==='1'))d.names[+p[1]]=v.slice(0,24)}
    else if(c==='qa'){if(typeof v==='string'&&p.length===3&&/^\d+$/.test(p[1]))(d.qa[p[1]]=d.qa[p[1]]||['',''])[p[2]==='1'?1:0]=v.slice(0,3000)}
    else if(Array.isArray(d[c])&&v&&typeof v==='object'){var e=clean(c,v);if(e){e.id=p[1];d[c].push(e)}}
  });
  ['story','letters','wishes','events'].forEach(function(c){d[c].sort(function(a,b){return a.id<b.id?-1:1})});
  D=d;
}
function applyStartSetting(){var v=I['settings:start']&&I['settings:start'].v;if(!ISO.test(v||''))v=cfg.start;if(!ISO.test(v||''))v='2026-09-29';if(v==='2026-09-30')v='2026-09-29';cfg.start=v;S=new Date(v+'T12:00:00')}
function set(k,v){var prev=I[k]&&typeof I[k].t==='number'?I[k].t:0;I[k]={v:v,t:Math.max(Date.now(),prev+1)};dirty[k]=1;if(k==='settings:start')applyStartSetting();build();save();refreshChatBadge();sched()}
function imp(d){
  var n=Date.now();Object.keys(I).forEach(function(k){I[k]={v:null,t:n}});
  function put(k,v){I[k]={v:v,t:n+1}}
  d.names.forEach(function(x,i){put('names:'+i,x)});
  ['story','letters','wishes','events'].forEach(function(c){d[c].forEach(function(e,i){var o={};Object.keys(e).forEach(function(f){if(f!=='id')o[f]=e[f]});put(c+':'+rid()+i,o)})});
  Object.keys(d.qa).forEach(function(k){put('qa:'+k+':0',d.qa[k][0]);put('qa:'+k+':1',d.qa[k][1])});
  Object.keys(I).forEach(function(k){dirty[k]=1});build();save();sched();
}
if(!loadLS()){var old=null;try{old=norm(JSON.parse(localStorage.getItem('hd1')))}catch(e){}if(old){I['story:start']={v:null,t:1};imp(old)}}
/* احراز هویت: شناسه و توکن فقط از نشست معتبر ورود دریافت می‌شوند. */
var AUTH_SESSION=null;try{AUTH_SESSION=JSON.parse(localStorage.getItem('ourhome_session')||'null')}catch(e){}
if(AUTH_SESSION&&AUTH_SESSION.id&&AUTH_SESSION.session){cfg=Object.assign({},cfg,{id:AUTH_SESSION.id,tok:AUTH_SESSION.session,me:AUTH_SESSION.me,username:AUTH_SESSION.username,accountName:AUTH_SESSION.name,other:'',viewer:''});if(!localStorage.getItem('ourhome_migrated_'+AUTH_SESSION.username)){Object.keys(I).forEach(function(k){dirty[k]=1});localStorage.setItem('ourhome_migrated_'+AUTH_SESSION.username,'1')}}else{cfg={start:cfg.start||'2026-09-29',theme:cfg.theme||''};dirty={}}
if(cfg.start!=='2026-09-29')cfg.start='2026-09-29';
if(I['settings:start']&&I['settings:start'].v!=='2026-09-29'){I['settings:start']={v:'2026-09-29',t:Date.now()};dirty['settings:start']=1;}
applyStartSetting();
if(cfg.theme==='dark'||cfg.theme==='light')document.documentElement.setAttribute('data-theme',cfg.theme);
if(!I['story:start'])I['story:start']={v:{d:'2026-09-29',t:'شروع داستان ما',x:'روز اول؛ جایی که همه‌چیز شروع شد.'},t:0};
else if(I['story:start'].v&&I['story:start'].v.d==='2026-09-30'){I['story:start']={v:Object.assign({},I['story:start'].v,{d:'2026-09-29'}),t:Math.max(Date.now(),(I['story:start'].t||0)+1)};dirty['story:start']=1;}
(function(){ /* ورود از لینک دعوت ویرایش پارتنر؛ لینک‌های مشاهده‌ی قدیمی دیگر پشتیبانی نمی‌شوند */
  var h=new URLSearchParams(location.hash.slice(1)),d=h.get('d'),t=h.get('t'),p=h.get('p');
  if(API&&d&&t&&p!=='v'&&/^[a-f0-9]{16}$/.test(d)&&/^[a-f0-9]{48}$/.test(t)){
    cfg={id:d,tok:t,me:p==='a'?'a':'b',other:h.get('o')||'',start:cfg.start||'2026-09-29'};
    Object.keys(I).forEach(function(k){dirty[k]=1});
    try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}save();
  } else if(p==='v') {
    try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
  }
})();
build();
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}

/* ---------- ابزارها ---------- */
var V=document.getElementById('v');
/* Keep mobile input focus, keyboard, selection and draft text when a live render replaces the page markup. */
(function(){
  var d=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
  if(!d||!d.get||!d.set)return;
  try{Object.defineProperty(V,'innerHTML',{configurable:true,enumerable:true,get:function(){return d.get.call(this)},set:function(value){
    var a=document.activeElement,info=null;
    if(a&&V.contains(a)&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&a.id&&a.type!=='file'){
      info={id:a.id,value:a.value,start:null,end:null,direction:'none',scrollTop:a.scrollTop,scrollLeft:a.scrollLeft};
      try{info.start=a.selectionStart;info.end=a.selectionEnd;info.direction=a.selectionDirection||'none'}catch(_){}
    }
    d.set.call(this,value);
    if(info){var n=document.getElementById(info.id);if(n&&V.contains(n)&&n.tagName===a.tagName&&n.type!=='file'){
      n.value=info.value;try{n.focus({preventScroll:true})}catch(_){n.focus()}
      try{if(info.start!==null&&n.setSelectionRange)n.setSelectionRange(info.start,info.end,info.direction)}catch(_){}
      n.scrollTop=info.scrollTop;n.scrollLeft=info.scrollLeft;
    }}
  }});}catch(_){}
})();
function $(s){return document.querySelector(s)}
function fa(n){return Number(n).toLocaleString('fa-IR')}
function shD(d){return d.toLocaleDateString('fa-IR-u-ca-persian',{year:'numeric',month:'long',day:'numeric'})}
function sh(s){return shD(new Date(s+'T12:00:00'))}
function E(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pad(n){return String(n).padStart(2,'0')}
function iso(){var t=new Date();return t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate())}
function today(){var t=new Date();return new Date(t.getFullYear(),t.getMonth(),t.getDate())}
function day(){var start=new Date(S.getFullYear(),S.getMonth(),S.getDate()).getTime();return Math.max(0,Math.floor((Date.now()-start)/864e5))}
function until(s,r){var t=today(),d=new Date(s+'T00:00:00');if(r){d.setFullYear(t.getFullYear());if(d<t)d.setFullYear(t.getFullYear()+1)}return Math.round((d-t)/864e5)}
function editing(){var a=document.activeElement;return !!(a&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable))}
function toast(m){var t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=m;t.className='show';clearTimeout(tt);tt=setTimeout(function(){t.className=''},4000)}
function focusB(){var b=$('#b');if(b&&b.focus)b.focus()}
function status(t,err){
  var state='checking',detail='',now=Date.now();
  if(!t){
    if(!API){t='آدرس سرور تنظیم نشده';state='config';detail='اطلاعات فقط روی همین دستگاه ذخیره می‌شود.'}
    else if(!navigator.onLine){t='اینترنت دستگاه قطع است';state='offline';detail='پس از اتصال دوباره، همگام‌سازی تلاش می‌شود.'}
    else if(!cfg.id){t='فضای مشترک ساخته نشده';state='local';detail='فعلاً اطلاعات فقط روی همین دستگاه است.'}
    else if(dead){t='دسترسی به فضای مشترک معتبر نیست';state='error';detail='نشست یا توکن را بررسی کنید.'}
    else if(busy){t='در حال همگام‌سازی…';state='syncing';detail='تغییرات در حال ارسال یا دریافت هستند.'}
    else if(lastSyncAt){t='متصل و همگام';state='connected';detail='آخرین همگام‌سازی: '+new Date(lastSyncAt).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
    else {t='در حال بررسی اتصال به سرور…';state='checking';detail='هنوز پاسخ موفقی از فضای مشترک دریافت نشده است.'}
  } else if(err){state='error';detail='برای جزئیات بیشتر، اتصال یا تنظیمات فضای مشترک را بررسی کنید.'}
  else if(/همگام‌سازی/.test(t)){state='syncing';detail='لطفاً تا پایان ارسال اطلاعات صبر کنید.'}
  else if(/اینترنت وصل شد/.test(t)){state='checking';detail='در حال بررسی پاسخ سرور…'}
  else {state='info'}
  if(err&&!navigator.onLine){state='offline';detail='پس از اتصال دوباره، همگام‌سازی تلاش می‌شود.'}
  var s=$('#sync');
  if(!s){
    s=document.createElement('div');
    s.id='sync';
    s.setAttribute('role','status');
    s.setAttribute('aria-live','polite');
    var main=document.querySelector('main');
    if(main&&main.parentNode)main.parentNode.insertBefore(s,main);
    else document.body.insertBefore(s,document.body.firstChild);
  }
  s.className='sync state-'+state;
  s.replaceChildren();
  var dot=document.createElement('span');
  dot.className='sync-dot';
  dot.setAttribute('aria-hidden','true');
  var copy=document.createElement('span');
  copy.className='sync-copy';
  var label=document.createElement('strong');
  label.className='sync-label';
  label.textContent=t;
  copy.appendChild(label);
  if(detail){var sub=document.createElement('small');sub.className='sync-detail';sub.textContent=detail;copy.appendChild(sub)}
  if(cfg.id&&state==='connected'){
    var meta=[];
    var pending=Object.keys(dirty).length;
    if(pending)meta.push(fa(pending)+' تغییر در انتظار ارسال');
    if(otherSeen){var minutes=Math.max(0,Math.round((now-otherSeen)/60000));meta.push('آخرین فعالیت پارتنر: '+(minutes<1?'همین الان':fa(minutes)+' دقیقه پیش'))}
    if(meta.length){var extra=document.createElement('small');extra.className='sync-detail';extra.textContent=meta.join(' · ');copy.appendChild(extra)}
  }
  s.appendChild(dot);
  s.appendChild(copy);
}

/* ---------- همگام‌سازی با Worker ---------- */
function api(m,b){return fetch(API+'/api/doc/'+cfg.id,{method:m,headers:{'content-type':'application/json','x-token':cfg.tok},body:b?JSON.stringify(b):undefined}).then(function(r){return r.json().catch(function(){return{}}).then(function(j){if(!r.ok){j.status=r.status;throw j}return j})})}
function merge(r){
  var ch=false;Object.keys(r.items||{}).forEach(function(k){var x=r.items[k],l=I[k];if(x&&typeof x.t==='number'&&(!l||x.t>l.t||(x.t===l.t&&JSON.stringify(x.v)>JSON.stringify(l.v)))){I[k]={v:x.v,t:x.t};ch=true}});
  var o=cfg.me==='a'?'b':'a';if(r.seen&&r.seen[o])otherSeen=r.seen[o];
  if(ch){applyStartSetting();build();save()}refreshChatBadge();return ch;
}
function ensureSharedStart(){if(cfg.id&&API&&!I['settings:start'])set('settings:start',cfg.start||'2026-09-29')}
function sched(){clearTimeout(timer);timer=setTimeout(function(){timer=null;flush()},800)}
function flush(){
  if(!cfg.id||!API||busy||dead)return status();
  var ks=Object.keys(dirty).slice(0,200);if(!ks.length)return status();
  var body={items:{}};ks.forEach(function(k){body.items[k]=I[k]});
  var succeeded=false;
  busy=true;status('در حال همگام‌سازی…');
  api('PUT',body).then(function(r){
    succeeded=true;
    lastSyncAt=Date.now();
    notifyIncoming(r);
    ks.forEach(function(k){var s=r.items&&r.items[k];if(s&&s.t>=body.items[k].t&&I[k]===body.items[k])delete dirty[k]});
    if(merge(r)&&!editing())(R[P]||home)();ensureSharedStart();save();status();
  }).catch(function(e){
    if(e&&(e.status===401||e.status===404)){dead=true;status('لینک یا توکن فضای مشترک معتبر نیست',1);return}
    status((e&&e.error)||'ارتباط با سرور برقرار نیست؛ دوباره تلاش می‌شود',1);
  }).then(function(){busy=false;if(!dead&&Object.keys(dirty).length&&!timer)timer=setTimeout(function(){timer=null;flush()},4000);if(succeeded&&!dead)status()});
}
function poll(){
  if(document.hidden||!cfg.id||!API||busy||dead||Object.keys(dirty).length)return;
  api('GET').then(function(r){lastSyncAt=Date.now();notifyIncoming(r);if(merge(r)&&!editing()){if(P==='draw'&&typeof window.__ourhomeDrawRefresh==='function')window.__ourhomeDrawRefresh();else (R[P]||home)()}ensureSharedStart();status()}).catch(function(e){if(e&&(e.status===401||e.status===404)){dead=true;status('لینک یا توکن فضای مشترک معتبر نیست',1)}else status('ارتباط با سرور برقرار نیست',1)});
}
function shareUrl(u,title,ok){
  if(navigator.share)navigator.share({title:title,url:u}).catch(function(){});
  else if(navigator.clipboard)navigator.clipboard.writeText(u).then(function(){toast(ok)},function(){prompt('لینک را کپی کنید:',u)});
  else prompt('لینک را کپی کنید:',u);
}
function link(){
  if(!cfg.id||!cfg.other)return toast('لینک دعوت پارتنر فقط از حساب سازنده فضای مشترک در دسترس است.');
  var u=new URL('index.html',location.href).href+'#d='+cfg.id+'&t='+cfg.other+'&p=b';
  shareUrl(u,'دعوت به خانه‌ی ما','لینک ویرایش پارتنر آماده‌ی ارسال است.');
}
/* ---------- منو ---------- */
var N=[['index','🏠','خانه'],['story','📖','داستان ما'],['album','🖼️','آلبوم'],['letters','💌','نامه‌ها'],['wishes','✨','آرزوها'],['calendar','📅','تقویم'],['qa','💬','سؤال'],['pledge','📜','تعهدنامه'],['chat','💌','چت'],['games','🎮','بازی‌ها'],['draw','🎨','نقاشی زنده'],['challenges','🌟','چالش‌ها'],['achievements','🏆','دستاوردها'],['map','📍','نقشه'],['settings','⚙️','تنظیمات']];
var nv=document.createElement('nav');nv.setAttribute('aria-label','منوی اصلی');
nv.innerHTML=N.map(function(n){return '<a href="'+n[0]+'.html"'+(n[0]===P?' class="on" aria-current="page"':'')+'><b aria-hidden="true">'+n[1]+'</b>'+n[2]+(n[0]==='chat'?' <span id="chat-unread" class="chat-unread" hidden></span>':'')+'</a>'}).join('');
document.body.appendChild(nv);refreshChatBadge();

/* ---------- صفحه‌ها ---------- */
function hero(num,lbl,rest){
  return '<div class="hero"><div class="nm"><span contenteditable="true" role="textbox" aria-label="نام اول" data-i="0">'+E(D.names[0])+'</span> و <span contenteditable="true" role="textbox" aria-label="نام دوم" data-i="1">'+E(D.names[1])+'</span></div><div class="num">'+fa(num)+'</div><div class="lbl">'+lbl+'</div>'+rest+'</div>';
}
function home(){
  var n=day(),b;
  if(n<1)b=hero(1-n,'روز تا شروع','<small>از '+shD(S)+'</small>');
  else{
    var nx=MS.find(function(m){return m>n})||n+100,pv=MS.filter(function(m){return m<=n}).pop()||0,span=nx-pv,got=n-pv,vis='';
    if(span<=50){for(var i=0;i<span;i++)vis+='<i'+(i<got?' class="f"':'')+'></i>';vis='<div class="dots" aria-hidden="true">'+vis+'</div>'}
    else vis='<progress max="'+span+'" value="'+got+'" aria-label="پیشرفت تا نقطه‌عطف بعدی"></progress>';
    b=hero(n,'روز با هم','<small>از '+shD(S)+'</small>'+vis+'<small>'+fa(nx-n)+' روز تا روز '+fa(nx)+'ام ('+shD(new Date(S.getTime()+(nx-1)*864e5))+')</small>')
     +(MS.indexOf(n)>-1?'<div class="card">🎉 امروز روز '+fa(n)+'ام است!</div>':'');
  }
  var sy=!API?'':(!cfg.id?'<button id="sc">ساخت فضای مشترک دو نفره</button> ':(cfg.other?'<button id="sl">لینک ویرایش پارتنر</button> ':''));
  b += '<div class="card live-counter-card" style="text-align:center"><h3>⏱️ روزشمار لحظه‌ای رابطه</h3><div id="live-counter" data-start="'+new Date(S.getFullYear(),S.getMonth(),S.getDate()).getTime()+'" style="font-size:1.35rem;font-weight:700;line-height:2;direction:rtl" aria-live="off">در حال محاسبه…</div><small>روز · ساعت · دقیقه · ثانیه</small></div>';
  V.innerHTML=b+'<div class="go"><a href="story.html">📖 ثبت لحظه‌ی تازه</a><a href="letters.html">💌 نوشتن نامه</a><a href="wishes.html">✨ آرزوها</a><a href="calendar.html">📅 رویداد تازه</a><a href="qa.html">💬 سؤال امروز</a><a href="pledge.html">📜 تعهدنامه</a><a href="chat.html">💌 چت دونفره</a><a href="games.html">🎮 بازی‌های دونفره</a><a href="map.html">📍 نقشه و GPS</a><a href="settings.html">⚙️ تنظیمات</a></div>'
   +'<p><small>'+(cfg.id?'خاطرات، نامه‌ها، آرزوها، رویدادها و تغییرات بین هر دو نفر تقریباً زنده همگام می‌شوند.':'برای همگام‌سازی خاطرات و دسترسی پارتنر، فضای مشترک بسازید و لینک دعوت را بفرستید؛ تا قبل از آن اطلاعات فقط روی همین دستگاه است.')+'</small></p>'+sy;
  if($('#sc'))$('#sc').onclick=function(){
    if(!confirm('یک فضای مشترک ساخته می‌شود و نوشته‌های فعلی داخلش می‌رود. سپس «ارسال لینک پارتنر» را بزنید و لینک را فقط برای پارتنرتان بفرستید این لینک فقط برای پارتنر است و امکان ویرایش دارد. ادامه؟'))return;
    fetch(API+'/api/create',{method:'POST'}).then(function(r){return r.json()}).then(function(j){
      if(!j.id)throw j;cfg={id:j.id,tok:j.a,me:'a',other:j.b,start:cfg.start||'2026-09-29'};applyStartSetting();if(!I['settings:start']||!ISO.test(I['settings:start'].v))I['settings:start']={v:cfg.start,t:Date.now()};else if(I['settings:start'].v==='2026-09-30')I['settings:start']={v:'2026-09-29',t:Date.now()};Object.keys(I).forEach(function(k){dirty[k]=1});save();flush();home();link();
    }).catch(function(e){toast((e&&e.error)||'ساخت فضای مشترک ناموفق بود')});
  };
  if($('#sl'))$('#sl').onclick=link;
}

function story(showAlbum){
  var h='',photos=D.story.filter(function(s){return !!s.img}).slice().sort(function(a,b){return a.d<b.d?1:a.d>b.d?-1:a.id<b.id?1:-1});
  D.story.slice().sort(function(a,b){return a.d<b.d?-1:a.d>b.d?1:a.id<b.id?-1:1}).forEach(function(s){
    h+='<div class="card memory-entry"><small>'+sh(s.d)+'</small><h3>'+E(s.t)+'</h3><p>'+E(s.x)+'</p>'+(s.img?'<img class="memory-photo" src="'+E(s.img)+'" alt="عکس خاطره: '+E(s.t)+'" loading="lazy">':'')+'<button class="x" data-del="story:'+E(s.id)+'" aria-label="حذف «'+E(s.t)+'»">حذف</button></div>'});
  var gallery='<div class="photo-album-grid">'+photos.map(function(s){return '<button type="button" class="photo-album-item" data-album-photo="'+E(s.id)+'" aria-label="نمایش عکس '+E(s.t)+'"><img src="'+E(s.img)+'" alt="'+E(s.t)+'" loading="lazy"><span>'+E(s.t)+'</span><small>'+sh(s.d)+'</small></button>'}).join('')+'</div>';
  V.innerHTML='<h2>داستان ما 📸</h2><p class="muted">عکس‌های هر خاطره پس از ذخیره در فضای مشترک ثبت می‌شوند و خودکار به آلبوم عکس‌ها هم اضافه خواهند شد.</p><div class="album-toolbar"><button type="button" id="storyViewBtn">'+(showAlbum?'← بازگشت به داستان ما':'🖼️ آلبوم عکس‌ها ('+fa(photos.length)+')')+'</button></div>'+(showAlbum?('<h3>آلبوم عکس‌های مشترک</h3><p class="muted">عکس‌ها از خاطرات ذخیره‌شده جمع می‌شوند؛ برای دیدن عکس و شرح خاطره روی آن بزن.</p>'+(photos.length?gallery:'<div class="card muted">هنوز عکسی ثبت نشده. از بخش داستان ما یک خاطره همراه عکس ذخیره کن.</div>')):'<div class="card"><label for="a">تاریخ خاطره</label><input type="date" id="a" value="'+iso()+'" aria-label="تاریخ"><label for="b">عنوان لحظه</label><input id="b" maxlength="120" placeholder="عنوان لحظه" aria-label="عنوان لحظه"><label for="c">توضیح خاطره</label><textarea id="c" rows="2" maxlength="3000" placeholder="چه اتفاقی افتاد؟" aria-label="توضیح"></textarea><label for="photo">عکس خاطره (اختیاری)</label><input id="photo" type="file" accept="image/*,.jpg,.jpeg,.png,.webp,.avif" aria-label="انتخاب عکس خاطره"><small>فرمت JPG، PNG یا WebP؛ حداکثر فایل اولیه ۱۲ مگابایت. عکس فشرده و همراه خاطره در فضای مشترک ذخیره می‌شود.</small><button id="ad">ذخیره‌ی خاطره</button></div>'+(h||'<p class="muted">هنوز خاطره‌ای ثبت نشده؛ اولین خاطره‌تان را اضافه کنید.</p>'));
  $('#storyViewBtn').onclick=function(){story(!showAlbum)};
  if(showAlbum){V.querySelectorAll('[data-album-photo]').forEach(function(b){b.onclick=function(){var id=b.getAttribute('data-album-photo'),s=D.story.find(function(x){return x.id===id});story(false);setTimeout(function(){var el=V.querySelector('[data-del="story:'+id+'"]');if(el)el.scrollIntoView({behavior:'smooth',block:'center'});},30);if(s)toast(s.t+' · '+sh(s.d));}});return}
  $('#ad').onclick=function(){
    var t=$('#b').value.trim(),date=$('#a').value,desc=$('#c').value,file=$('#photo').files[0];
    if(!t||!date)return toast('تاریخ و عنوان لازم است');
    function commit(img){set('story:'+rid(),{d:date,t:t,x:desc,img:img||''});story(false);toast(img?'خاطره و عکس در فضای مشترک ذخیره شد و به آلبوم رفت.':'خاطره ذخیره شد.');}
    if(!file){commit('');return}
    if(!/^image\/(?:jpeg|png|webp)$/.test(file.type)||file.size>12*1024*1024)return toast('عکس باید JPG، PNG یا WebP و حداکثر ۱۲ مگابایت باشد.');
    var url=URL.createObjectURL(file),image=new Image();
    image.onload=function(){
      URL.revokeObjectURL(url);
      var scale=Math.min(1,1000/Math.max(image.naturalWidth,image.naturalHeight)),w=Math.max(1,Math.round(image.naturalWidth*scale)),hh=Math.max(1,Math.round(image.naturalHeight*scale)),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
      canvas.width=w;canvas.height=hh;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,hh);ctx.drawImage(image,0,0,w,hh);
      var data='',quality=.76;
      while(quality>=.4){data=canvas.toDataURL('image/jpeg',quality);if(data.length<=180000)break;quality-=.08}
      if(data.length>180000)return toast('این عکس هنوز بزرگ است؛ عکس دیگری انتخاب کنید.');
      commit(data);
    };
    image.onerror=function(){URL.revokeObjectURL(url);toast('خواندن عکس ممکن نشد؛ فایل دیگری انتخاب کنید.')};
    image.src=url;
  };
}


function albumPage(){
  var photos=D.story.filter(function(s){return !!s.img}).slice().sort(function(a,b){return a.d<b.d?1:a.d>b.d?-1:a.id<b.id?1:-1});
  var query='',sort='new',favoritesOnly=false,activePhoto=null;
  function filtered(){
    var list=photos.filter(function(p){
      var q=query.toLocaleLowerCase();
      var match=!q||(String(p.t||'')+' '+String(p.x||'')+' '+String(p.d||'')).toLocaleLowerCase().indexOf(q)>-1;
      return match&&(!favoritesOnly||(I['album:fav:'+p.id]&&I['album:fav:'+p.id].v===true));
    });
    if(sort==='old')list.reverse();
    if(sort==='title')list.sort(function(a,b){return String(a.t||'').localeCompare(String(b.t||''),'fa')});
    return list;
  }
  function renderCards(){
    var list=filtered();
    var cards=list.map(function(p){
      var fav=!!(I['album:fav:'+p.id]&&I['album:fav:'+p.id].v===true);
      return '<article class="card album-photo-card"><button type="button" class="album-photo-open" data-album-view="'+E(p.id)+'" aria-label="نمایش تمام‌صفحه '+E(p.t)+'"><img src="'+E(p.img)+'" alt="'+E(p.t)+'" loading="lazy"></button><h3>'+E(p.t)+'</h3><small>'+sh(p.d)+'</small>'+(p.x?'<p>'+E(p.x)+'</p>':'')+'<div class="album-card-actions"><button type="button" data-album-fav="'+E(p.id)+'" aria-pressed="'+fav+'">'+(fav?'♥ موردعلاقه':'♡ افزودن به علاقه‌مندی‌ها')+'</button><button type="button" data-album-edit="'+E(p.id)+'">ویرایش</button><button type="button" class="x" data-del="story:'+E(p.id)+'">حذف عکس و خاطره</button></div></article>';
    }).join('');
    var grid=$('#albumPhotoGrid'),count=$('#albumResultCount');
    if(grid)grid.innerHTML=cards||'<div class="card muted">عکسی با این جست‌وجو پیدا نشد. عبارت دیگری امتحان کن یا فیلتر علاقه‌مندی را خاموش کن.</div>';
    if(count)count.textContent='نمایش '+fa(list.length)+' عکس از '+fa(photos.length);
  }
  V.innerHTML='<h2>آلبوم عکس‌های ما</h2><p class="muted">عکس‌ها در خاطرات ذخیره می‌شوند و در آلبوم هم دیده می‌شوند. برای همگام‌سازی بین دو نفر باید فضای مشترک فعال باشد.</p><div class="card album-upload"><label for="albumDate">تاریخ عکس</label><input id="albumDate" type="date" value="'+iso()+'"><label for="albumTitle">عنوان عکس</label><input id="albumTitle" maxlength="120" placeholder="مثلاً اولین سفر دونفره"><label for="albumDesc">توضیح کوتاه (اختیاری)</label><textarea id="albumDesc" rows="2" maxlength="3000" placeholder="این لحظه را چرا دوست دارید؟"></textarea><label for="albumFile">انتخاب عکس</label><input id="albumFile" type="file" accept="image/jpeg,image/png,image/webp,image/avif"><small>فرمت‌های JPG، PNG، WebP یا AVIF؛ حداکثر ۱۲ مگابایت. عکس پیش از ذخیره فشرده می‌شود.</small><div id="albumPreviewWrap" class="album-preview-wrap" hidden><img id="albumPreview" alt="پیش‌نمایش عکس انتخاب‌شده"><button type="button" id="clearAlbumPhoto" class="secondary">حذف انتخاب</button></div><p id="albumUploadStatus" class="muted" role="status" aria-live="polite"></p><button id="saveAlbumPhoto">+ افزودن به آلبوم</button></div><section class="album-tools card"><label for="albumSearch">جست‌وجوی عکس‌ها</label><input id="albumSearch" type="search" placeholder="عنوان، توضیح یا تاریخ…"><div class="row"><div class="grow"><label for="albumSort">مرتب‌سازی</label><select id="albumSort"><option value="new">جدیدترین</option><option value="old">قدیمی‌ترین</option><option value="title">عنوان</option></select></div><label class="album-fav-filter"><input id="albumFavoritesOnly" type="checkbox"> فقط علاقه‌مندی‌ها</label></div><small id="albumResultCount" class="muted"></small></section><div id="albumPhotoGrid" class="photo-album-grid"></div><dialog id="albumLightbox" class="album-lightbox" aria-label="نمایش عکس"><div class="album-lightbox-head"><button type="button" id="albumLightboxClose" aria-label="بستن نمایشگر">✕ بستن</button><div class="row"><button type="button" id="albumPrev" aria-label="عکس قبلی">← قبلی</button><button type="button" id="albumNext" aria-label="عکس بعدی">بعدی →</button></div></div><img id="albumLightboxImg" alt=""><h3 id="albumLightboxTitle"></h3><p id="albumLightboxDesc"></p><small id="albumLightboxDate"></small><div class="album-lightbox-actions"><button type="button" id="albumLightboxEdit">ویرایش عنوان و توضیح</button><button type="button" id="albumLightboxDelete" class="x">حذف عکس</button></div></dialog>';
  var albumPreviewUrl='';
  function openPhoto(id){
    activePhoto=photos.find(function(p){return p.id===id})||null;if(!activePhoto)return;
    var dlg=$('#albumLightbox');$('#albumLightboxImg').src=activePhoto.img;$('#albumLightboxImg').alt=activePhoto.t||'عکس آلبوم';$('#albumLightboxTitle').textContent=activePhoto.t||'';$('#albumLightboxDesc').textContent=activePhoto.x||'بدون توضیح';$('#albumLightboxDate').textContent=sh(activePhoto.d);
    if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','');
  }
  function editPhoto(p){
    if(!p)return;
    var title=prompt('عنوان عکس:',p.t||'');if(title===null)return;title=title.trim();if(!title)return toast('عنوان عکس نمی‌تواند خالی باشد.');
    var desc=prompt('توضیح عکس:',p.x||'');if(desc===null)return;
    set('story:'+p.id,{d:p.d,t:title,x:desc.trim(),img:p.img});toast('تغییرات عکس ذخیره شد.');albumPage();
  }
  function movePhoto(step){
    var list=filtered();if(!list.length)return;
    var i=list.findIndex(function(p){return activePhoto&&p.id===activePhoto.id});i=(i+step+list.length)%list.length;openPhoto(list[i].id);
  }
  $('#albumSearch').oninput=function(){query=this.value;renderCards()};
  $('#albumSort').onchange=function(){sort=this.value;renderCards()};
  $('#albumFavoritesOnly').onchange=function(){favoritesOnly=this.checked;renderCards()};
  $('#albumPhotoGrid').addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-album-view'))openPhoto(b.getAttribute('data-album-view'));
    else if(b.hasAttribute('data-album-fav')){var id=b.getAttribute('data-album-fav'),key='album:fav:'+id,yes=!(I[key]&&I[key].v===true);set(key,yes);renderCards()}
    else if(b.hasAttribute('data-album-edit')){var p=photos.find(function(x){return x.id===b.getAttribute('data-album-edit')});editPhoto(p)}
  });
  $('#albumLightboxClose').onclick=function(){var d=$('#albumLightbox');if(d.close)d.close();else d.removeAttribute('open')};
  $('#albumPrev').onclick=function(){movePhoto(-1)};
  $('#albumNext').onclick=function(){movePhoto(1)};
  $('#albumLightboxEdit').onclick=function(){editPhoto(activePhoto)};
  $('#albumLightboxDelete').onclick=function(){if(!activePhoto)return;if(confirm('این عکس و خاطره‌ی مرتبط با آن حذف شود؟')){set('story:'+activePhoto.id,null);var d=$('#albumLightbox');if(d.close)d.close();else d.removeAttribute('open');albumPage();toast('عکس حذف شد.')}};
  $('#albumFile').onchange=function(){
    var file=this.files&&this.files[0],wrap=$('#albumPreviewWrap'),img=$('#albumPreview'),status=$('#albumUploadStatus');
    if(albumPreviewUrl){URL.revokeObjectURL(albumPreviewUrl);albumPreviewUrl=''}
    if(!file){wrap.hidden=true;img.removeAttribute('src');status.textContent='';return}
    if(!/^image\/(jpeg|png|webp|avif)$/.test(file.type)){this.value='';wrap.hidden=true;status.textContent='';toast('این فرمت پشتیبانی نمی‌شود؛ JPG، PNG، WebP یا AVIF انتخاب کن.');return}
    if(file.size>12*1024*1024){this.value='';wrap.hidden=true;status.textContent='';toast('حجم عکس باید حداکثر ۱۲ مگابایت باشد.');return}
    albumPreviewUrl=URL.createObjectURL(file);img.src=albumPreviewUrl;wrap.hidden=false;status.textContent='پیش‌نمایش آماده است؛ برای ذخیره دکمه را بزن.';
  };
  $('#clearAlbumPhoto').onclick=function(){if(albumPreviewUrl)URL.revokeObjectURL(albumPreviewUrl);albumPreviewUrl='';$('#albumFile').value='';$('#albumPreview').removeAttribute('src');$('#albumPreviewWrap').hidden=true;$('#albumUploadStatus').textContent='';};
  $('#saveAlbumPhoto').onclick=function(){
    var date=$('#albumDate').value,t=$('#albumTitle').value.trim(),desc=$('#albumDesc').value.trim(),file=$('#albumFile').files[0];
    if(!date||!t)return toast('تاریخ و عنوان عکس را وارد کن');
    if(!file)return toast('اول یک عکس انتخاب کن');
    if(!/^image\/(jpeg|png|webp|avif)$/.test(file.type))return toast('فرمت عکس پشتیبانی نمی‌شود؛ JPG، PNG، WebP یا AVIF انتخاب کن.');
    if(file.size>12*1024*1024)return toast('حجم عکس باید حداکثر ۱۲ مگابایت باشد.');
    var saveButton=$('#saveAlbumPhoto'),uploadStatus=$('#albumUploadStatus');saveButton.disabled=true;saveButton.textContent='در حال آماده‌سازی عکس…';uploadStatus.textContent='در حال خواندن و فشرده‌سازی عکس؛ صفحه را نبند.';
    function finishUpload(){saveButton.disabled=false;saveButton.textContent='+ افزودن به آلبوم';}
    function saveBitmap(bitmap){
      try{
        var scale=Math.min(1,1000/Math.max(bitmap.width,bitmap.height)),w=Math.max(1,Math.round(bitmap.width*scale)),hh=Math.max(1,Math.round(bitmap.height*scale)),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
        canvas.width=w;canvas.height=hh;ctx.fillStyle='#fff';ctx.fillRect(0,0,w,hh);ctx.drawImage(bitmap,0,0,w,hh);if(bitmap.close)bitmap.close();
        var data='',quality=.76;
        while(quality>=.32){data=canvas.toDataURL('image/jpeg',quality);if(data.length<=180000)break;quality-=.07}
        if(data.length>180000){finishUpload();uploadStatus.textContent='عکس پس از فشرده‌سازی هنوز بزرگ است.';return toast('حجم عکس برای ذخیره‌ی مشترک زیاد است؛ یک عکس کوچک‌تر انتخاب کن.')}
        set('story:'+rid(),{d:date,t:t,x:desc,img:data});
        if(albumPreviewUrl){URL.revokeObjectURL(albumPreviewUrl);albumPreviewUrl=''}
        uploadStatus.textContent=cfg.id?'عکس ثبت شد؛ همگام‌سازی با فضای مشترک در حال انجام است.':'عکس فقط در همین مرورگر ذخیره شد؛ برای اشتراک، فضای مشترک بساز.';
        finishUpload();toast(cfg.id?'عکس به آلبوم اضافه شد و برای همگام‌سازی ارسال شد ❤️':'عکس در آلبوم همین دستگاه ذخیره شد ❤️');albumPage();
      }catch(err){finishUpload();uploadStatus.textContent='ذخیره‌ی عکس انجام نشد.';toast('پردازش عکس انجام نشد؛ لطفاً عکس را به JPG تبدیل و دوباره انتخاب کن.')}
    }
    function readWithImage(f){
      var url=URL.createObjectURL(f),image=new Image();
      image.onload=function(){URL.revokeObjectURL(url);saveBitmap({width:image.naturalWidth,height:image.naturalHeight,close:function(){}})};
      image.onerror=function(){URL.revokeObjectURL(url);finishUpload();uploadStatus.textContent='این فرمت در مرورگر گوشی خوانده نشد.';toast('این فرمت در مرورگر گوشی قابل خواندن نیست؛ عکس را به JPG تبدیل کن و دوباره انتخاب کن.')};
      image.src=url;
    }
    if('createImageBitmap' in window)createImageBitmap(file).then(saveBitmap).catch(function(){readWithImage(file)});
    else readWithImage(file);
  };
  renderCards();
}

function letters(){
  var h='',t=iso();
  D.letters.forEach(function(l){
    var lk=l.u&&l.u>t;
    h='<div class="card'+(lk?' lock':'')+'"><small>از '+E(D.names[l.f])+' · '+sh(l.c)+'</small><h3>'+E(l.t)+'</h3>'
     +(lk?'<p>🔒 این نامه تا '+sh(l.u)+' بسته است.</p>':'<p>'+E(l.x)+'</p>')+'<button class="x" data-del="letters:'+E(l.id)+'" aria-label="حذف نامه «'+E(l.t)+'»">حذف</button></div>'+h});
  V.innerHTML='<h2>نامه‌ها</h2><div class="card"><select id="f" aria-label="فرستنده"><option value="0">از طرف '+E(D.names[0])+'</option><option value="1">از طرف '+E(D.names[1])+'</option></select><input id="b" maxlength="120" placeholder="عنوان نامه" aria-label="عنوان نامه"><textarea id="c" rows="5" maxlength="20000" placeholder="بنویس…" aria-label="متن نامه"></textarea>'
   +'<label><small>قفل تا تاریخ (اختیاری، کپسول زمان)</small><input type="date" id="u" min="'+t+'"></label><small>قفل فقط نمایشی است؛ هر کس به دستگاه یا فضای مشترک دسترسی داشته باشد می‌تواند متن را ببیند.</small><br><button id="ad">ذخیره‌ی نامه</button></div>'+(h||'<p><small>هنوز نامه‌ای نیست؛ اولین نامه را بنویسید.</small></p>');
  $('#ad').onclick=function(){var ti=$('#b').value.trim(),x=$('#c').value.trim();if(!ti||!x)return toast('عنوان و متن نامه لازم است');set('letters:'+rid(),{f:+$('#f').value?1:0,t:ti,x:x,c:t,u:$('#u').value});letters()};
}

function cnt(){var c=$('#cnt');if(c)c.textContent=fa(D.wishes.filter(function(w){return w.k}).length)+' از '+fa(D.wishes.length)+' آرزو انجام شده'}
function wishes(){
  var h='';
  D.wishes.forEach(function(w){
    var owner=w.owner==='0'?D.names[0]:w.owner==='1'?D.names[1]:'هر دو';
    h+='<div class="card row'+(w.k?' done':'')+'"><input type="checkbox" data-chk="'+E(w.id)+'"'+(w.k?' checked':'')+' aria-label="انجام شد: '+E(w.t)+'"><div class="grow"><b>'+E(w.t)+'</b><p><small>اولویت: '+(w.p==='high'?'زیاد':w.p==='low'?'کم':'معمولی')+' · مسئول: '+E(owner)+(w.due?' · موعد: '+sh(w.due):'')+(w.budget?' · بودجه: '+fa(w.budget):'')+'</small></p>'+(w.note?'<p>'+E(w.note)+'</p>':'')+'</div><button class="x" data-del="wishes:'+E(w.id)+'" aria-label="حذف «'+E(w.t)+'»">حذف</button></div>';
  });
  V.innerHTML='<h2>آرزوها و هدف‌های مشترک</h2><div class="card"><label for="wishtext">هدف یا آرزوی تازه</label><input id="b" maxlength="200" placeholder="مثلاً: سفر دونفره به شمال" aria-label="آرزوی تازه"><div class="row"><div class="grow"><label for="wishpriority">اولویت</label><select id="wishpriority"><option value="normal">معمولی</option><option value="high">زیاد</option><option value="low">کم</option></select></div><div class="grow"><label for="wishowner">مسئول</label><select id="wishowner"><option value="both">هر دو</option><option value="0">'+E(D.names[0])+'</option><option value="1">'+E(D.names[1])+'</option></select></div></div><label for="wishdue">تاریخ هدف (اختیاری)</label><input id="wishdue" type="date"><label for="wishbudget">بودجه تخمینی (اختیاری)</label><input id="wishbudget" type="number" min="0" max="1000000000" placeholder="مبلغ به واحد پول دلخواه"><label for="wishnote">یادداشت</label><textarea id="wishnote" rows="2" maxlength="500" placeholder="جزئیات یا قدم بعدی"></textarea><button id="ad">افزودن هدف</button></div><p><small id="cnt"></small></p>'+(h||'<p><small>هنوز هدفی ثبت نشده؛ اولین آرزوی مشترک را اضافه کنید.</small></p>');
  cnt();
  $('#ad').onclick=function(){
    var t=$('#b').value.trim(),budget=Number($('#wishbudget').value)||0;
    if(!t)return toast('هدف را بنویسید');
    if(budget<0||budget>1000000000)return toast('بودجه معتبر نیست');
    set('wishes:'+rid(),{t:t,k:0,p:$('#wishpriority').value,budget:budget,due:$('#wishdue').value,owner:$('#wishowner').value,note:$('#wishnote').value.trim()});
    wishes();focusB();
  };
}
function cal(){
  var h='';
  D.events.map(function(e){return{e:e,n:until(e.d,e.r)}}).sort(function(a,b){return ((a.n<0)-(b.n<0))||Math.abs(a.n)-Math.abs(b.n)}).forEach(function(o){
    h+='<div class="card"><small>'+sh(o.e.d)+(o.e.r?' · هر سال':'')+'</small><h3>'+E(o.e.t)+'</h3><p>'+(o.n===0?'🎉 امروز است':o.n>0?fa(o.n)+' روز مانده':fa(-o.n)+' روز پیش')+'</p><button class="x" data-del="events:'+E(o.e.id)+'" aria-label="حذف «'+E(o.e.t)+'»">حذف</button></div>'});
  V.innerHTML='<h2>تقویم</h2><div class="card"><input type="date" id="a" value="'+iso()+'" aria-label="تاریخ"><input id="b" maxlength="120" placeholder="مثلاً: اولین سالگرد" aria-label="عنوان رویداد"><label class="row"><input type="checkbox" id="r"><span>هر سال تکرار شود</span></label><button id="ad">افزودن رویداد</button></div>'+(h||'<p><small>هنوز رویدادی نیست؛ سالگرد یا قرار بعدی را اضافه کنید.</small></p>');
  $('#ad').onclick=function(){var t=$('#b').value.trim();if(!t||!$('#a').value)return toast('تاریخ و عنوان لازم است');set('events:'+rid(),{d:$('#a').value,t:t,r:$('#r').checked});cal();focusB()};
}

var Q=['کوچک‌ترین چیزی که امروز تو را خوشحال کرد چه بود؟','اگر فردا یک روز آزاد داشتیم، کجا می‌رفتیم؟','کدام خاطره‌ی ما را بیشتر از همه دوست داری؟','چه چیزی در من تو را آرام می‌کند؟','یک آرزوی کوچک برای این ماه؟','چه آهنگی تو را یاد من می‌اندازد؟','چه چیزی را امسال دوست داری با هم یاد بگیریم؟','چه کاری از من تو را بی‌دلیل می‌خنداند؟','اگر قرار بود یک غذا را همیشه با هم بپزیم، کدام؟','امروز از من برای چه چیزی ممنونی؟'];
function qa(){
  var n=day(),a=D.qa[n]||['',''],own=cfg.me==='b'?1:0,other=1-own,ready=!!(String(a[0]||'').trim()&&String(a[1]||'').trim());
  V.innerHTML='<h2>سؤال امروز</h2><div class="card"><h3>'+Q[((n%Q.length)+Q.length)%Q.length]+'</h3></div><div class="card"><small>پاسخ '+E(D.names[own])+' · پاسخ خودت را بنویس</small><textarea rows="3" maxlength="3000" data-a="own" aria-label="پاسخ خودت">'+E(a[own])+'</textarea></div><div class="card"><small>پاسخ '+E(D.names[other])+'</small><p>'+(ready?E(a[other]):'پاسخ پارتنر پس از ثبت پاسخ هر دو نفر نمایش داده می‌شود.')+'</p></div><button id="ad">ثبت پاسخ من</button>';
  $('#ad').onclick=function(){var t=document.querySelector('[data-a="own"]');if(t.value!==a[own])set('qa:'+n+':'+own,t.value);qa()};
}


/* ---------- امکانات افزوده: چت، بازی، نقشه و تنظیمات ---------- */

function updateLiveCounter(){
  var el=document.getElementById('live-counter');if(!el)return;
  var start=Number(el.getAttribute('data-start'));if(!isFinite(start))return;
  var delta=Date.now()-start,remaining=delta<0,seconds=Math.floor(Math.abs(delta)/1000);
  var d=Math.floor(seconds/86400);seconds%=86400;
  var h=Math.floor(seconds/3600);seconds%=3600;
  var m=Math.floor(seconds/60);var s=seconds%60;
  el.textContent=(remaining?'شروع رابطه تا ': 'با هم: ')+fa(d)+' روز و '+fa(h)+' ساعت و '+fa(m)+' دقیقه و '+fa(s)+' ثانیه';
}
setInterval(updateLiveCounter,1000);

function customItems(prefix){
  return Object.keys(I).filter(function(k){return k.indexOf(prefix+':')===0&&I[k]&&I[k].v!==null;}).map(function(k){return {id:k.slice(prefix.length+1),v:I[k].v,t:I[k].t};});
}
function refreshChatBadge(){
  var badge=$('#chat-unread');if(!badge)return;
  var role=cfg.me==='b'?'b':'a',readAt=Number(I['chat:read:'+role]&&I['chat:read:'+role].v)||0;
  var unread=cfg.id?customItems('chat').filter(function(m){return m.v&&typeof m.v.text==='string'&&m.v.from!==role&&(m.v.at||m.t)>readAt}).length:0;
  badge.textContent=unread?fa(unread):'';badge.hidden=!unread;badge.setAttribute('aria-label',unread?'پیام خوانده‌نشده: '+fa(unread):'پیام خوانده‌نشده‌ای نیست');
}
function notifyIncoming(r){
  if(!r||!r.items||P==='chat'||document.hidden)return;
  var role=cfg.me==='b'?'b':'a';
  Object.keys(r.items).forEach(function(k){
    if(k.indexOf('chat:')!==0||k.indexOf('chat:read:')===0)return;
    var x=r.items[k],v=x&&x.v,at=v&&Number(v.at)||x&&x.t||0;
    if(!v||typeof v.text!=='string'||v.from===role||at<=appBootAt||notifiedChat[k])return;
    notifiedChat[k]=1;toast('💌 پیام تازه‌ای از پارتنرت داری.');
    if('Notification' in window&&Notification.permission==='granted'){
      try{var n=new Notification('خانه‌ی ما 💌',{body:String(v.text).slice(0,160),tag:'ourhome-'+k,icon:'icon.svg'});n.onclick=function(){try{window.focus()}catch(_){}location.href='chat.html';n.close()}}catch(_){}
    }
  });
}
function chat(){
  var msgs=customItems('chat').filter(function(m){return m.v&&typeof m.v.text==='string';})
    .sort(function(a,b){return (a.v.at||a.t)-(b.v.at||b.t);});
  var role=cfg.me==='b'?'b':'a',readKey='chat:read:'+role,readAt=Number(I[readKey]&&I[readKey].v)||0;
  var latestAt=msgs.reduce(function(n,m){return Math.max(n,m.v.at||m.t||0)},0);
  if(latestAt>readAt)set(readKey,latestAt);
  var activity=otherSeen?' · آخرین فعالیت پارتنر: '+(Math.max(0,Math.round((Date.now()-otherSeen)/6e4))<1?'همین الان':fa(Math.max(0,Math.round((Date.now()-otherSeen)/6e4)))+' دقیقه پیش'):'';
  var html='<h2>چت دونفره 💌</h2><div class="card"><small>'+(cfg.id?'پیام‌ها در فضای مشترک همگام می‌شوند؛ برای دیدن تغییرات طرف مقابل اتصال سرور لازم است.':'حالت محلی: پیام‌ها فقط در همین مرورگر ذخیره می‌شوند.')+E(activity)+'</small></div>';
  if(cfg.id)html+='<div class="card chat-read-status"><small>پیام‌های خوانده‌نشده هنگام باز بودن این صفحه به‌عنوان خوانده‌شده ثبت می‌شوند.</small></div>';
  html+='<section id="chatlog" aria-live="polite" aria-relevant="additions text">';
  msgs.forEach(function(m){
    var own=(!cfg.id)||m.v.from===(cfg.me||'a');
    html+='<div class="card chat-msg '+(own?'mine':'theirs')+'"><small>'+E(m.v.fromName||((m.v.from==='b')?D.names[1]:D.names[0]))+' · '+E(new Date(m.v.at||m.t).toLocaleString('fa-IR'))+'</small><p>'+E(m.v.text)+'</p><button class="x" data-del="'+E('chat:'+m.id)+'">حذف</button></div>';
  });
  html+='</section><form class="card" id="chatform"><label for="chattext">پیام شما</label><textarea id="chattext" rows="3" maxlength="3000" placeholder="یک پیام دوست‌داشتنی بنویس…" required></textarea><button type="submit">ارسال پیام</button></form>';
  V.innerHTML=html;refreshChatBadge();
  $('#chatform').onsubmit=function(e){e.preventDefault();var t=$('#chattext').value.trim();if(!t)return;
    set('chat:'+rid(),{text:t,from:cfg.me||'a',fromName:D.names[cfg.me==='b'?1:0],at:Date.now()});
    var all=customItems('chat').sort(function(a,b){return (a.v.at||a.t)-(b.v.at||b.t);});
    while(all.length>300){var old=all.shift();set('chat:'+old.id,null);}
    chat();var log=$('#chatlog');if(log)log.scrollTop=log.scrollHeight;};
}
function winner(b){
  var lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for(var i=0;i<lines.length;i++){var l=lines[i];if(b[l[0]]&&b[l[0]]===b[l[1]]&&b[l[1]]===b[l[2]])return b[l[0]];}
  return b.every(Boolean)?'draw':'';
}
function games(){
  var g=I['game:state']&&I['game:state'].v;
  if(!g||!Array.isArray(g.board)||g.board.length!==9)g={board:['','','','','','','','',''],turn:'a',status:'playing',winner:'',updated:Date.now()};
  var role=cfg.me||'a',online=!!(API&&cfg.id),w=winner(g.board);
  var board='<div class="ttt" role="group" aria-label="صفحه بازی دوز">';
  g.board.forEach(function(x,i){board+='<button type="button" class="cell" data-cell="'+i+'" aria-label="خانه '+(i+1)+' '+(x||'خالی')+'" '+(x||g.status!=='playing'||(online&&g.turn!==role)?'disabled':'')+'>'+E(x||'·')+'</button>';});
  board+='</div>';
  var mem=I['game:memory']&&I['game:memory'].v;
  if(!mem||!Array.isArray(mem.cards)||mem.cards.length!==12)mem={cards:['💌','🌹','🐻','💖','🌙','🧸','💌','🌹','🐻','💖','🌙','🧸'].sort(function(){return Math.random()-.5}),open:[],matched:[],moves:0};
  var memory='<div class="memory-grid">';
  mem.cards.forEach(function(c,i){var shown=mem.open.indexOf(i)>-1||mem.matched.indexOf(i)>-1;memory+='<button class="memory-card" data-memory="'+i+'" aria-label="کارت '+(i+1)+'" '+(shown?'disabled':'')+'>'+E(shown?c:'♥')+'</button>';});
  memory+='</div>';
  var cq=I['game:choice']&&I['game:choice'].v;
  if(!cq||typeof cq.q!=='number')cq={q:0};
  var choiceRound=cq.round||('q'+cq.q);
  var choiceA=I['game:choice:a']&&I['game:choice:a'].v,choiceB=I['game:choice:b']&&I['game:choice:b'].v;
  var ans={a:choiceA&&choiceA.q===cq.q&&choiceA.round===choiceRound?choiceA.answer:undefined,b:choiceB&&choiceB.q===cq.q&&choiceB.round===choiceRound?choiceB.answer:undefined};
  var choices=[
    ['قرار در خانه 🏡','قرار بیرون 🌃'],['سفر دونفره 🚗','شب فیلم 🎬'],['نامه عاشقانه 💌','هدیه غافلگیرکننده 🎁'],
    ['صبحانه باهم ☕','شام دونفره 🍝'],['تماشای ستاره‌ها ✨','قدم‌زدن زیر باران 🌧️'],['عکس یادگاری 📸','خاطره‌نویسی 📖']
  ];
  var pair=choices[cq.q%choices.length];
  var truthList=['کدام خاطره‌مان را همیشه به یاد می‌آوری؟','چه کاری باعث می‌شود بیشتر احساس دوست‌داشته‌شدن کنی؟','قرار رؤیایی تو چه شکلی است؟','چه چیزی را دوست داری با هم تجربه کنیم؟','اولین چیزی که در من توجهت را جلب کرد چه بود؟','چه چیزی همیشه لبخند روی لبت می‌آورد؟','اگر همین حالا سفر برویم، کجا را انتخاب می‌کنی؟'];
  var dareList=['یک پیام عاشقانه در سه جمله بگو.','یک آهنگ برای رابطه‌مان انتخاب کن.','سه ویژگی دوست‌داشتنی طرف مقابل را بگو.','یک قرار ساده برای این هفته پیشنهاد بده.','یک خاطره خنده‌دارمان را تعریف کن.','۳۰ ثانیه بدون خندیدن به چشم‌های هم نگاه کنید.','یک تعریف تازه و واقعی از پارتنرت بکن.','یک عکس دونفره با ژست بامزه بگیرید.'];
  var know=['غذای موردعلاقه من چیست؟','کدام مقصد را بیشتر دوست دارم؟','چه چیزی سریع حالم را بهتر می‌کند؟','کدام خاطره‌مان برایم خاص‌تر است؟','چه مهارتی را دوست دارم یاد بگیرم؟','وقتی ناراحتم بیشتر به چه چیزی نیاز دارم؟'];
  var nowDate=new Date(),today=nowDate.getFullYear()+'-'+pad(nowDate.getMonth()+1)+'-'+pad(nowDate.getDate()),daily=I['challenge:'+today]&&I['challenge:'+today].v;
  V.innerHTML='<h2>مرکز بازی‌های دونفره 🎮</h2><p class="muted">بازی کنید، همدیگر را بهتر بشناسید و خاطره بسازید.</p>'+
  '<div class="card"><div class="game-heading"><h3>⭕ دوز عاشقانه</h3><span class="game-tag">دو نفره</span></div><p>'+(online?'اتاق مشترک فعال است؛ نوبت شما: '+(role==='a'?'X':'O'):'حالت محلی؛ دو نفر روی همین دستگاه بازی کنند.')+'</p>'+board+'<p class="game-status">'+(w?(w==='draw'?'بازی مساوی شد.':('برنده: '+(w==='X'?'X':'O'))):(g.status==='playing'?'نوبت: '+(g.turn==='a'?'X':'O'):'بازی تمام شده'))+'</p><button id="newgame">شروع دوباره</button></div>'+
  '<div class="card"><div class="game-heading"><h3>🧠 حافظه‌ی عاشقانه</h3><span class="game-tag">۶ جفت کارت</span></div><p>کارت‌های مشابه را پیدا کنید. تعداد حرکت‌ها: <b>'+fa(mem.moves)+'</b> · جفت‌های پیدا شده: <b>'+fa(mem.matched.length/2)+'/۶</b></p>'+memory+'<button id="memory-reset" class="secondary">شروع دوباره</button></div>'+
  '<div class="card"><div class="game-heading"><h3>💞 این یا اون؟</h3><span class="game-tag">سلیقه‌شناسی</span></div><p>هر نفر انتخاب خودش را ثبت کند؛ بعد انتخاب‌ها را با هم مقایسه کنید.</p><p><b>'+pair[0]+'</b> <span class="muted">یا</span> <b>'+pair[1]+'</b></p><div class="choice-row"><button data-choice="0">'+pair[0]+'</button><button data-choice="1" class="secondary">'+pair[1]+'</button></div><p>انتخاب شما: '+E(ans[role]===0?pair[0]:ans[role]===1?pair[1]:'ثبت نشده')+'</p><p>انتخاب پارتنر: '+E(ans[role==='a'?'b':'a']===0?pair[0]:ans[role==='a'?'b':'a']===1?pair[1]:'تا الان ثبت نشده')+'</p><button id="choice-next" class="secondary">سؤال بعدی</button></div>'+
  '<div class="card"><div class="game-heading"><h3>💬 حقیقت یا جرئت</h3><span class="game-tag">بدون امتیاز</span></div><p id="tod">یک مورد انتخاب کنید و با هم انجام دهید.</p><button id="truth">حقیقت</button> <button id="dare">جرئت</button><button id="nexttod" class="secondary">تصادفی</button></div>'+
  '<div class="card"><div class="game-heading"><h3>💘 چقدر من را می‌شناسی؟</h3><span class="game-tag">سؤال دونفره</span></div><p>هر نفر اول جوابش را بگوید؛ بعد جواب‌ها را مقایسه کنید.</p><p id="knowq"></p><button id="nextknow">سؤال بعدی</button></div>'+
  '<div class="card"><div class="game-heading"><h3>🌟 چالش امروز</h3><span class="game-tag">'+(daily&&daily.done?'انجام شد':'روزانه')+'</span></div><p>'+E(daily&&daily.text||'امروز هر کدام سه ویژگی بگویید که در دیگری تحسین می‌کنید.')+'</p><button id="daily-done" '+(daily&&daily.done?'disabled':'')+'>'+(daily&&daily.done?'ثبت شده 💗':'انجام دادیم 💗')+'</button></div>'+
  '<div class="card"><div class="game-heading"><h3>🔤 اسم‌وفامیل دونفره</h3><span class="game-tag">هم‌زمان</span></div><p>حرف این دور: <b id="nf-letter"></b> · هر دو نفر جواب‌های خودشان را ثبت کنند.</p><div class="form-grid"><label>اسم <input id="nf-name" maxlength="30"></label><label>فامیل <input id="nf-family" maxlength="30"></label><label>شهر <input id="nf-city" maxlength="30"></label><label>غذا <input id="nf-food" maxlength="30"></label><label>حیوان <input id="nf-animal" maxlength="30"></label></div><button id="nf-save">ثبت جواب‌های من</button><button id="nf-next" class="secondary">حرف جدید</button><p id="nf-status"></p></div>'+
  '<div class="card"><div class="game-heading"><h3>🕵️ حدس کلمه</h3><span class="game-tag">نوبتی</span></div><p>یک نفر کلمه را انتخاب کند و فقط سرنخ را نشان بدهد؛ نفر دیگر حدس بزند. این نسخه سرنخ و جواب آماده دارد.</p><p><b id="word-hint"></b></p><input id="word-guess" maxlength="50" placeholder="حدس شما"><button id="word-check">بررسی حدس</button><button id="word-next" class="secondary">کلمه‌ی تازه</button><p id="word-result" aria-live="polite"></p></div>';
  V.querySelectorAll('[data-cell]').forEach(function(b){b.onclick=function(){
    var idx=+b.getAttribute('data-cell'),cur=I['game:state']&&I['game:state'].v;
    if(!cur||!Array.isArray(cur.board))cur={board:['','','','','','','','',''],turn:'a',status:'playing'};
    if(cur.status!=='playing'||cur.board[idx]||(online&&cur.turn!==role))return;
    cur=JSON.parse(JSON.stringify(cur));cur.board[idx]=online?(role==='a'?'X':'O'):(cur.turn==='a'?'X':'O');
    var win=winner(cur.board);cur.winner=win;cur.status=win?'finished':'playing';cur.turn=cur.turn==='a'?'b':'a';cur.updated=Date.now();
    set('game:state',cur);games();
  }});
  V.querySelectorAll('[data-memory]').forEach(function(b){b.onclick=function(){
    var idx=+b.getAttribute('data-memory'),cur=JSON.parse(JSON.stringify((I['game:memory']&&I['game:memory'].v)||mem));
    if(cur.matched.indexOf(idx)>-1||cur.open.indexOf(idx)>-1)return;
    if(cur.open.length>=2){cur.open=[];}
    cur.open.push(idx);
    var mismatch=false;if(cur.open.length===2){cur.moves++;var a=cur.open[0],z=cur.open[1];if(cur.cards[a]===cur.cards[z]){cur.matched.push(a,z);cur.open=[];}else mismatch=true;}
    if(memoryFlipTimer){clearTimeout(memoryFlipTimer);memoryFlipTimer=null;}
    set('game:memory',cur);games();
    if(mismatch){var pairNow=cur.open.slice();memoryFlipTimer=setTimeout(function(){var latest=I['game:memory']&&I['game:memory'].v;if(latest&&Array.isArray(latest.open)&&latest.open.length===2&&latest.open[0]===pairNow[0]&&latest.open[1]===pairNow[1]){latest=JSON.parse(JSON.stringify(latest));latest.open=[];set('game:memory',latest);if(P==='games')games()}memoryFlipTimer=null},900)}
  }});
  $('#newgame').onclick=function(){set('game:state',{board:['','','','','','','','',''],turn:'a',status:'playing',winner:'',updated:Date.now()});games();};
  $('#memory-reset').onclick=function(){set('game:memory',{cards:['💌','🌹','🐻','💖','🌙','🧸','💌','🌹','🐻','💖','🌙','🧸'].sort(function(){return Math.random()-.5}),open:[],matched:[],moves:0});games();};
  V.querySelectorAll('[data-choice]').forEach(function(b){b.onclick=function(){var cur=I['game:choice']&&I['game:choice'].v;if(!cur||typeof cur.q!=='number')cur={q:0};var round=cur.round||('q'+cur.q);set('game:choice:'+role,{q:cur.q,round:round,answer:+b.getAttribute('data-choice'),at:Date.now()});games();};});
  $('#choice-next').onclick=function(){var cur=I['game:choice']&&I['game:choice'].v;if(!cur||typeof cur.q!=='number')cur={q:0};set('game:choice',{q:(cur.q+1)%choices.length,round:rid(),at:Date.now()});games();};
  function pick(a,id){$('#'+id).textContent=a[Math.floor(Math.random()*a.length)];}
  $('#truth').onclick=function(){pick(truthList,'tod')};$('#dare').onclick=function(){pick(dareList,'tod')};$('#nexttod').onclick=function(){pick(truthList.concat(dareList),'tod')};$('#nextknow').onclick=function(){pick(know,'knowq')};pick(know,'knowq');
  $('#daily-done').onclick=function(){set('challenge:'+today,{done:true,text:'امروز هر کدام سه ویژگی بگویید که در دیگری تحسین می‌کنید.',at:Date.now()});games();};
  var lettersNF=['م','س','آ','ر','ن','ک','ب','د','ش','ف'],nf=I['game:namefamily']&&I['game:namefamily'].v;if(!nf)nf={letter:'م'};
  var nfA=I['game:namefamily:a']&&I['game:namefamily:a'].v,nfB=I['game:namefamily:b']&&I['game:namefamily:b'].v;
  $('#nf-letter').textContent=nf.letter;var mine=(role==='a'?nfA:nfB)||{};['name','family','city','food','animal'].forEach(function(k){$('#nf-'+k).value=mine[k]||''});
  var otherAns=role==='a'?nfB:nfA;$('#nf-status').textContent='وضعیت شما: '+(mine.at?'ثبت شده':'ثبت نشده')+' · پارتنر: '+(otherAns&&otherAns.at?'ثبت کرده':'منتظر پاسخ');
  $('#nf-save').onclick=function(){set('game:namefamily:'+role,{name:$('#nf-name').value.trim(),family:$('#nf-family').value.trim(),city:$('#nf-city').value.trim(),food:$('#nf-food').value.trim(),animal:$('#nf-animal').value.trim(),at:Date.now(),letter:nf.letter});games()};
  $('#nf-next').onclick=function(){set('game:namefamily',{letter:lettersNF[Math.floor(Math.random()*lettersNF.length)],at:Date.now()});set('game:namefamily:a',null);set('game:namefamily:b',null);games()};
  var words=[{w:'باران',h:'از آسمان می‌بارد و زمین را خیس می‌کند.'},{w:'قهوه',h:'نوشیدنی گرم و محبوب صبح‌ها.'},{w:'ستاره',h:'شب‌ها در آسمان دیده می‌شود.'},{w:'آغوش',h:'گاهی بدون حرف زدن آرامت می‌کند.'},{w:'سفر',h:'با هم رفتنش می‌تواند خاطره‌ساز باشد.'},{w:'شکلات',h:'خوراکی شیرین که خیلی‌ها دوستش دارند.'}];
  var wi=I['game:word']&&I['game:word'].v;if(!wi||typeof wi.index!=='number')wi={index:0};var word=words[wi.index%words.length];$('#word-hint').textContent='سرنخ: '+word.h;
  $('#word-check').onclick=function(){var guess=$('#word-guess').value.replace(/\s/g,'').trim();$('#word-result').textContent=guess===word.w?'آفرین! درست حدس زدی 💗':'هنوز نه؛ دوباره فکر کن یا از سرنخ استفاده کن.'};
  $('#word-next').onclick=function(){set('game:word',{index:Math.floor(Math.random()*words.length)});games()};
}

function drawPage(){
  var palette=['#e84375','#6c4bd3','#1e9d83','#f39c12','#253047','#111111'];
  V.innerHTML='<h2>🎨 بوم نقاشی دونفره</h2><p class="muted">خطوط در حین کشیدن نیز همگام می‌شوند. برای تجربه‌ی بهتر هر دو نفر این صفحه را باز نگه دارید.</p><div class="card draw-tools"><label>رنگ <select id="draw-color">'+palette.map(function(c){return '<option value="'+c+'">'+c+'</option>'}).join('')+'</select></label><label>ضخامت <input id="draw-width" type="range" min="2" max="18" value="5"></label><button id="draw-undo" class="secondary">پاک‌کردن آخرین خط من</button><button id="draw-clear" class="secondary">پاک‌کردن کل بوم</button></div><div class="card draw-wrap"><canvas id="draw-canvas" aria-label="بوم نقاشی مشترک"></canvas></div><div class="card"><h3>💡 ایده‌های نقاشی</h3><p>چشم‌بسته یکدیگر را بکشید، خانه‌ی رؤیایی‌تان را طراحی کنید یا هر نفر نصف یک قلب را بکشد.</p><small id="draw-status" aria-live="polite"></small></div>';
  var canvas=$('#draw-canvas'),ctx=canvas.getContext('2d'),drawing=false,current=null,last=null,liveTimer=null,lastLive=0,disposed=false;
  var liveKey='draw:live:'+(cfg.me==='b'?'b':'a');
  function getStrokes(){
    var cleared=(I['draw:clear']&&I['draw:clear'].t)||0;
    return Object.keys(I).filter(function(k){return k.indexOf('draw:')===0&&k!=='draw:clear'&&k.indexOf('draw:live:')!==0&&I[k]&&I[k].v&&Array.isArray(I[k].v.points)}).map(function(k){return {id:k,v:I[k].v,t:I[k].t||0}}).filter(function(s){return s.t>cleared}).sort(function(a,b){return a.t-b.t});
  }
  var strokes=getStrokes();
  function liveStrokes(){
    var now=Date.now(),out=[];
    ['a','b'].forEach(function(role){var x=I['draw:live:'+role],v=x&&x.v;if(v&&Array.isArray(v.points)&&v.points.length&&now-(v.updated||v.at||0)<15000)out.push({id:'live-'+role,v:v,t:x.t||0})});
    return out;
  }
  function updateStatus(){
    var s=$('#draw-status');if(!s)return;
    s.textContent='خطوط ذخیره‌شده: '+fa(strokes.length)+' · '+(API&&cfg.id?'همگام‌سازی مشترک '+(otherSeen?'فعال':'در انتظار اتصال'):'ذخیره فقط روی همین دستگاه؛ ورود به فضای مشترک برای دو گوشی لازم است');
  }
  function paint(){
    if(disposed||!canvas.isConnected)return;
    var w=canvas.clientWidth||canvas.getBoundingClientRect().width||300,h=360;
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#fffdfd';ctx.fillRect(0,0,w,h);
    function line(v){
      var p=v&&v.points;if(!p||!p.length)return;
      ctx.strokeStyle=v.color||'#e84375';ctx.lineWidth=Number(v.width)||5;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(p[0][0]*w,p[0][1]*h);
      for(var i=1;i<p.length;i++)ctx.lineTo(p[i][0]*w,p[i][1]*h);
      if(p.length===1)ctx.lineTo(p[0][0]*w+.1,p[0][1]*h+.1);ctx.stroke();
    }
    strokes.forEach(function(s){line(s.v)});liveStrokes().forEach(function(s){line(s.v)});if(current)line(current);
  }
  function refresh(){strokes=getStrokes();paint();updateStatus()}
  window.__ourhomeDrawRefresh=refresh;
  function size(){if(disposed||!canvas.isConnected)return;var r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(360*dpr));canvas.style.height='360px';ctx.setTransform(dpr,0,0,dpr,0,0);paint()}
  function point(e){var r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/Math.max(1,r.width))),Math.max(0,Math.min(1,(e.clientY-r.top)/Math.max(1,r.height)))]}
  function publishLive(force){
    if(!current||!current.points.length)return;
    var now=Date.now();if(!force&&now-lastLive<280)return;lastLive=now;
    set(liveKey,{points:current.points.slice(),color:current.color,width:current.width,by:current.by,at:current.at,updated:now});
  }
  canvas.addEventListener('pointerdown',function(e){
    e.preventDefault();drawing=true;try{canvas.setPointerCapture(e.pointerId)}catch(_){}
    current={points:[point(e)],color:$('#draw-color').value,width:+$('#draw-width').value,by:cfg.me||'local',at:Date.now(),updated:Date.now()};last=current.points[0];publishLive(true);paint();
  });
  canvas.addEventListener('pointermove',function(e){
    if(!drawing||!current)return;var p=point(e);
    if(!last||Math.hypot((p[0]-last[0])*canvas.clientWidth,(p[1]-last[1])*360)>.8){current.points.push(p);last=p;paint();publishLive(false)}
  });
  function finish(){
    if(!drawing||!current)return;drawing=false;var done=current;
    if(done.points.length){var sid='draw:'+rid();set(sid,done);strokes.push({id:sid,v:done,t:(I[sid]&&I[sid].t)||Date.now()})}
    current=null;last=null;set(liveKey,null);paint();updateStatus();
  }
  canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);canvas.addEventListener('lostpointercapture',finish);
  window.addEventListener('resize',size);
  // Refresh the live overlay periodically so a partner's unfinished line expires after a disconnect.
  liveTimer=setInterval(function(){paint()},1000);
  size();updateStatus();
  $('#draw-undo').onclick=function(){
    var me=cfg.me||'local',mine=strokes.filter(function(s){return s.v.by===me});
    if(!mine.length)return toast('خطی از شما برای پاک‌کردن نیست.');
    var lastStroke=mine[mine.length-1];set(lastStroke.id,null);strokes=strokes.filter(function(s){return s.id!==lastStroke.id});paint();updateStatus();
  };
  $('#draw-clear').onclick=function(){
    if(!confirm('کل نقاشی برای هر دو نفر پاک شود؟'))return;
    set('draw:clear',{at:Date.now(),by:cfg.me||'local'});strokes.forEach(function(s){set(s.id,null)});strokes=[];set('draw:live:a',null);set('draw:live:b',null);paint();updateStatus();toast('بوم پاک شد.');
  };
  // Avoid leaving the global callback bound to a canvas that was replaced by navigation.
  var priorRoute=R[P]; // retained for the same page lifecycle
  window.addEventListener('pagehide',function(){disposed=true;clearInterval(liveTimer);if(window.__ourhomeDrawRefresh===refresh)window.__ourhomeDrawRefresh=null},{once:true});
}
function challengesPage(){
  var prompts=['هر کدام سه ویژگی بگویید که در دیگری تحسین می‌کنید.','یک آهنگ انتخاب کنید که حال‌وهوای رابطه‌تان را توصیف کند.','یک قرار کم‌هزینه برای این هفته طراحی کنید.','هر کدام یک خاطره بگویید که هنوز لبخندتان می‌آورد.','ده دقیقه بدون گوشی با هم حرف بزنید.','یک چیز تازه درباره‌ی آرزوهای هم بپرسید.','برای یکدیگر یک پیام تشکر صادقانه بنویسید.'];
  var today=iso(),key='challenge:'+today,st=I[key]&&I[key].v,idx=Math.floor(new Date(today+'T12:00:00').getTime()/86400000)%prompts.length,txt=st&&st.text||prompts[idx],role=cfg.me==='b'?'b':'a',doneKey=key+':'+role,done=!!(I[doneKey]&&I[doneKey].v),doneA=!!(I[key+':a']&&I[key+':a'].v),doneB=!!(I[key+':b']&&I[key+':b'].v);
  V.innerHTML='<h2>چالش‌های دونفره 🌟</h2><p>فعالیت‌های کوچک برای نزدیک‌تر شدن؛ بدون اجبار و با احترام به مرزهای هر دو نفر.</p><div class="card"><small>چالش امروز · '+E(today)+'</small><h3>'+E(txt)+'</h3><p>'+(doneA&&doneB?'هر دوی شما انجام چالش را ثبت کرده‌اید؛ آفرین 💗':done?'ثبت تو انجام شد؛ منتظر ثبت پارتنرت هستیم.':(doneA||doneB?'یکی از شما انجام چالش را ثبت کرده است.':'بعد از انجام چالش، وضعیت خودت را ثبت کن.'))+'</p><p><small>وضعیت تو: '+(done?'انجام شده ✓':'هنوز ثبت نشده')+' · وضعیت پارتنر: '+((role==='a'?doneB:doneA)?'انجام شده ✓':'هنوز ثبت نشده')+'</small></p><button id="challenge-done" '+(done?'disabled':'')+'>'+(done?'ثبت شده 💗':'من انجامش دادم')+'</button><button id="challenge-next" class="secondary">یک ایده‌ی دیگر</button></div><div class="card"><h3>برنامه‌ریزی قرار دونفره 🗓️</h3><p>قرار را ثبت کنید تا در تقویم مشترک نمایش داده شود.</p><label for="date-title">عنوان قرار</label><input id="date-title" maxlength="120" placeholder="مثلاً پیک‌نیک دونفره"><label for="date-when">تاریخ قرار</label><input id="date-when" type="date" min="'+today+'" value="'+today+'"><button id="date-save">افزودن قرار به تقویم</button></div><div class="card"><h3>ایده‌های قرار</h3><ul><li>شب فیلم با خوراکی خانگی</li><li>پیاده‌روی و گرفتن یک عکس یادگاری</li><li>درست‌کردن یک غذای جدید با هم</li><li>نوشتن نامه برای آینده‌ی رابطه</li><li>ساختن پلی‌لیست مشترک</li></ul></div>';
  $('#challenge-done').onclick=function(){set(doneKey,true);set('score:challenge-'+today+':'+role,{points:10,source:'challenge',date:today,role:role});challengesPage();};
  $('#challenge-next').onclick=function(){var next=prompts[Math.floor(Math.random()*prompts.length)];set(key,{text:next,at:Date.now()});set(key+':a',false);set(key+':b',false);challengesPage();};
  $('#date-save').onclick=function(){var title=$('#date-title').value.trim(),date=$('#date-when').value;if(!title||!date)return toast('عنوان و تاریخ قرار را وارد کن.');if(date<today)return toast('تاریخ قرار نمی‌تواند در گذشته باشد.');set('events:'+rid(),{d:date,t:title,r:false});toast('قرار به تقویم مشترک اضافه شد 💗');$('#date-title').value='';};
}
function achievementsPage(){
  var gamesPlayed=Object.keys(I).filter(function(k){return k.indexOf('game:')===0&&I[k]&&I[k].v;}).length;
  var stories=D.story.length,letters=D.letters.length,events=D.events.length,done=D.wishes.filter(function(w){return w.k}).length;
  var days=day(),scores={a:0,b:0},scoreEvents=0;
  Object.keys(I).forEach(function(k){
    if(k.indexOf('score:')!==0||!I[k]||!I[k].v)return;
    var v=I[k].v;if(!v||typeof v.points!=='number'||(v.role!=='a'&&v.role!=='b'))return;
    scores[v.role]+=Math.max(0,Math.min(1000,Math.floor(v.points)));scoreEvents++;
  });
  function level(n){return n>=200?{n:5,t:'هم‌مسیر طلایی'}:n>=100?{n:4,t:'هم‌مسیر درخشان'}:n>=50?{n:3,t:'هم‌مسیر صمیمی'}:n>=20?{n:2,t:'هم‌مسیر مشتاق'}:{n:1,t:'شروع عاشقانه'};}
  var mine=cfg.me==='b'?'b':'a',other=mine==='a'?'b':'a',myLevel=level(scores[mine]),otherLevel=level(scores[other]);
  var badges=[
    {ok:stories>0,icon:'📸',title:'خاطره‌ساز',desc:'اولین خاطره را ثبت کنید.'},
    {ok:letters>0,icon:'💌',title:'نامه‌نویس',desc:'اولین نامه را بنویسید.'},
    {ok:done>0,icon:'✨',title:'آرزوپرداز',desc:'یک آرزو را انجام‌شده کنید.'},
    {ok:events>0,icon:'📅',title:'مناسبت‌شناس',desc:'یک مناسبت ثبت کنید.'},
    {ok:gamesPlayed>0,icon:'🎮',title:'اهل بازی',desc:'یکی از بازی‌ها را امتحان کنید.'},
    {ok:days>=30,icon:'💗',title:'یک ماه کنار هم',desc:'به روز سی‌ام رابطه برسید.'},
    {ok:scores[mine]>=10,icon:'🌟',title:'اولین قدم',desc:'یک چالش روزانه را ثبت کنید.'},
    {ok:scores[mine]>=50,icon:'🏅',title:'پای کار رابطه',desc:'۵۰ امتیاز شخصی به دست آورید.'},
    {ok:scores[mine]>=100,icon:'👑',title:'صد قدم کوچک',desc:'۱۰۰ امتیاز شخصی به دست آورید.'}
  ];
  var pct=Math.min(100,Math.round((myLevel.n===5?200:scores[mine])/(myLevel.n===1?20:myLevel.n===2?50:myLevel.n===3?100:myLevel.n===4?200:200)*100));
  V.innerHTML='<h2>دستاوردهای ما 🏆</h2><p>این صفحه برای جشن گرفتن قدم‌های کوچک رابطه است، نه رقابت با یکدیگر.</p>'+
  '<div class="stats-grid"><div class="stat-card"><b>'+fa(stories)+'</b><span>خاطره</span></div><div class="stat-card"><b>'+fa(letters)+'</b><span>نامه</span></div><div class="stat-card"><b>'+fa(done)+'</b><span>آرزوی انجام‌شده</span></div><div class="stat-card"><b>'+fa(days)+'</b><span>روز رابطه</span></div></div>'+
  '<div class="card"><h3>🌟 امتیاز و سطح تو</h3><div class="stats-grid"><div class="stat-card"><b>'+fa(scores[mine])+'</b><span>امتیاز تو</span></div><div class="stat-card"><b>'+fa(myLevel.n)+'</b><span>'+E(myLevel.t)+'</span></div><div class="stat-card"><b>'+fa(scores[other])+'</b><span>امتیاز پارتنر</span></div><div class="stat-card"><b>'+fa(otherLevel.n)+'</b><span>'+E(otherLevel.t)+'</span></div></div><p><progress max="100" value="'+pct+'" aria-label="پیشرفت سطح فعلی"></progress></p><small>هر چالش روزانه که از صفحهٔ چالش‌ها ثبت کنی ۱۰ امتیاز می‌دهد. هر تاریخ و هر نفر فقط یک بار امتیاز می‌گیرد؛ امتیازها در فضای مشترک ذخیره می‌شوند.</small></div>'+
  '<div class="badge-grid">'+badges.map(function(b){return '<div class="card badge-card '+(b.ok?'unlocked':'locked')+'"><div class="badge-icon">'+b.icon+'</div><h3>'+E(b.title)+'</h3><p>'+E(b.desc)+'</p><small>'+(b.ok?'دریافت‌شده ✓':'هنوز قفل است')+'</small></div>';}).join('')+'</div>'+
  '<div class="card"><h3>قدم بعدی</h3><p>یک خاطره ثبت کنید، برای هم نامه بنویسید یا چالش امروز را انجام دهید.</p><div class="go"><a href="story.html">ثبت خاطره</a><a href="letters.html">نوشتن نامه</a><a href="challenges.html">چالش امروز</a></div></div>';
}
var mapWatch=null,mapExpiry=null,lastLocAt=0;
function mapPage(){
  var role=cfg.me||'a',other=role==='a'?'b':'a';
  var mine=I['location:'+role]&&I['location:'+role].v, theirs=I['location:'+other]&&I['location:'+other].v;
  if(!mine){try{mine=JSON.parse(sessionStorage.getItem('ourhome_current_location')||'null')}catch(e){mine=null}}
  if(mine&&mine.expires&&mine.expires<Date.now())mine=null;
  if(theirs&&theirs.expires&&theirs.expires<Date.now())theirs=null;
  function frame(loc){
    if(!loc||typeof loc.lat!=='number'||typeof loc.lon!=='number')return '<p><small>موقعیتی برای نمایش وجود ندارد.</small></p>';
    var d=.012,bbox=[loc.lon-d,loc.lat-d,loc.lon+d,loc.lat+d].join(',');
    return '<iframe class="map-frame" title="نقشه موقعیت به اشتراک گذاشته‌شده" loading="lazy" referrerpolicy="no-referrer" src="https://www.openstreetmap.org/export/embed.html?bbox='+encodeURIComponent(bbox)+'&layer=mapnik&marker='+encodeURIComponent(loc.lat+','+loc.lon)+'"></iframe><p><a target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/?mlat='+loc.lat+'&mlon='+loc.lon+'#map=16/'+loc.lat+'/'+loc.lon+'">بازکردن نقشه در صفحه جدید ↗</a></p><small>آخرین به‌روزرسانی: '+E(new Date(loc.at||Date.now()).toLocaleString('fa-IR'))+'</small>';
  }
  V.innerHTML='<h2>نقشه و موقعیت 📍</h2><div class="card"><p>موقعیت مکانی فقط با اقدام آگاهانه و مجوز خود فرد دریافت می‌شود. اشتراک‌گذاری را هر زمان می‌توان متوقف کرد.</p><small>'+(cfg.id?'فضای مشترک تنظیم شده است.':'برای ارسال موقعیت به گوشی دیگر، ابتدا فضای مشترک را در صفحه خانه فعال کنید.')+'</small></div><div class="card"><h3>موقعیت من</h3>'+frame(mine)+'<button id="getloc" class="secondary">دریافت موقعیت فقط روی این دستگاه</button><label for="duration">مدت اشتراک‌گذاری زنده</label><select id="duration"><option value="900">۱۵ دقیقه</option><option value="3600">۱ ساعت</option><option value="14400">۴ ساعت</option><option value="28800">تا توقف دستی یا حداکثر ۸ ساعت</option></select><button id="startloc">شروع اشتراک‌گذاری موقعیت</button> <button id="stoploc" class="secondary">توقف فوری</button></div><div class="card"><h3>موقعیت پارتنر</h3>'+frame(theirs)+'</div><div class="card"><h3>ذخیره یک مکان خاطره‌انگیز</h3><p>می‌توانی موقعیت فعلی خودت را به‌عنوان مکان خاطره ذخیره کنی.</p><input id="placename" maxlength="100" placeholder="نام مکان؛ مثلاً اولین کافه‌مان"><button id="saveplace">ثبت مکان در این دستگاه</button><div id="places"></div></div>';
  var places=[];try{places=JSON.parse(localStorage.getItem('ourhome_places')||'[]');if(!Array.isArray(places))places=[];}catch(e){places=[];}
  $('#places').innerHTML=places.map(function(p,i){return '<div class="card"><b>'+E(p.name)+'</b><p>'+p.lat.toFixed(5)+', '+p.lon.toFixed(5)+'</p><a target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/?mlat='+p.lat+'&mlon='+p.lon+'#map=16/'+p.lat+'/'+p.lon+'">دیدن روی نقشه</a> <button class="x" data-place-del="'+i+'">حذف</button></div>';}).join('');
  $('#getloc').onclick=function(){
    if(!navigator.geolocation)return toast('این مرورگر موقعیت مکانی را پشتیبانی نمی‌کند.');
    if(!window.isSecureContext)return toast('برای GPS باید سایت روی HTTPS یا localhost باشد.');
    navigator.geolocation.getCurrentPosition(function(pos){var loc={lat:pos.coords.latitude,lon:pos.coords.longitude,at:Date.now(),expires:0};try{sessionStorage.setItem('ourhome_current_location',JSON.stringify(loc))}catch(e){}mapPage();toast('موقعیت فقط روی این دستگاه دریافت شد.');},function(err){toast(err.code===1?'اجازه موقعیت مکانی داده نشد.':'دریافت موقعیت ناموفق بود.');},{enableHighAccuracy:true,maximumAge:5000,timeout:15000});
  };
  $('#startloc').onclick=function(){
    if(!navigator.geolocation)return toast('این مرورگر موقعیت مکانی را پشتیبانی نمی‌کند.');
    if(!window.isSecureContext)return toast('برای GPS باید سایت روی HTTPS یا localhost باشد.');
    if(!API||!cfg.id)return toast('برای اشتراک‌گذاری بین دو گوشی، ابتدا فضای مشترک و API را فعال کنید.');
    var dur=+$('#duration').value,expires=dur?Date.now()+dur*1000:0;
    if(mapWatch!==null)navigator.geolocation.clearWatch(mapWatch);
    if(mapExpiry)clearTimeout(mapExpiry);
    lastLocAt=0;
    toast('در انتظار اجازه و دریافت موقعیت…');
    mapWatch=navigator.geolocation.watchPosition(function(pos){
      if(Date.now()-lastLocAt<15000)return;
      lastLocAt=Date.now();
      var loc={lat:pos.coords.latitude,lon:pos.coords.longitude,at:Date.now(),expires:expires};
      set('location:'+role,loc);mapPage();
      if(expires&&Date.now()>=expires)stopLocation();
    },function(err){toast(err.code===1?'اجازه موقعیت مکانی داده نشد.':'دریافت موقعیت ناموفق بود.');},{enableHighAccuracy:true,maximumAge:5000,timeout:15000});
    if(expires)mapExpiry=setTimeout(stopLocation,dur*1000);
  };
  function stopLocation(){
    if(mapWatch!==null&&navigator.geolocation)navigator.geolocation.clearWatch(mapWatch);
    mapWatch=null;if(mapExpiry)clearTimeout(mapExpiry);mapExpiry=null;
    if(cfg.id&&API)set('location:'+role,null);
    toast('اشتراک‌گذاری موقعیت متوقف شد.');
  }
  $('#stoploc').onclick=stopLocation;
  $('#saveplace').onclick=function(){
    var loc=I['location:'+role]&&I['location:'+role].v;
    if(!loc){try{loc=JSON.parse(sessionStorage.getItem('ourhome_current_location')||'null')}catch(e){loc=null}}
    if(!loc||typeof loc.lat!=='number')return toast('ابتدا موقعیت خود را دریافت کنید.');
    var name=$('#placename').value.trim();if(!name)return toast('برای مکان یک نام بنویسید.');
    places.push({name:name,lat:loc.lat,lon:loc.lon,at:Date.now()});
    try{localStorage.setItem('ourhome_places',JSON.stringify(places));toast('مکان روی همین دستگاه ذخیره شد.');mapPage();}catch(e){toast('ذخیره مکان ناموفق بود.');}
  };
  V.querySelectorAll('[data-place-del]').forEach(function(b){b.onclick=function(){var i=+b.getAttribute('data-place-del');places.splice(i,1);localStorage.setItem('ourhome_places',JSON.stringify(places));mapPage();};});
}
function settings(){
  var start=S.getFullYear()+'-'+pad(S.getMonth()+1)+'-'+pad(S.getDate());
  V.innerHTML='<h2>تنظیمات خانه‌ی ما ⚙️</h2><div class="card"><h3>ظاهر سایت</h3><label for="theme">پوسته</label><select id="theme"><option value="light" '+(cfg.theme==='light'?'selected':'')+'>روشن</option><option value="dark" '+(cfg.theme==='dark'?'selected':'')+'>تیره</option><option value="auto" '+(!cfg.theme?'selected':'')+'>مطابق دستگاه</option></select><button id="savetheme">ذخیره پوسته</button></div><div class="card"><h3>تنظیمات رابطه</h3><label for="startdate">تاریخ شروع رابطه</label><input type="date" id="startdate" value="'+start+'"><p><small>تغییر این تاریخ فقط روزشمار را تنظیم می‌کند و خاطرات ثبت‌شده حذف نمی‌شوند.</small></p><button id="savestart">ذخیره تاریخ</button></div><div class="card"><h3>نام‌ها</h3><label for="name0">نام نفر اول</label><input id="name0" maxlength="24" value="'+E(D.names[0])+'"><label for="name1">نام نفر دوم</label><input id="name1" maxlength="24" value="'+E(D.names[1])+'"><button id="savenames">ذخیره نام‌ها</button></div><div class="card"><h3>پشتیبان‌گیری و بازیابی 🛟</h3><p><small>فایل پشتیبان شامل خاطرات، نامه‌ها، آرزوها، پاسخ‌ها و داده‌های ذخیره‌شده‌ی این دستگاه است. آن را فقط در جای امن نگه دارید؛ ممکن است اطلاعات خصوصی رابطه داخلش باشد. این فایل به‌تنهایی داده‌ها را به دستگاه دیگر همگام نمی‌کند.</small></p><button id="export-backup">دانلود فایل پشتیبان JSON</button><label for="import-backup-file">بازیابی از فایل پشتیبان</label><input id="import-backup-file" type="file" accept="application/json,.json"><button id="import-backup" class="secondary" type="button">بررسی و بازیابی پشتیبان</button><p id="backup-status" class="muted" aria-live="polite">بازیابی به‌صورت ادغام انجام می‌شود؛ داده‌های فعلی پاک نمی‌شوند. پیش از شروع، یک نسخه پشتیبان از وضعیت فعلی بگیر.</p></div><div class="card"><h3>اعلان پیام‌ها 🔔</h3><p><small>با اجازه‌ی مرورگر، هنگام بازبودن برنامه اعلان سیستمی پیام تازه هم نمایش داده می‌شود. این گزینه اعلان پوش یا اعلان پس‌زمینه نیست.</small></p><p id="notification-status">'+(!('Notification' in window)?'این مرورگر اعلان سیستمی را پشتیبانی نمی‌کند.':Notification.permission==='granted'?'اجازه‌ی اعلان فعال است.':Notification.permission==='denied'?'اجازه‌ی اعلان در تنظیمات مرورگر مسدود شده است.':'برای فعال‌سازی باید اجازه بدهید.')+'</p><button id="enable-notifications" '+(!('Notification' in window)||Notification.permission==='granted'||Notification.permission==='denied'?'disabled':'')+'>فعال‌کردن اعلان‌ها</button></div><div class="card"><h3>وضعیت اتصال و همگام‌سازی</h3><p>'+(API?'آدرس API تنظیم شده است.':'آدرس API هنوز در config.js تنظیم نشده است.')+'</p><p>'+(cfg.id?'فضای مشترک: فعال':'فضای مشترک: تنظیم نشده')+'</p><p id="sync-health" role="status" aria-live="polite">در حال بررسی صف همگام‌سازی…</p><button id="retry-sync" type="button" '+(!cfg.id||!API?'disabled':'')+'>تلاش دوباره برای همگام‌سازی</button><p><small>تلاش دوباره، تغییرات ذخیره‌شده در صف را ارسال می‌کند. تا زمان اتصال موفق، داده‌های محلی را پاک نکن.</small></p></div><div class="card"><h3>سلامت حافظه‌ی دستگاه</h3><p id="storage-health" role="status" aria-live="polite">در حال بررسی فضای ذخیره‌سازی…</p><button id="refresh-storage" type="button" class="secondary">بررسی دوباره</button><p><small>این برآورد مربوط به فضای ذخیره‌سازی مرورگر است؛ جایگزین پشتیبان‌گیری نیست و فضای سرور را اندازه نمی‌گیرد.</small></p></div>';
  function refreshHealth(){
    var sh=$('#sync-health');
    if(sh){var pending=Object.keys(dirty).length;sh.textContent=!cfg.id?'فضای مشترک تنظیم نشده؛ داده‌ها فقط محلی هستند.':!navigator.onLine?'آفلاین؛ '+fa(pending)+' تغییر در انتظار ارسال است.':dead?'نشست نامعتبر است؛ دوباره وارد حساب شوید.':busy?'همگام‌سازی در حال انجام است؛ '+fa(pending)+' تغییر در صف است.':pending?fa(pending)+' تغییر در انتظار ارسال است.':'در حال حاضر تغییری در صف ارسال نیست.';}
    var st=$('#storage-health');if(!st)return;
    try{
      var used=JSON.stringify({I:I,cfg:cfg,dirty:dirty}).length*2;
      st.textContent='برآورد داده‌های خانه‌ی ما در این مرورگر: حدود '+fa(Math.max(1,Math.round(used/1024)))+' کیلوبایت.';
      if(navigator.storage&&navigator.storage.estimate)navigator.storage.estimate().then(function(q){
        if(!document.getElementById('storage-health'))return;
        var extra=typeof q.quota==='number'?' · سهمیه‌ی تخمینی مرورگر: '+fa(Math.round(q.quota/1024/1024))+' مگابایت':'';
        var usedText=typeof q.usage==='number'?' · مصرف کل سایت‌ها در این مبدأ: '+fa(Math.round(q.usage/1024/1024))+' مگابایت':'';
        st.textContent='داده‌های خانه‌ی ما: حدود '+fa(Math.max(1,Math.round(used/1024)))+' کیلوبایت.'+usedText+extra;
      }).catch(function(){});
    }catch(_){st.textContent='خواندن برآورد فضای ذخیره‌سازی ممکن نشد.';}
  }
  var retry=$('#retry-sync');if(retry)retry.onclick=function(){if(!cfg.id||!API)return toast('ابتدا فضای مشترک را تنظیم کن.');if(!navigator.onLine)return toast('اینترنت وصل نیست؛ پس از اتصال دوباره تلاش کن.');if(dead)return toast('نشست معتبر نیست؛ دوباره وارد حساب شو.');if(busy)return toast('همگام‌سازی در حال انجام است.');flush();refreshHealth();toast('تلاش برای همگام‌سازی شروع شد.');};
  var refreshStorage=$('#refresh-storage');if(refreshStorage)refreshStorage.onclick=refreshHealth;
  refreshHealth();
  var ex=$('#export-backup');if(ex)ex.onclick=function(){try{var safeCfg=Object.assign({},cfg);['id','tok','other','viewer','session','password'].forEach(function(k){delete safeCfg[k]});var payload={format:'ourhome-backup',version:1,exportedAt:new Date().toISOString(),data:{items:I,settings:safeCfg}};var blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='khane-ye-ma-backup-'+iso()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},1000);var bs=$('#backup-status');if(bs)bs.textContent='فایل پشتیبان ساخته شد. آن را در محل امن نگه دارید.';toast('فایل پشتیبان آماده شد.');}catch(err){var bs=$('#backup-status');if(bs)bs.textContent='ساخت پشتیبان ناموفق بود؛ فضای ذخیره‌سازی یا اجازه‌ی مرورگر را بررسی کنید.';toast('ساخت فایل پشتیبان ناموفق بود.');}};
  var importBtn=$('#import-backup'),importFile=$('#import-backup-file');if(importBtn&&importFile)importBtn.onclick=function(){
    var file=importFile.files&&importFile.files[0],bs=$('#backup-status');
    if(!file)return toast('ابتدا فایل پشتیبان JSON را انتخاب کن.');
    if(file.size>5*1024*1024){if(bs)bs.textContent='حجم فایل بیشتر از ۵ مگابایت است.';return toast('فایل پشتیبان بیش از حد بزرگ است.');}
    importBtn.disabled=true;importBtn.textContent='در حال بررسی فایل…';if(bs)bs.textContent='در حال بررسی ساختار فایل؛ اطلاعات فعلی هنوز تغییر نکرده است.';
    file.text().then(function(raw){
      var payload;try{payload=JSON.parse(raw)}catch(_){throw new Error('فایل JSON معتبر نیست.')}
      if(!payload||payload.format!=='ourhome-backup'||payload.version!==1||!payload.data||!payload.data.items||typeof payload.data.items!=='object'||Array.isArray(payload.data.items))throw new Error('این فایل پشتیبان خانه‌ی ما با نسخه‌ی فعلی سازگار نیست.');
      var entries=Object.entries(payload.data.items);
      if(!entries.length)throw new Error('فایل پشتیبان هیچ داده‌ای ندارد.');
      if(entries.length>5000)throw new Error('تعداد داده‌های فایل از حد مجاز بیشتر است.');
      var accepted=entries.filter(function(pair){var k=pair[0],item=pair[1];return /^[a-z]{1,12}(?::[A-Za-z0-9_-]{1,40}){1,2}$/.test(k)&&item&&typeof item==='object'&&Object.prototype.hasOwnProperty.call(item,'v')&&JSON.stringify(item).length<=300000});
      if(!accepted.length)throw new Error('هیچ داده‌ی قابل بازیابی در فایل پیدا نشد.');
      if(!confirm('از '+fa(accepted.length)+' مورد قابل بازیابی، داده‌ها با اطلاعات فعلی ادغام شوند؟ اطلاعات فعلی حذف نمی‌شود.'))return;
      var now=Date.now(),count=0;
      accepted.forEach(function(pair){var k=pair[0],v=pair[1].v,prev=I[k]&&typeof I[k].t==='number'?I[k].t:0;I[k]={v:v,t:Math.max(now+count,prev+1)};dirty[k]=1;count++;});
      build();save();sched();if(!editing())(R[P]||home)();
      if(bs)bs.textContent='بازیابی انجام شد: '+fa(count)+' مورد به داده‌های فعلی اضافه یا به‌روزرسانی شد. '+(cfg.id?'همگام‌سازی با فضای مشترک در صف ارسال است.':'این داده‌ها فعلاً روی همین دستگاه هستند.');
      toast('پشتیبان بازیابی شد؛ '+fa(count)+' مورد بررسی و ادغام شد.');
    }).catch(function(err){var msg=err&&err.message||'خواندن فایل پشتیبان ناموفق بود.';if(bs)bs.textContent=msg;toast(msg);}).then(function(){importBtn.disabled=false;importBtn.textContent='بررسی و بازیابی پشتیبان';});
  };
  var nb=$('#enable-notifications');if(nb)nb.onclick=function(){if(!('Notification' in window))return toast('این مرورگر اعلان سیستمی را پشتیبانی نمی‌کند.');Notification.requestPermission().then(function(p){var s=$('#notification-status');if(s)s.textContent=p==='granted'?'اجازه‌ی اعلان فعال شد.':p==='denied'?'اجازه رد شد؛ از تنظیمات سایت در مرورگر آن را فعال کنید.':'درخواست اجازه ناتمام ماند.';if(p==='granted'){toast('اعلان پیام‌ها فعال شد.');var b=$('#enable-notifications');if(b)b.disabled=true;}else toast('برای اعلان سیستمی باید اجازه بدهی.');}).catch(function(){toast('درخواست اجازه‌ی اعلان انجام نشد.');});};
  $('#savetheme').onclick=function(){var t=$('#theme').value;cfg.theme=t==='auto'?'':t;if(cfg.theme)document.documentElement.setAttribute('data-theme',cfg.theme);else document.documentElement.removeAttribute('data-theme');save();toast('پوسته ذخیره شد.');};
  $('#savestart').onclick=function(){var v=$('#startdate').value;if(!ISO.test(v))return toast('تاریخ معتبر انتخاب کنید.');cfg.start=v;set('settings:start',v);toast('تاریخ شروع برای هر دو نفر ذخیره شد.');home();};
  $('#savenames').onclick=function(){var a=$('#name0').value.trim(),b=$('#name1').value.trim();if(!a||!b)return toast('هر دو نام را وارد کنید.');set('names:0',a);set('names:1',b);settings();toast('نام‌ها ذخیره شدند.');};
  $('#clearlocal').onclick=function(){if(!confirm('همه داده‌های محلی این مرورگر پاک شود؟ قبل از ادامه مطمئن شوید فایل پشتیبان امنی دارید.'))return;localStorage.removeItem(K);location.reload();};
}

var R={album:albumPage,index:home,story:story,letters:letters,wishes:wishes,calendar:cal,qa:qa,chat:chat,games:games,draw:drawPage,challenges:challengesPage,achievements:achievementsPage,map:mapPage,settings:settings};
V.addEventListener('click',function(e){
  var d=e.target.getAttribute&&e.target.getAttribute('data-del');
  if(d&&I[d]&&confirm('حذف شود؟')){set(d,null);R[P]()}
});
V.addEventListener('change',function(e){
  var c=e.target.getAttribute('data-chk');if(c===null)return;
  var w=D.wishes.filter(function(x){return x.id===c})[0];if(!w)return;
  set('wishes:'+c,{t:w.t,k:e.target.checked?1:0,p:w.p,budget:w.budget,due:w.due,owner:w.owner,note:w.note});
  e.target.closest('.card').className='card row'+(e.target.checked?' done':'');cnt();
});
V.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.getAttribute('data-i')!==null){e.preventDefault();e.target.blur()}});
V.addEventListener('paste',function(e){
  if(e.target.getAttribute('data-i')===null)return;
  e.preventDefault();document.execCommand('insertText',false,((e.clipboardData||window.clipboardData).getData('text')||'').replace(/\s+/g,' '));
});
V.addEventListener('focusout',function(e){
  var i=e.target.getAttribute&&e.target.getAttribute('data-i');if(i===null||i===undefined)return;
  var v=e.target.textContent.replace(/\s+/g,' ').trim().slice(0,24);
  if(v&&v!==D.names[+i])set('names:'+i,v);e.target.textContent=D.names[+i];
});
var ld=day();
function tick(){var d=day();if(d!==ld&&!editing()){ld=d;R[P]()}}
setInterval(tick,30000);setInterval(poll,3000);
window.addEventListener('offline',function(){status('اینترنت دستگاه قطع است',1)});
window.addEventListener('online',function(){status('اینترنت وصل شد؛ در حال بررسی سرور…');poll()});
document.addEventListener('visibilitychange',function(){if(!document.hidden){tick();poll()}});
window.addEventListener('ourhome:localchange',function(){var liveCfg=Object.assign({},cfg);if(loadLS()){cfg=Object.assign({},cfg,liveCfg);applyStartSetting();build();if(Object.keys(dirty).length)sched();if(!editing())(R[P]||home)();}});
window.addEventListener('storage',function(e){if(e.key===K&&!editing()){loadLS();build();R[P]()}});
(R[P]||home)();status();
if(cfg.id)flush();
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(function(){});
})();
