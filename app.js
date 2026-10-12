(function(){
var K='hd1',S=new Date(2026,8,30),MS=[30,50,100,200,365,500,1000],P=document.body.getAttribute('data-page');
var D={names:['من','پارتنرم'],story:[{d:'2026-09-30',t:'شروع داستان ما',x:'روز اول؛ جایی که همه‌چیز شروع شد.'}],letters:[],wishes:[],events:[],qa:{}};
function fix(){D.events=D.events||[];D.qa=D.qa||{}}
try{var o=JSON.parse(localStorage.getItem(K));if(o&&o.story){D=o;fix()}}catch(e){}
function sv(){try{localStorage.setItem(K,JSON.stringify(D))}catch(e){}}
var V=document.getElementById('v');
function $(s){return document.querySelector(s)}
function fa(n){return Number(n).toLocaleString('fa-IR')}
function shD(d){return d.toLocaleDateString('fa-IR-u-ca-persian',{year:'numeric',month:'long',day:'numeric'})}
function sh(s){return shD(new Date(s+'T12:00:00'))}
function E(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function pad(n){return String(n).padStart(2,'0')}
function iso(){var t=new Date();return t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate())}
function day(){var t=new Date();t=new Date(t.getFullYear(),t.getMonth(),t.getDate());return Math.round((t-S)/864e5)+1}
function until(s,r){var t=new Date();t=new Date(t.getFullYear(),t.getMonth(),t.getDate());var d=new Date(s+'T00:00:00');if(r){d.setFullYear(t.getFullYear());if(d<t)d.setFullYear(t.getFullYear()+1)}return Math.round((d-t)/864e5)}

var N=[['index','🏠','خانه'],['story','📖','داستان ما'],['letters','💌','نامه‌ها'],['wishes','✨','آرزوها'],['calendar','📅','تقویم'],['qa','💬','سؤال'],['pledge','📜','تعهدنامه']];
var nv=document.createElement('nav');
nv.innerHTML=N.map(function(n){return '<a href="'+n[0]+'.html"'+(n[0]===P?' class="on"':'')+'><b>'+n[1]+'</b>'+n[2]+'</a>'}).join('');
document.body.appendChild(nv);

function home(){
  var n=day(),nx=MS.find(function(m){return m>n})||n+100,pv=MS.filter(function(m){return m<=n}).pop()||0,span=nx-pv,got=n-pv,vis='';
  if(span<=50){for(var i=0;i<span;i++)vis+='<i'+(i<got?' class="f"':'')+'></i>';vis='<div class="dots" aria-hidden="true">'+vis+'</div>'}
  else vis='<div class="bar"><i style="width:'+Math.round(got/span*100)+'%"></i></div>';
  var md=new Date(S.getTime()+(nx-1)*864e5);
  V.innerHTML='<div class="hero"><div class="nm"><span contenteditable="true" data-i="0">'+E(D.names[0])+'</span> و <span contenteditable="true" data-i="1">'+E(D.names[1])+'</span></div>'
   +'<div class="num">'+fa(n)+'</div><div class="lbl">روز با هم</div><small>از '+shD(S)+'</small>'+vis
   +'<small>'+fa(nx-n)+' روز تا روز '+fa(nx)+'ام ('+shD(md)+')</small></div>'
   +(MS.indexOf(n)>-1?'<div class="card">🎉 امروز روز '+fa(n)+'ام است!</div>':'')
   +'<div class="go"><a href="story.html">📖 ثبت لحظه‌ی تازه</a><a href="letters.html">💌 نوشتن نامه</a><a href="wishes.html">✨ آرزوها</a><a href="calendar.html">📅 رویداد تازه</a><a href="qa.html">💬 سؤال امروز</a><a href="pledge.html">📜 تعهدنامه</a></div>'
   +'<p><small>نوشته‌ها روی همین دستگاه ذخیره می‌شوند.</small></p><button id="ex">دانلود پشتیبان</button> <button id="im">بازیابی</button><input type="file" id="fi" accept=".json" hidden>';
  $('#ex').onclick=function(){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(D)],{type:'application/json'}));a.download='our-home-backup.json';a.click()};
  $('#im').onclick=function(){$('#fi').click()};
  $('#fi').onchange=function(){var f=this.files[0];if(!f)return;var r=new FileReader();r.onload=function(){try{var d=JSON.parse(r.result);if(!d.story)throw 0;D=d;fix();sv();home()}catch(e){alert('فایل معتبر نیست')}};r.readAsText(f)};
}

function story(){
  var h='';
  D.story.map(function(s,i){return{s:s,i:i}}).sort(function(a,b){return a.s.d<b.s.d?-1:1}).forEach(function(o){
    h+='<div class="card"><small>'+sh(o.s.d)+'</small><h3>'+E(o.s.t)+'</h3><p>'+E(o.s.x)+'</p><button class="x" data-del="story:'+o.i+'">حذف</button></div>'});
  V.innerHTML='<h2>داستان ما</h2><div class="card"><input type="date" id="a" value="'+iso()+'" aria-label="تاریخ"><input id="b" placeholder="عنوان لحظه"><textarea id="c" rows="2" placeholder="چه اتفاقی افتاد؟"></textarea><button id="ad">افزودن به داستان</button></div>'+h;
  $('#ad').onclick=function(){var t=$('#b').value.trim();if(!t||!$('#a').value)return;D.story.push({d:$('#a').value,t:t,x:$('#c').value});sv();story()};
}

