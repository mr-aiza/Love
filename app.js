(function(){
'use strict';
var K='hd1',S=new Date(2026,8,30),MS=[30,50,100,200,365,500,1000],P=document.body.getAttribute('data-page'),ISO=/^\d{4}-\d{2}-\d{2}$/,tt;
function def(){return{names:['من','پارتنرم'],story:[{d:'2026-09-30',t:'شروع داستان ما',x:'روز اول؛ جایی که همه‌چیز شروع شد.'}],letters:[],wishes:[],events:[],qa:{}}}
function str(v,n){return typeof v==='string'?v.slice(0,n):''}
function list(a,f){return Array.isArray(a)?a.map(f).filter(Boolean).slice(0,2000):[]}
/* اعتبارسنجی داده: هم برای حافظه‌ی مرورگر، هم برای فایل پشتیبان */
function norm(d){
  if(!d||typeof d!=='object'||!Array.isArray(d.story))return null;
  var r={names:[0,1].map(function(i){return str(d.names&&d.names[i],24).trim()||['من','پارتنرم'][i]}),qa:{}};
  r.story=list(d.story,function(s){return s&&ISO.test(s.d)&&str(s.t,1)?{d:s.d,t:str(s.t,120),x:str(s.x,3000)}:0});
  r.letters=list(d.letters,function(l){return l&&ISO.test(l.c)&&str(l.t,1)?{f:l.f?1:0,t:str(l.t,120),x:str(l.x,20000),c:l.c,u:ISO.test(l.u)?l.u:''}:0});
  r.wishes=list(d.wishes,function(w){return w&&str(w.t,1)?{t:str(w.t,200),k:w.k?1:0}:0});
  r.events=list(d.events,function(e){return e&&ISO.test(e.d)&&str(e.t,1)?{d:e.d,t:str(e.t,120),r:!!e.r}:0});
  if(d.qa&&typeof d.qa==='object')Object.keys(d.qa).slice(0,3000).forEach(function(k){var a=d.qa[k];if(/^\d+$/.test(k)&&Array.isArray(a))r.qa[k]=[str(a[0],3000),str(a[1],3000)]});
  return r;
}
var D;
function load(){var r=null;try{r=norm(JSON.parse(localStorage.getItem(K)))}catch(e){}D=r||def()}
load();
function sv(){try{localStorage.setItem(K,JSON.stringify(D))}catch(e){toast('ذخیره ممکن نیست؛ مرورگر در حالت خصوصی است یا حافظه پر شده. از «دانلود پشتیبان» استفاده کنید.')}}
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}
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

var N=[['index','🏠','خانه'],['story','📖','داستان ما'],['letters','💌','نامه‌ها'],['wishes','✨','آرزوها'],['calendar','📅','تقویم'],['qa','💬','سؤال'],['pledge','📜','تعهدنامه']];
var nv=document.createElement('nav');nv.setAttribute('aria-label','منوی اصلی');
nv.innerHTML=N.map(function(n){return '<a href="'+n[0]+'.html"'+(n[0]===P?' class="on" aria-current="page"':'')+'><b aria-hidden="true">'+n[1]+'</b>'+n[2]+'</a>'}).join('');
document.body.appendChild(nv);

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
  V.innerHTML=b+'<div class="go"><a href="story.html">📖 ثبت لحظه‌ی تازه</a><a href="letters.html">💌 نوشتن نامه</a><a href="wishes.html">✨ آرزوها</a><a href="calendar.html">📅 رویداد تازه</a><a href="qa.html">💬 سؤال امروز</a><a href="pledge.html">📜 تعهدنامه</a></div>'
   +'<p><small>نوشته‌ها فقط روی همین دستگاه ذخیره می‌شوند؛ گاهی پشتیبان بگیرید.</small></p><button id="ex">دانلود پشتیبان</button> <button id="im">بازیابی</button><input type="file" id="fi" accept=".json,application/json" hidden>';
  $('#ex').onclick=function(){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(D)],{type:'application/json'}));a.download='our-home-backup.json';a.click();toast('فایل پشتیبان دانلود شد')};
  $('#im').onclick=function(){$('#fi').click()};
  $('#fi').onchange=function(){var f=this.files[0];if(!f)return;var r=new FileReader();r.onload=function(){try{var d=norm(JSON.parse(r.result));if(!d)throw 0;if(!confirm('داده‌های فعلی با فایل پشتیبان جایگزین شود؟'))return;D=d;sv();home();toast('بازیابی شد')}catch(e){toast('فایل پشتیبان معتبر نیست')}};r.readAsText(f)};
}

