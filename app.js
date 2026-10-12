(function(){
'use strict';
var API=(window.OURHOME_API||'').replace(/\/+$/,''),K='hd2',S=new Date(2026,8,30),MS=[30,50,100,200,365,500,1000],P=document.body.getAttribute('data-page'),ISO=/^\d{4}-\d{2}-\d{2}$/,tt;
var I={},dirty={},cfg={},D,otherSeen=0,busy=false,dead=false,timer=null;

/* ---------- اعتبارسنجی ---------- */
function str(v,n){return typeof v==='string'?v.slice(0,n):''}
function clean(c,v){
  if(c==='story')return ISO.test(v.d)&&str(v.t,1)?{d:v.d,t:str(v.t,120),x:str(v.x,3000)}:0;
  if(c==='letters')return ISO.test(v.c)&&str(v.t,1)?{f:v.f?1:0,t:str(v.t,120),x:str(v.x,20000),c:v.c,u:ISO.test(v.u)?v.u:''}:0;
  if(c==='wishes')return str(v.t,1)?{t:str(v.t,200),k:v.k?1:0}:0;
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
function save(){try{localStorage.setItem(K,JSON.stringify({I:I,cfg:cfg,dirty:dirty}))}catch(e){toast('ذخیره ممکن نیست؛ مرورگر در حالت خصوصی است یا حافظه پر شده. از «دانلود پشتیبان» استفاده کنید.')}}
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
function set(k,v){I[k]={v:v,t:Date.now()};dirty[k]=1;build();save();sched()}
function imp(d){
  var n=Date.now();Object.keys(I).forEach(function(k){I[k]={v:null,t:n}});
  function put(k,v){I[k]={v:v,t:n+1}}
  d.names.forEach(function(x,i){put('names:'+i,x)});
  ['story','letters','wishes','events'].forEach(function(c){d[c].forEach(function(e,i){var o={};Object.keys(e).forEach(function(f){if(f!=='id')o[f]=e[f]});put(c+':'+rid()+i,o)})});
  Object.keys(d.qa).forEach(function(k){put('qa:'+k+':0',d.qa[k][0]);put('qa:'+k+':1',d.qa[k][1])});
  Object.keys(I).forEach(function(k){dirty[k]=1});build();save();sched();
}
if(!loadLS()){var old=null;try{old=norm(JSON.parse(localStorage.getItem('hd1')))}catch(e){}if(old){I['story:start']={v:null,t:1};imp(old)}}
if(!I['story:start'])I['story:start']={v:{d:'2026-09-30',t:'شروع داستان ما',x:'روز اول؛ جایی که همه‌چیز شروع شد.'},t:0};
(function(){ /* پیوستن با لینک پارتنر */
  var h=new URLSearchParams(location.hash.slice(1)),d=h.get('d'),t=h.get('t');
  if(API&&d&&t&&/^[a-f0-9]{16}$/.test(d)&&/^[a-f0-9]{48}$/.test(t)){
    cfg={id:d,tok:t,me:h.get('p')==='a'?'a':'b'};Object.keys(I).forEach(function(k){dirty[k]=1});
    try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}save();
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
  if(!t){if(!API)t='';else if(!cfg.id)t='ذخیره‌ی محلی؛ فضای مشترک ساخته نشده';else{t='همگام ✓ · شما: '+(cfg.me==='a'?'نفر اول':'نفر دوم');if(otherSeen){var m=Math.max(0,Math.round((Date.now()-otherSeen)/6e4));t+=' · پارتنر: '+(m<1?'همین الان':fa(m)+' دقیقه پیش')}}}
  s.textContent=t;s.className=err?'sync err':'sync';
}

/* ---------- همگام‌سازی با Worker ---------- */
function api(m,b){return fetch(API+'/api/doc/'+cfg.id,{method:m,headers:{'content-type':'application/json','x-token':cfg.tok},body:b?JSON.stringify(b):undefined}).then(function(r){return r.json().catch(function(){return{}}).then(function(j){if(!r.ok){j.status=r.status;throw j}return j})})}
function merge(r){
  var ch=false;Object.keys(r.items||{}).forEach(function(k){var x=r.items[k],l=I[k];if(x&&typeof x.t==='number'&&(!l||x.t>l.t)){I[k]={v:x.v,t:x.t};ch=true}});
  var o=cfg.me==='a'?'b':'a';if(r.seen&&r.seen[o])otherSeen=r.seen[o];
  if(ch){build();save()}return ch;
}
function sched(){clearTimeout(timer);timer=setTimeout(function(){timer=null;flush()},800)}
function flush(){
  if(!cfg.id||!API||busy||dead)return status();
  var ks=Object.keys(dirty);if(!ks.length)return status();
  var body={items:{}};ks.forEach(function(k){body.items[k]=I[k]});
  busy=true;status('در حال همگام‌سازی…');
  api('PUT',body).then(function(r){
    ks.forEach(function(k){var s=r.items&&r.items[k];if(s&&s.t>=body.items[k].t&&I[k]===body.items[k])delete dirty[k]});
    if(merge(r)&&!editing())R[P]();save();status();
  }).catch(function(e){
    if(e&&(e.status===401||e.status===404)){dead=true;status('لینک یا توکن فضای مشترک معتبر نیست',1);return}
    status((e&&e.error)||'ارتباط با سرور برقرار نیست؛ دوباره تلاش می‌شود',1);
  }).then(function(){busy=false;if(!dead&&Object.keys(dirty).length&&!timer)timer=setTimeout(function(){timer=null;flush()},4000)});
}
function poll(){
  if(document.hidden||!cfg.id||!API||busy||dead||Object.keys(dirty).length)return;
  api('GET').then(function(r){if(merge(r)&&!editing())R[P]();status()}).catch(function(e){if(e&&(e.status===401||e.status===404)){dead=true;status('لینک یا توکن فضای مشترک معتبر نیست',1)}else status('ارتباط با سرور برقرار نیست',1)});
}
function link(){
  var u=new URL('index.html',location.href).href+'#d='+cfg.id+'&t='+cfg.other+'&p=b';
  if(navigator.share)navigator.share({title:'خانه‌ی ما',url:u}).catch(function(){});
  else if(navigator.clipboard)navigator.clipboard.writeText(u).then(function(){toast('لینک پارتنر کپی شد')},function(){prompt('لینک را کپی کنید:',u)});
  else prompt('لینک را کپی کنید:',u);
}

/* ---------- منو ---------- */
var N=[['index','🏠','خانه'],['story','📖','داستان ما'],['letters','💌','نامه‌ها'],['wishes','✨','آرزوها'],['calendar','📅','تقویم'],['qa','💬','سؤال'],['pledge','📜','تعهدنامه']];
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
  var sy=!API?'':(!cfg.id?'<button id="sc">ساخت فضای مشترک دو نفره</button> ':(cfg.other?'<button id="sl">ارسال لینک پارتنر</button> ':''));
  V.innerHTML=b+'<div class="go"><a href="story.html">📖 ثبت لحظه‌ی تازه</a><a href="letters.html">💌 نوشتن نامه</a><a href="wishes.html">✨ آرزوها</a><a href="calendar.html">📅 رویداد تازه</a><a href="qa.html">💬 سؤال امروز</a><a href="pledge.html">📜 تعهدنامه</a></div>'
   +'<p><small>'+(cfg.id?'نوشته‌ها بین شما و پارتنرتان همگام می‌شود.':'نوشته‌ها فقط روی همین دستگاه ذخیره می‌شوند.')+' گاهی پشتیبان بگیرید.</small></p>'+sy+'<button id="ex">دانلود پشتیبان</button> <button id="im">بازیابی</button><input type="file" id="fi" accept=".json,application/json" hidden>';
  if($('#sc'))$('#sc').onclick=function(){
    if(!confirm('یک فضای مشترک ساخته می‌شود و نوشته‌های فعلی داخلش می‌رود. سپس «ارسال لینک پارتنر» را بزنید و لینک را فقط برای پارتنرتان بفرستید (هر کس با آن لینک می‌تواند ویرایش کند). ادامه؟'))return;
    fetch(API+'/api/create',{method:'POST'}).then(function(r){return r.json()}).then(function(j){
      if(!j.id)throw j;cfg={id:j.id,tok:j.a,me:'a',other:j.b};Object.keys(I).forEach(function(k){dirty[k]=1});save();flush();home();link();
    }).catch(function(e){toast((e&&e.error)||'ساخت فضای مشترک ناموفق بود')});
  };
  if($('#sl'))$('#sl').onclick=link;
  $('#ex').onclick=function(){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(D)],{type:'application/json'}));a.download='our-home-backup.json';a.click();toast('فایل پشتیبان دانلود شد')};
  $('#im').onclick=function(){$('#fi').click()};
  $('#fi').onchange=function(){var f=this.files[0];if(!f)return;var r=new FileReader();r.onload=function(){try{var d=norm(JSON.parse(r.result));if(!d)throw 0;if(!confirm('داده‌های فعلی با فایل پشتیبان جایگزین شود؟'))return;imp(d);home();toast('بازیابی شد')}catch(e){toast('فایل پشتیبان معتبر نیست')}};r.readAsText(f)};
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
  D.wishes.forEach(function(w){h+='<div class="card row'+(w.k?' done':'')+'"><input type="checkbox" data-chk="'+E(w.id)+'"'+(w.k?' checked':'')+' aria-label="انجام شد: '+E(w.t)+'"><span class="grow">'+E(w.t)+'</span><button class="x" data-del="wishes:'+E(w.id)+'" aria-label="حذف «'+E(w.t)+'»">حذف</button></div>'});
  V.innerHTML='<h2>آرزوهای مشترک</h2><div class="card"><input id="b" maxlength="200" placeholder="مثلاً: دیدن شفق قطبی" aria-label="آرزوی تازه"><button id="ad">افزودن آرزو</button></div><p><small id="cnt"></small></p>'+(h||'<p><small>هنوز آرزویی ثبت نشده.</small></p>');
  cnt();
  $('#ad').onclick=function(){var t=$('#b').value.trim();if(!t)return toast('آرزو را بنویسید');set('wishes:'+rid(),{t:t,k:0});wishes();focusB()};
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

var R={index:home,story:story,letters:letters,wishes:wishes,calendar:cal,qa:qa};
V.addEventListener('click',function(e){
  var d=e.target.getAttribute&&e.target.getAttribute('data-del');
  if(d&&I[d]&&confirm('حذف شود؟')){set(d,null);R[P]()}
});
V.addEventListener('change',function(e){
  var c=e.target.getAttribute('data-chk');if(c===null)return;
  var w=D.wishes.filter(function(x){return x.id===c})[0];if(!w)return;
  set('wishes:'+c,{t:w.t,k:e.target.checked?1:0});
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
setInterval(tick,60000);setInterval(poll,8000);
document.addEventListener('visibilitychange',function(){if(!document.hidden){tick();poll()}});
window.addEventListener('storage',function(e){if(e.key===K&&!editing()){loadLS();build();R[P]()}});
R[P]();status();
if(cfg.id)flush();
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(function(){});
})();