function letters(){
  var h='',t=iso();
  D.letters.forEach(function(l,i){
    var lk=l.u&&l.u>t;
    h='<div class="card'+(lk?' lock':'')+'"><small>از '+E(D.names[l.f])+' · '+sh(l.c)+'</small><h3>'+E(l.t)+'</h3>'
     +(lk?'<p>🔒 این نامه تا '+sh(l.u)+' بسته است.</p>':'<p>'+E(l.x)+'</p>')+'<button class="x" data-del="letters:'+i+'">حذف</button></div>'+h});
  V.innerHTML='<h2>نامه‌ها</h2><div class="card"><select id="f"><option value="0">از طرف '+E(D.names[0])+'</option><option value="1">از طرف '+E(D.names[1])+'</option></select><input id="b" placeholder="عنوان نامه"><textarea id="c" rows="5" placeholder="بنویس…"></textarea>'
   +'<label><small>قفل تا تاریخ (اختیاری، کپسول زمان)</small><input type="date" id="u" min="'+t+'"></label><button id="ad">ذخیره‌ی نامه</button></div>'+h;
  $('#ad').onclick=function(){var ti=$('#b').value.trim(),x=$('#c').value.trim();if(!ti||!x)return;D.letters.push({f:+$('#f').value,t:ti,x:x,c:t,u:$('#u').value});sv();letters()};
}

function wishes(){
  var h='';
  D.wishes.forEach(function(w,i){h+='<div class="card row'+(w.k?' done':'')+'"><input type="checkbox" data-chk="'+i+'"'+(w.k?' checked':'')+' aria-label="انجام شد"><span style="flex:1">'+E(w.t)+'</span><button class="x" data-del="wishes:'+i+'">حذف</button></div>'});
  V.innerHTML='<h2>آرزوهای مشترک</h2><div class="card"><input id="b" placeholder="مثلاً: دیدن شفق قطبی"><button id="ad">افزودن آرزو</button></div>'+h;
  $('#ad').onclick=function(){var t=$('#b').value.trim();if(!t)return;D.wishes.push({t:t,k:0});sv();wishes()};
}

function cal(){
  var h='';
  D.events.map(function(e,i){return{e:e,i:i,n:until(e.d,e.r)}}).sort(function(a,b){return ((a.n<0)-(b.n<0))||Math.abs(a.n)-Math.abs(b.n)}).forEach(function(o){
    h+='<div class="card"><small>'+sh(o.e.d)+(o.e.r?' · هر سال':'')+'</small><h3>'+E(o.e.t)+'</h3><p>'+(o.n===0?'🎉 امروز است':o.n>0?fa(o.n)+' روز مانده':fa(-o.n)+' روز پیش')+'</p><button class="x" data-del="events:'+o.i+'">حذف</button></div>'});
  V.innerHTML='<h2>تقویم</h2><div class="card"><input type="date" id="a" value="'+iso()+'" aria-label="تاریخ"><input id="b" placeholder="مثلاً: اولین سالگرد"><label class="row"><input type="checkbox" id="r"><span>هر سال تکرار شود</span></label><button id="ad">افزودن رویداد</button></div>'+(h||'<p><small>هنوز رویدادی نیست؛ سالگرد یا قرار بعدی را اضافه کنید.</small></p>');
  $('#ad').onclick=function(){var t=$('#b').value.trim();if(!t||!$('#a').value)return;D.events.push({d:$('#a').value,t:t,r:$('#r').checked});sv();cal()};
}

var Q=['کوچک‌ترین چیزی که امروز تو را خوشحال کرد چه بود؟','اگر فردا یک روز آزاد داشتیم، کجا می‌رفتیم؟','کدام خاطره‌ی ما را بیشتر از همه دوست داری؟','چه چیزی در من تو را آرام می‌کند؟','یک آرزوی کوچک برای این ماه؟','چه آهنگی تو را یاد من می‌اندازد؟','چه چیزی را امسال دوست داری با هم یاد بگیریم؟'];
function qa(){
  var n=day(),a=D.qa[n]||['',''];
  V.innerHTML='<h2>سؤال امروز</h2><div class="card"><h3>'+Q[n%Q.length]+'</h3></div>'+[0,1].map(function(i){return '<div class="card"><small>پاسخ '+E(D.names[i])+'</small><textarea rows="3" data-a="'+i+'">'+E(a[i])+'</textarea></div>'}).join('')+'<button id="ad">ذخیره‌ی پاسخ‌ها</button>';
  $('#ad').onclick=function(){var t=document.querySelectorAll('[data-a]');D.qa[n]=[t[0].value,t[1].value];sv();this.textContent='ذخیره شد ✓'};
}

var R={index:home,story:story,letters:letters,wishes:wishes,calendar:cal,qa:qa};
V.addEventListener('click',function(e){
  var d=e.target.getAttribute&&e.target.getAttribute('data-del');
  if(d&&confirm('حذف شود؟')){var p=d.split(':');D[p[0]].splice(+p[1],1);sv();R[P]()}
});
V.addEventListener('change',function(e){
  var c=e.target.getAttribute('data-chk');
  if(c!==null){D.wishes[+c].k=e.target.checked?1:0;sv();wishes()}
});
V.addEventListener('focusout',function(e){
  var i=e.target.getAttribute&&e.target.getAttribute('data-i');
  if(i){D.names[+i]=e.target.textContent.trim()||D.names[+i];sv()}
  else if(i==='0'){D.names[0]=e.target.textContent.trim()||D.names[0];sv()}
});
R[P]();
})();