function story(){
  var h='';
  D.story.map(function(s,i){return{s:s,i:i}}).sort(function(a,b){return a.s.d<b.s.d?-1:1}).forEach(function(o){
    h+='<div class="card"><small>'+sh(o.s.d)+'</small><h3>'+E(o.s.t)+'</h3><p>'+E(o.s.x)+'</p><button class="x" data-del="story:'+o.i+'" aria-label="حذف «'+E(o.s.t)+'»">حذف</button></div>'});
  V.innerHTML='<h2>داستان ما</h2><div class="card"><input type="date" id="a" value="'+iso()+'" aria-label="تاریخ"><input id="b" maxlength="120" placeholder="عنوان لحظه" aria-label="عنوان لحظه"><textarea id="c" rows="2" maxlength="3000" placeholder="چه اتفاقی افتاد؟" aria-label="توضیح"></textarea><button id="ad">افزودن به داستان</button></div>'+h;
  $('#ad').onclick=function(){var t=$('#b').value.trim();if(!t||!$('#a').value)return toast('تاریخ و عنوان لازم است');D.story.push({d:$('#a').value,t:t,x:$('#c').value});sv();story();focusB()};
}

function letters(){
  var h='',t=iso();
  D.letters.forEach(function(l,i){
    var lk=l.u&&l.u>t;
    h='<div class="card'+(lk?' lock':'')+'"><small>از '+E(D.names[l.f])+' · '+sh(l.c)+'</small><h3>'+E(l.t)+'</h3>'
     +(lk?'<p>🔒 این نامه تا '+sh(l.u)+' بسته است.</p>':'<p>'+E(l.x)+'</p>')+'<button class="x" data-del="letters:'+i+'" aria-label="حذف نامه «'+E(l.t)+'»">حذف</button></div>'+h});
  V.innerHTML='<h2>نامه‌ها</h2><div class="card"><select id="f" aria-label="فرستنده"><option value="0">از طرف '+E(D.names[0])+'</option><option value="1">از طرف '+E(D.names[1])+'</option></select><input id="b" maxlength="120" placeholder="عنوان نامه" aria-label="عنوان نامه"><textarea id="c" rows="5" maxlength="20000" placeholder="بنویس…" aria-label="متن نامه"></textarea>'
   +'<label><small>قفل تا تاریخ (اختیاری، کپسول زمان)</small><input type="date" id="u" min="'+t+'"></label><small>قفل فقط نمایشی است؛ هر کس به این دستگاه دسترسی داشته باشد می‌تواند متن را ببیند.</small><br><button id="ad">ذخیره‌ی نامه</button></div>'+(h||'<p><small>هنوز نامه‌ای نیست؛ اولین نامه را بنویسید.</small></p>');
  $('#ad').onclick=function(){var ti=$('#b').value.trim(),x=$('#c').value.trim();if(!ti||!x)return toast('عنوان و متن نامه لازم است');D.letters.push({f:+$('#f').value?1:0,t:ti,x:x,c:t,u:$('#u').value});sv();letters()};
}

function cnt(){var c=$('#cnt');if(c)c.textContent=fa(D.wishes.filter(function(w){return w.k}).length)+' از '+fa(D.wishes.length)+' آرزو انجام شده'}
function wishes(){
  var h='';
  D.wishes.forEach(function(w,i){h+='<div class="card row'+(w.k?' done':'')+'"><input type="checkbox" data-chk="'+i+'"'+(w.k?' checked':'')+' aria-label="انجام شد: '+E(w.t)+'"><span class="grow">'+E(w.t)+'</span><button class="x" data-del="wishes:'+i+'" aria-label="حذف «'+E(w.t)+'»">حذف</button></div>'});
  V.innerHTML='<h2>آرزوهای مشترک</h2><div class="card"><input id="b" maxlength="200" placeholder="مثلاً: دیدن شفق قطبی" aria-label="آرزوی تازه"><button id="ad">افزودن آرزو</button></div><p><small id="cnt"></small></p>'+(h||'<p><small>هنوز آرزویی ثبت نشده.</small></p>');
  cnt();
  $('#ad').onclick=function(){var t=$('#b').value.trim();if(!t)return toast('آرزو را بنویسید');D.wishes.push({t:t,k:0});sv();wishes();focusB()};
}

