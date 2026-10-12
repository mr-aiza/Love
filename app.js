(function(){
'use strict';
var API=(window.OURHOME_API||'').replace(/\/+$/,''),K='hd2',S=new Date(2026,8,29),MS=[30,50,100,200,365,500,1000],P=document.body.getAttribute('data-page'),ISO=/^\d{4}-\d{2}-\d{2}$/,tt;
var I={},dirty={},cfg={},D,otherSeen=0,busy=false,dead=false,timer=null;

/* ---------- اعتبارسنجی ---------- */
function str(v,n){return typeof v==='string'?v.slice(0,n):''}
function clean(c,v){
  if(c==='story')return ISO.test(v.d)&&str(v.t,1)?{d:v.d,t:str(v.t,120),x:str(v.x,3000)}:0;
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
function set(k,v){var prev=I[k]&&typeof I[k].t==='number'?I[k].t:0;I[k]={v:v,t:Math.max(Date.now(),prev+1)};dirty[k]=1;if(k==='settings:start')applyStartSetting();build();save();sched()}
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
if(cfg.start==='2026-09-30')cfg.start='2026-09-29';
if(I['settings:start']&&I['settings:start'].v==='2026-09-30'){I['settings:start']={v:'2026-09-29',t:Date.now()};dirty['settings:start']=1;}
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
function $(s){return document.querySelector(s)}
function fa(n){return Number(n).toLocaleString('fa-IR')}
function shD(d){return d.toLocaleDateString('fa-IR-u-ca-persian',{year:'numeric',month:'long',day:'numeric'})}
function sh(s){return shD(new Date(s+'T12:00:00'))}
function E(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pad(n){return String(n).padStart(2,'0')}
function iso(){var t=new Date();return t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate())}
function today(){var t=new Date();return new Date(t.getFullYear(),t.getMonth(),t.getDate())}
function day(){return Math.round((today()-S)/864e5)+1}
function until(s,r){var t=today(),d=new Date(s+'T00:00:00');if(r){d.setFullYear(t.getFullYear());if(d<t)d.setFullYear(t.getFullYear()+1)}return Math.round((d-t)/864e5)}
function editing(){var a=document.activeElement;return !!(a&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable))}
function toast(m){var t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=m;t.className='show';clearTimeout(tt);tt=setTimeout(function(){t.className=''},4000)}
function focusB(){var b=$('#b');if(b&&b.focus)b.focus()}
function status(t,err){
  var s=$('#sync');if(!s){s=document.createElement('p');s.id='sync';s.setAttribute('role','status');document.body.appendChild(s)}
  if(!t){if(!API)t='';else if(!cfg.id)t='ذخیره‌ی محلی؛ فضای مشترک ساخته نشده';else{t='همگام ✓ · شما: '+(cfg.accountName|| (cfg.me==='a'?'نفر اول':'نفر دوم'));if(otherSeen){var m=Math.max(0,Math.round((Date.now()-otherSeen)/6e4));t+=' · پارتنر: '+(m<1?'همین الان':fa(m)+' دقیقه پیش')}}}
  s.textContent=t;s.className=err?'sync err':'sync';
}

/* ---------- همگام‌سازی با Worker ---------- */
function api(m,b){return fetch(API+'/api/doc/'+cfg.id,{method:m,headers:{'content-type':'application/json','x-token':cfg.tok},body:b?JSON.stringify(b):undefined}).then(function(r){return r.json().catch(function(){return{}}).then(function(j){if(!r.ok){j.status=r.status;throw j}return j})})}
function merge(r){
  var ch=false;Object.keys(r.items||{}).forEach(function(k){var x=r.items[k],l=I[k];if(x&&typeof x.t==='number'&&(!l||x.t>l.t||(x.t===l.t&&JSON.stringify(x.v)>JSON.stringify(l.v)))){I[k]={v:x.v,t:x.t};ch=true}});
  var o=cfg.me==='a'?'b':'a';if(r.seen&&r.seen[o])otherSeen=r.seen[o];
  if(ch){applyStartSetting();build();save()}return ch;
}
function ensureSharedStart(){if(cfg.id&&API&&!I['settings:start'])set('settings:start',cfg.start||'2026-09-29')}
function sched(){clearTimeout(timer);timer=setTimeout(function(){timer=null;flush()},800)}
function flush(){
  if(!cfg.id||!API||busy||dead)return status();
  var ks=Object.keys(dirty).slice(0,200);if(!ks.length)return status();
  var body={items:{}};ks.forEach(function(k){body.items[k]=I[k]});
  busy=true;status('در حال همگام‌سازی…');
  api('PUT',body).then(function(r){
    ks.forEach(function(k){var s=r.items&&r.items[k];if(s&&s.t>=body.items[k].t&&I[k]===body.items[k])delete dirty[k]});
    if(merge(r)&&!editing())(R[P]||home)();ensureSharedStart();save();status();
  }).catch(function(e){
    if(e&&(e.status===401||e.status===404)){dead=true;status('لینک یا توکن فضای مشترک معتبر نیست',1);return}
    status((e&&e.error)||'ارتباط با سرور برقرار نیست؛ دوباره تلاش می‌شود',1);
  }).then(function(){busy=false;if(!dead&&Object.keys(dirty).length&&!timer)timer=setTimeout(function(){timer=null;flush()},4000)});
}
function poll(){
  if(document.hidden||!cfg.id||!API||busy||dead||Object.keys(dirty).length)return;
  api('GET').then(function(r){if(merge(r)&&!editing())(R[P]||home)();ensureSharedStart();status()}).catch(function(e){if(e&&(e.status===401||e.status===404)){dead=true;status('لینک یا توکن فضای مشترک معتبر نیست',1)}else status('ارتباط با سرور برقرار نیست',1)});
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
var N=[['index','🏠','خانه'],['story','📖','داستان ما'],['letters','💌','نامه‌ها'],['wishes','✨','آرزوها'],['calendar','📅','تقویم'],['qa','💬','سؤال'],['pledge','📜','تعهدنامه'],['chat','💌','چت'],['games','🎮','بازی'],['map','📍','نقشه'],['settings','⚙️','تنظیمات']];
var nv=document.createElement('nav');nv.setAttribute('aria-label','منوی اصلی');
nv.innerHTML=N.map(function(n){return '<a href="'+n[0]+'.html"'+(n[0]===P?' class="on" aria-current="page"':'')+'><b aria-hidden="true">'+n[1]+'</b>'+n[2]+'</a>'}).join('');
document.body.appendChild(nv);

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

function story(){
  var h='';
  D.story.slice().sort(function(a,b){return a.d<b.d?-1:a.d>b.d?1:a.id<b.id?-1:1}).forEach(function(s){
    h+='<div class="card"><small>'+sh(s.d)+'</small><h3>'+E(s.t)+'</h3><p>'+E(s.x)+'</p><button class="x" data-del="story:'+E(s.id)+'" aria-label="حذف «'+E(s.t)+'»">حذف</button></div>'});
  V.innerHTML='<h2>داستان ما</h2><div class="card"><input type="date" id="a" value="'+iso()+'" aria-label="تاریخ"><input id="b" maxlength="120" placeholder="عنوان لحظه" aria-label="عنوان لحظه"><textarea id="c" rows="2" maxlength="3000" placeholder="چه اتفاقی افتاد؟" aria-label="توضیح"></textarea><button id="ad">افزودن به داستان</button></div>'+h;
  $('#ad').onclick=function(){var t=$('#b').value.trim();if(!t||!$('#a').value)return toast('تاریخ و عنوان لازم است');set('story:'+rid(),{d:$('#a').value,t:t,x:$('#c').value});story();focusB()};
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
  var n=day(),a=D.qa[n]||['',''];
  V.innerHTML='<h2>سؤال امروز</h2><div class="card"><h3>'+Q[((n%Q.length)+Q.length)%Q.length]+'</h3></div>'+[0,1].map(function(i){return '<div class="card"><small>پاسخ '+E(D.names[i])+'</small><textarea rows="3" maxlength="3000" data-a="'+i+'" aria-label="پاسخ '+E(D.names[i])+'">'+E(a[i])+'</textarea></div>'}).join('')+'<button id="ad">ذخیره‌ی پاسخ‌ها</button>';
  $('#ad').onclick=function(){var t=document.querySelectorAll('[data-a]');[0,1].forEach(function(i){if(t[i].value!==a[i])set('qa:'+n+':'+i,t[i].value)});a=[t[0].value,t[1].value];this.textContent='ذخیره شد ✓'};
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
function chat(){
  var msgs=customItems('chat').filter(function(m){return m.v&&typeof m.v.text==='string';})
    .sort(function(a,b){return (a.v.at||a.t)-(b.v.at||b.t);});
  var html='<h2>چت دونفره 💌</h2><div class="card"><small>'+(cfg.id?'پیام‌ها در فضای مشترک همگام می‌شوند؛ برای دیدن تغییرات طرف مقابل اتصال سرور لازم است.':'حالت محلی: پیام‌ها فقط در همین مرورگر ذخیره می‌شوند.')+'</small></div><section id="chatlog" aria-live="polite">';
  msgs.forEach(function(m){
    var own=(!cfg.id)||m.v.from===(cfg.me||'a');
    html+='<div class="card chat-msg '+(own?'mine':'theirs')+'"><small>'+E(m.v.fromName||((m.v.from==='b')?D.names[1]:D.names[0]))+' · '+E(new Date(m.v.at||m.t).toLocaleString('fa-IR'))+'</small><p>'+E(m.v.text)+'</p><button class="x" data-del="'+E('chat:'+m.id)+'">حذف</button></div>';
  });
  html+='</section><form class="card" id="chatform"><label for="chattext">پیام شما</label><textarea id="chattext" rows="3" maxlength="3000" placeholder="یک پیام دوست‌داشتنی بنویس…" required></textarea><button type="submit">ارسال پیام</button></form>';
  V.innerHTML=html;
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
  V.innerHTML='<h2>بازی‌های دونفره 🎮</h2><div class="card"><h3>دوز عاشقانه</h3><p>'+(online?'اتاق مشترک فعال است؛ نوبت شما: '+(role==='a'?'X':'O'):'حالت محلی؛ دو نفر می‌توانند روی همین دستگاه بازی کنند.')+'</p><small>برای بازی از دو گوشی، ابتدا فضای مشترک را از صفحه خانه بسازید و لینک دعوت را برای نفر دوم بفرستید.</small></div><div class="card">'+board+'<p class="game-status">'+(w?(w==='draw'?'بازی مساوی شد.':('برنده: '+(w==='a'?'X':'O'))):(g.status==='playing'?'نوبت: '+(g.turn==='a'?'X':'O'):'بازی تمام شده'))+'</p><button id="newgame">شروع دوباره</button></div><div class="card"><h3>حقیقت یا جرئت</h3><p id="tod">یک سؤال انتخاب کن و با هم جواب بدهید.</p><button id="truth">حقیقت</button> <button id="dare">جرئت</button><button id="nexttod" class="secondary">سؤال بعدی</button></div><div class="card"><h3>چقدر من را می‌شناسی؟</h3><p>هر نفر جداگانه پاسخ بدهد و سپس جواب‌ها را با هم مقایسه کنید.</p><p id="knowq"></p><button id="nextknow">سؤال بعدی</button></div>';
  V.querySelectorAll('[data-cell]').forEach(function(b){b.onclick=function(){
    var idx=+b.getAttribute('data-cell'),cur=I['game:state']&&I['game:state'].v;
    if(!cur||!Array.isArray(cur.board))cur={board:['','','','','','','','',''],turn:'a',status:'playing'};
    if(cur.status!=='playing'||cur.board[idx]||(online&&cur.turn!==role))return;
    cur=JSON.parse(JSON.stringify(cur));cur.board[idx]=online?(role==='a'?'X':'O'):(cur.turn==='a'?'X':'O');
    var win=winner(cur.board);cur.winner=win;cur.status=win?'finished':'playing';cur.turn=cur.turn==='a'?'b':'a';cur.updated=Date.now();
    set('game:state',cur);games();
  }});
  $('#newgame').onclick=function(){if(!confirm('بازی فعلی از نو شروع شود؟'))return;set('game:state',{board:['','','','','','','','',''],turn:'a',status:'playing',winner:'',updated:Date.now()});games();};
  var truths=['کدام خاطره‌مان را همیشه به یاد می‌آوری؟','چه کاری باعث می‌شود بیشتر احساس دوست‌داشته‌شدن کنی؟','قرار رؤیایی تو چه شکلی است؟','چه چیزی را دوست داری با هم تجربه کنیم؟','اولین چیزی که در من توجهت را جلب کرد چه بود؟'];
  var dares=['یک پیام عاشقانه در سه جمله بگو.','یک آهنگ برای رابطه‌مان انتخاب کن.','سه ویژگی دوست‌داشتنی طرف مقابل را بگو.','یک قرار ساده برای این هفته پیشنهاد بده.','یک خاطره خنده‌دارمان را تعریف کن.'];
  var know=['غذای موردعلاقه من چیست؟','کدام مقصد را بیشتر دوست دارم؟','چه چیزی سریع حالم را بهتر می‌کند؟','کدام خاطره‌مان برایم خاص‌تر است؟','چه مهارتی را دوست دارم یاد بگیرم؟'];
  function pick(a,id){$('#'+id).textContent=a[Math.floor(Math.random()*a.length)];}
  $('#truth').onclick=function(){pick(truths,'tod')};$('#dare').onclick=function(){pick(dares,'tod')};$('#nexttod').onclick=function(){pick(truths.concat(dares),'tod')};$('#nextknow').onclick=function(){pick(know,'knowq')};pick(know,'knowq');
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
  V.innerHTML='<h2>تنظیمات خانه‌ی ما ⚙️</h2><div class="card"><h3>ظاهر سایت</h3><label for="theme">پوسته</label><select id="theme"><option value="light" '+(cfg.theme==='light'?'selected':'')+'>روشن</option><option value="dark" '+(cfg.theme==='dark'?'selected':'')+'>تیره</option><option value="auto" '+(!cfg.theme?'selected':'')+'>مطابق دستگاه</option></select><button id="savetheme">ذخیره پوسته</button></div><div class="card"><h3>تنظیمات رابطه</h3><label for="startdate">تاریخ شروع رابطه</label><input type="date" id="startdate" value="'+start+'"><p><small>تغییر این تاریخ فقط روزشمار را تنظیم می‌کند و خاطرات ثبت‌شده حذف نمی‌شوند.</small></p><button id="savestart">ذخیره تاریخ</button></div><div class="card"><h3>نام‌ها</h3><label for="name0">نام نفر اول</label><input id="name0" maxlength="24" value="'+E(D.names[0])+'"><label for="name1">نام نفر دوم</label><input id="name1" maxlength="24" value="'+E(D.names[1])+'"><button id="savenames">ذخیره نام‌ها</button></div><div class="card"><h3>داده‌های همین دستگاه</h3><button id="clearlocal" class="secondary">پاک‌کردن داده‌های محلی</button><p><small>این کار فقط داده‌های ذخیره‌شده در همین مرورگر را پاک می‌کند و داده‌های ابری را حذف نمی‌کند.</small></p></div><div class="card"><h3>وضعیت اتصال</h3><p>'+(API?'آدرس API تنظیم شده است.':'آدرس API هنوز در config.js تنظیم نشده است.')+'</p><p>'+(cfg.id?'فضای مشترک: فعال':'فضای مشترک: تنظیم نشده')+'</p><p><small>برای استفاده دونفره، API باید روی سرور واقعی نصب و متغیر ORIGIN آن محدود به دامنه سایت شود.</small></p></div>';
  $('#savetheme').onclick=function(){var t=$('#theme').value;cfg.theme=t==='auto'?'':t;if(cfg.theme)document.documentElement.setAttribute('data-theme',cfg.theme);else document.documentElement.removeAttribute('data-theme');save();toast('پوسته ذخیره شد.');};
  $('#savestart').onclick=function(){var v=$('#startdate').value;if(!ISO.test(v))return toast('تاریخ معتبر انتخاب کنید.');cfg.start=v;set('settings:start',v);toast('تاریخ شروع برای هر دو نفر ذخیره شد.');home();};
  $('#savenames').onclick=function(){var a=$('#name0').value.trim(),b=$('#name1').value.trim();if(!a||!b)return toast('هر دو نام را وارد کنید.');set('names:0',a);set('names:1',b);settings();toast('نام‌ها ذخیره شدند.');};
  $('#clearlocal').onclick=function(){if(!confirm('همه داده‌های محلی این مرورگر پاک شود؟ قبل از ادامه پشتیبان بگیرید.'))return;localStorage.removeItem(K);location.reload();};
}

var R={index:home,story:story,letters:letters,wishes:wishes,calendar:cal,qa:qa,chat:chat,games:games,map:mapPage,settings:settings};
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
document.addEventListener('visibilitychange',function(){if(!document.hidden){tick();poll()}});
window.addEventListener('ourhome:localchange',function(){var liveCfg=Object.assign({},cfg);if(loadLS()){cfg=Object.assign({},cfg,liveCfg);applyStartSetting();build();if(Object.keys(dirty).length)sched();if(!editing())(R[P]||home)();}});
window.addEventListener('storage',function(e){if(e.key===K&&!editing()){loadLS();build();R[P]()}});
(R[P]||home)();status();
if(cfg.id)flush();
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(function(){});
})();
