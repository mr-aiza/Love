/* Cloudflare Worker: خانه‌ی ما — حساب کاربری + همگام‌سازی امن
 * Bindings: KV namespace DB
 * Variables: ORIGIN=https://mr-aiza.github.io ; SETUP_KEY=<یک کلید طولانی و محرمانه>
 */
const MAX_ITEM=300000, MAX_DOC=4500000, MAX_KEYS=5000;
const KEY=/^[a-z]{1,12}(:[A-Za-z0-9_-]{1,40}){1,2}$/;
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const rnd=n=>hex(crypto.getRandomValues(new Uint8Array(n)));
const enc=s=>new TextEncoder().encode(s);
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc(s)));
async function hashPassword(password,salt){const key=await crypto.subtle.importKey('raw',enc(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc(salt),iterations:210000,hash:'SHA-256'},key,256);return hex(bits)}
async function verifyPassword(password,rec){try{return (await hashPassword(password,rec.salt))===rec.ph}catch{return false}}
function accountKey(username){return 'u:'+username}
export default {
 async fetch(req,env){
  const origin=req.headers.get('Origin')||'';
  const cors={'access-control-allow-origin':env.ORIGIN||origin||'null','access-control-allow-headers':'content-type,x-token','access-control-allow-methods':'GET,PUT,POST,OPTIONS','access-control-max-age':'86400','vary':'Origin'};
  const J=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...cors,'content-type':'application/json;charset=utf-8','cache-control':'no-store'}});
  if(!env.ORIGIN)return J({error:'متغیر ORIGIN را در تنظیمات Worker تعریف کنید'},503);
  if(req.method==='OPTIONS'){if(origin!==env.ORIGIN)return J({error:'دامنه مجاز نیست'},403);return new Response(null,{status:204,headers:cors})}
  try{
   if(origin!==env.ORIGIN)return J({error:'دامنه مجاز نیست'},403);
   const u=new URL(req.url);
   const readBody=async()=>{let s=await req.text();if(s.length>10000)throw new Error('درخواست بیش از حد بزرگ است');try{return JSON.parse(s)}catch{return null}};
   const ip=req.headers.get('CF-Connecting-IP')||'x';
   const limited=async(tag,max=12)=>{const rk='rl:'+tag+':'+ip+':'+Math.floor(Date.now()/36e5);const n=+(await env.DB.get(rk)||0);if(n>=max)return false;await env.DB.put(rk,String(n+1),{expirationTtl:3700});return true};

   // راه‌اندازی یک‌باره حساب‌های 424 و 626
   if(req.method==='POST'&&u.pathname==='/api/setup'){
    if(!env.SETUP_KEY)return J({error:'متغیر SETUP_KEY در Cloudflare تنظیم نشده است'},503);
    if(!await limited('setup',5))return J({error:'تلاش‌های زیاد؛ بعداً دوباره امتحان کنید'},429);
    const body=await readBody();if(!body||typeof body.setupKey!=='string'||body.setupKey!==env.SETUP_KEY)return J({error:'کلید راه‌اندازی صحیح نیست'},403);
    if(await env.DB.get(accountKey('424'))||await env.DB.get(accountKey('626')))return J({error:'حساب‌ها قبلاً راه‌اندازی شده‌اند'},409);
    const password=typeof body.password==='string'?body.password:'';
    if(password.length<3||password.length>128)return J({error:'رمز عبور معتبر نیست'},400);
    const id=rnd(8),a=rnd(24),b=rnd(24),salt=rnd(16),ph=await hashPassword(password,salt);
    const doc={ta:await sha(a),tb:await sha(b),tv:'',items:{'names:0':{v:'علیرضا',t:Date.now()},'names:1':{v:'صبا',t:Date.now()+1}},seen:{a:0,b:0}};
    await env.DB.put('d:'+id,JSON.stringify(doc));
    const common={id,salt,ph,createdAt:Date.now()};
    await env.DB.put(accountKey('424'),JSON.stringify({...common,username:'424',name:'علیرضا',role:'a',docToken:a}));
    await env.DB.put(accountKey('626'),JSON.stringify({...common,username:'626',name:'صبا',role:'b',docToken:b}));
    return J({ok:true,message:'حساب‌های 424 و 626 ساخته شدند. اکنون وارد شوید.'},201);
   }

   if(req.method==='POST'&&u.pathname==='/api/login'){
    if(!await limited('login',12))return J({error:'تلاش‌های ورود زیاد است؛ یک ساعت دیگر امتحان کنید'},429);
    const body=await readBody(),username=body&&String(body.username||''),password=body&&String(body.password||'');
    if(!['424','626'].includes(username)||!password)return J({error:'نام کاربری یا رمز عبور اشتباه است'},401);
    const raw=await env.DB.get(accountKey(username));if(!raw)return J({error:'حساب‌ها هنوز راه‌اندازی نشده‌اند. از «راه‌اندازی اولیه» استفاده کنید.'},404);
    const rec=JSON.parse(raw);if(!await verifyPassword(password,rec))return J({error:'نام کاربری یا رمز عبور اشتباه است'},401);
    const session=rnd(32),sessionHash=await sha(session);
    await env.DB.put('s:'+sessionHash,JSON.stringify({id:rec.id,role:rec.role,username:rec.username,createdAt:Date.now()}),{expirationTtl:2592000});
    return J({ok:true,session,id:rec.id,me:rec.role,username:rec.username,name:rec.name,expiresIn:2592000});
   }

   if(req.method==='POST'&&u.pathname==='/api/logout'){
    const token=req.headers.get('x-token')||'';if(token)await env.DB.delete('s:'+await sha(token));return J({ok:true});
   }

   // لینک مشاهده قدیمی/سازگاری نسخه قبل
   if(req.method==='POST'&&u.pathname==='/api/create'){
    if(!await limited('create',10))return J({error:'درخواست زیاد است؛ بعداً تلاش کنید'},429);
    const id=rnd(8),a=rnd(24),b=rnd(24),v=rnd(24);
    await env.DB.put('d:'+id,JSON.stringify({ta:await sha(a),tb:await sha(b),tv:await sha(v),items:{},seen:{a:0,b:0}}));return J({id,a,b,v});
   }
   const vm=u.pathname.match(/^\/api\/view-token\/([a-f0-9]{16})$/);
   if(req.method==='POST'&&vm){const raw=await env.DB.get('d:'+vm[1]);if(!raw)return J({error:'فضای مشترک پیدا نشد'},404);const d=JSON.parse(raw),h=await sha(req.headers.get('x-token')||'');const role=await resolveRole(env,vm[1],h,d);if(role!=='a'&&role!=='b')return J({error:'فقط اعضای فضای مشترک می‌توانند لینک مشاهده بسازند'},401);const v=rnd(24);d.tv=await sha(v);await env.DB.put('d:'+vm[1],JSON.stringify(d));return J({v})}
   const m=u.pathname.match(/^\/api\/doc\/([a-f0-9]{16})$/);if(!m)return J({ok:true});
   const raw=await env.DB.get('d:'+m[1]);if(!raw)return J({error:'فضای خصوصی پیدا نشد'},404);const doc=JSON.parse(raw),h=await sha(req.headers.get('x-token')||'');const role=await resolveRole(env,m[1],h,doc);
   if(!role)return J({error:'برای دیدن این فضا باید وارد حساب خود شوید'},401);
   if(req.method==='GET')return J({items:doc.items,seen:doc.seen});
   if(role==='v')return J({error:'این لینک فقط اجازه مشاهده دارد'},403);
   if(req.method!=='PUT')return J({error:'روش نامعتبر'},405);
   const declared=+(req.headers.get('content-length')||0);if(declared>2e6)return J({error:'حجم درخواست زیاد است'},413);const txt=await req.text();if(txt.length>2e6)return J({error:'حجم درخواست زیاد است'},413);let body;try{body=JSON.parse(txt)}catch{return J({error:'JSON نامعتبر است'},400)}
   const inc=body&&body.items;if(!inc||typeof inc!=='object'||Array.isArray(inc))return J({error:'items نامعتبر است'},400);const ks=Object.keys(inc);if(ks.length>300)return J({error:'تعداد تغییرات در یک درخواست زیاد است'},413);const now=Date.now();
   for(const k of ks){const it=inc[k];if(!KEY.test(k)||!it||typeof it.t!=='number'||!isFinite(it.t))return J({error:'کلید یا مقدار نامعتبر'},400);const v=it.v===undefined?null:it.v;if(JSON.stringify(v).length>MAX_ITEM)return J({error:'یکی از موارد بیش از حد بزرگ است'},413);if((k==='s:0'&&role!=='a')||(k==='s:1'&&role!=='b'))return J({error:'این امضا مخصوص طرف دیگر است'},403);const cur=doc.items[k],t=Math.min(it.t,now+36e5);if(!cur||t>cur.t||(t===cur.t&&JSON.stringify(v)>JSON.stringify(cur.v)))doc.items[k]={v,t}}
   if(Object.keys(doc.items).length>MAX_KEYS)return J({error:'سند بیش از حد بزرگ شد'},413);doc.seen[role]=now;const out=JSON.stringify(doc);if(out.length>MAX_DOC)return J({error:'فضای مشترک بیش از حد بزرگ شد'},413);await env.DB.put('d:'+m[1],out);return J({items:doc.items,seen:doc.seen});
  }catch(e){return J({error:'خطای سرور؛ تنظیمات Worker و KV را بررسی کنید'},500)}
 }
};
async function resolveRole(env,id,hash,doc){
 if(hash===doc.ta)return 'a';if(hash===doc.tb)return 'b';if(doc.tv&&hash===doc.tv)return 'v';
 const raw=await env.DB.get('s:'+hash);if(!raw)return '';try{const s=JSON.parse(raw);return s.id===id?s.role:''}catch{return ''}
}