function cal(){
  var h='';
  D.events.map(function(e,i){return{e:e,i:i,n:until(e.d,e.r)}}).sort(function(a,b){return ((a.n<0)-(b.n<0))||Math.abs(a.n)-Math.abs(b.n)}).forEach(function(o){
    h+='<div class="card"><small>'+sh(o.e.d)+(o.e.r?' · هر سال':'')+'</small><h3>'+E(o.e.t)+'</h3><p>'+(o.n===0?'🎉 امروز است':o.n>0?fa(o.n)+' روز مانده':fa(-o.n)+' روز پیش')+'</p><button class="x" data-del="events:'+o.i+'" aria-label="حذف «'+E(o.e.t)+'»">حذف</button></div>'});
  V.innerHTML='<h2>تقویم</h2><div class="card"><input type="date" id="a" value="'+iso()+'" aria-label="تاریخ"><input id="b" maxlength="120" placeholder="مثلاً: اولین سالگرد" aria-label="عنوان رویداد"><label class="row"><input type="checkbox" id="r"><span>هر سال تکرار شود</span></label><button id="ad">افزودن رویداد</button></div>'+(h||'<p><small>هنوز رویدادی نیست؛ سالگرد یا قرار بعدی را اضافه کنید.</small></p>');
  $('#ad').onclick=function(){var t=$('#b').value.trim();if(!t||!$('#a').value)return toast('تاریخ و عنوان لازم است');D.events.push({d:$('#a').value,t:t,r:$('#r').checked});sv();cal();focusB()};
}

var Q=['کوچک‌ترین چیزی که امروز تو را خوشحال کرد چه بود؟','اگر فردا یک روز آزاد داشتیم، کجا می‌رفتیم؟','کدام خاطره‌ی ما را بیشتر از همه دوست داری؟','چه چیزی در من تو را آرام می‌کند؟','یک آرزوی کوچک برای این ماه؟','چه آهنگی تو را یاد من می‌اندازد؟','چه چیزی را امسال دوست داری با هم یاد بگیریم؟','چه کاری از من تو را بی‌دلیل می‌خنداند؟','اگر قرار بود یک غذا را همیشه با هم بپزیم، کدام؟','امروز از من برای چه چیزی ممنونی؟'];
function qa(){
  var n=day(),a=D.qa[n]||['',''];
  V.innerHTML='<h2>سؤال امروز</h2><div class="card"><h3>'+Q[((n%Q.length)+Q.length)%Q.length]+'</h3></div>'+[0,1].map(function(i){return '<div class="card"><small>پاسخ '+E(D.names[i])+'</small><textarea rows="3" maxlength="3000" data-a="'+i+'" aria-label="پاسخ '+E(D.names[i])+'">'+E(a[i])+'</textarea></div>'}).join('')+'<button id="ad">ذخیره‌ی پاسخ‌ها</button>';
  $('#ad').onclick=function(){var t=document.querySelectorAll('[data-a]');D.qa[n]=[t[0].value,t[1].value];sv();this.textContent='ذخیره شد ✓'};
}

var R={index:home,story:story,letters:letters,wishes:wishes,calendar:cal,qa:qa};
V.addEventListener('click',function(e){
  var d=e.target.getAttribute&&e.target.getAttribute('data-del');
  if(d&&confirm('حذف شود؟')){var p=d.split(':');D[p[0]].splice(+p[1],1);sv();R[P]()}
});
V.addEventListener('change',function(e){
  var c=e.target.getAttribute('data-chk');if(c===null)return;
  var w=D.wishes[+c];if(!w)return;w.k=e.target.checked?1:0;sv();
  e.target.closest('.card').className='card row'+(w.k?' done':'');cnt();
});
V.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.getAttribute('data-i')!==null){e.preventDefault();e.target.blur()}});
V.addEventListener('paste',function(e){
  if(e.target.getAttribute('data-i')===null)return;
  e.preventDefault();document.execCommand('insertText',false,((e.clipboardData||window.clipboardData).getData('text')||'').replace(/\s+/g,' '));
});
V.addEventListener('focusout',function(e){
  var i=e.target.getAttribute&&e.target.getAttribute('data-i');if(i===null||i===undefined)return;
  var v=e.target.textContent.replace(/\s+/g,' ').trim().slice(0,24);
  if(v)D.names[+i]=v;e.target.textContent=D.names[+i];sv();
});
/* به‌روزرسانی خودکار: نیمه‌شب، برگشت به تب، و تغییر در تب دیگر */
var ld=day();
function tick(){var d=day();if(d!==ld&&!editing()){ld=d;R[P]()}}
setInterval(tick,60000);
document.addEventListener('visibilitychange',function(){if(!document.hidden)tick()});
window.addEventListener('storage',function(e){if(e.key===K&&!editing()){load();R[P]()}});
R[P]();
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(function(){});
})();
