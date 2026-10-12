/* Cloudflare Worker: خانه‌ی ما — حساب کاربری + همگام‌سازی امن
 * Bindings: KV namespace DB
 * Variables/Secrets: ORIGIN=https://mr-aiza.github.io ; USER_424_PASSWORD ; USER_626_PASSWORD
 */
const MAX_ITEM=300000, MAX_DOC=4500000, MAX_KEYS=5000;
const KEY=/^[a-z]{1,12}(:[A-Za-z0-9_-]{1,40}){1,2}$/;
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const rnd=n=>hex(crypto.getRandomValues(new Uint8Array(n)));
const enc=s=>new TextEncoder().encode(s);
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc(s)));
async function hashPassword(password,salt){const key=await crypto.subtle.importKey('raw',enc(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc(salt),iterations:100000,hash:'SHA-256'},key,256);return hex(bits)}
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
   if(!env.DB)return J({error:'اتصال فضای ذخیره‌سازی KV با نام DB در تنظیمات Worker وصل نشده است.'},503);
   if(origin!==env.ORIGIN)return J({error:'دامنه مجاز نیست'},403);
   const u=new URL(req.url);
   const readBody=async()=>{let s=await req.text();if(s.length>10000)throw new Error('درخواست بیش از حد بزرگ است');try{return JSON.parse(s)}catch{return null}};
   const ip=req.headers.get('CF-Connecting-IP')||'x';
   const limited=async(tag,max=12)=>{const rk='rl:'+tag+':'+ip+':'+Math.floor(Date.now()/36e5);const n=+(await env.DB.get(rk)||0);if(n>=max)return false;await env.DB.put(rk,String(n+1),{expirationTtl:3700});return true};

   if(req.method==='POST'&&u.pathname==='/api/login'){
    if(!await limited('login',12))return J({error:'تلاش‌های ورود زیاد است؛ یک ساعت دیگر امتحان کنید'},429);
    const body=await readBody(),username=body&&String(body.username||''),password=body&&String(body.password||'');
    if(!['424','626'].includes(username)||!password)return J({error:'نام کاربری یا رمز عبور اشتباه است'},401);
    let raw=await env.DB.get(accountKey(username));
    // ساخت خودکار فضای مشترک در اولین ورود؛ اطلاعات ورود فقط از Secrets کلودفلر خوانده می‌شود.
    if(!await env.DB.get(accountKey('424'))&&!await env.DB.get(accountKey('626'))){
     const p424=env.USER_424_PASSWORD, p626=env.USER_626_PASSWORD;
     if(typeof p424!=='string'||p424.length<3||typeof p626!=='string'||p626.length<3)
      return J({error:'در Cloudflare دو Secret با نام USER_424_PASSWORD و USER_626_PASSWORD تعریف کنید.'},503);
     const id=rnd(8),a=rnd(24),b=rnd(24),now=Date.now();
     const doc={ta:await sha(a),tb:await sha(b),tv:'',items:{'names:0':{v:'علیرضا',t:now},'names:1':{v:'صبا',t:now+1}},seen:{a:0,b:0}};
     await env.DB.put('d:'+id,JSON.stringify(doc));
     for(const [un,pw,role,name,token] of [['424',p424,'a','علیرضا',a],['626',p626,'b','صبا',b]]){
      const salt=rnd(16),ph=await hashPassword(pw,salt);
      await env.DB.put(accountKey(un),JSON.stringify({id,salt,ph,createdAt:now,username:un,name,role,docToken:token}));
     }
     raw=await env.DB.get(accountKey(username));
    }
    if(!raw)return J({error:'حساب کاربری پیدا نشد؛ Secrets کلودفلر را بررسی کنید.'},503);
    const rec=JSON.parse(raw);
    let valid=await verifyPassword(password,rec);
    // Migration for accounts hashed by the older Worker (210000 PBKDF2 rounds).
    // Since this runtime caps PBKDF2 at 100000, verify against the Cloudflare Secret
    // and re-hash with the supported setting. Preserve doc ID, role, and shared tokens.
    const configuredPassword=username==='424'?env.USER_424_PASSWORD:env.USER_626_PASSWORD;
    if(!valid && typeof configuredPassword==='string' && password===configuredPassword){
      const salt=rnd(16), ph=await hashPassword(password,salt);
      rec.salt=salt; rec.ph=ph;
      await env.DB.put(accountKey(username),JSON.stringify(rec));
      valid=true;
    }
    if(!valid)return J({error:'نام کاربری یا رمز عبور اشتباه است'},401);
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
    const id=rnd(8),a=rnd(24),b=rnd(24);
    await env.DB.put('d:'+id,JSON.stringify({ta:await sha(a),tb:await sha(b),items:{},seen:{a:0,b:0}}));return J({id,a,b});
   }
   const m=u.pathname.match(/^\/api\/doc\/([a-f0-9]{16})$/);if(!m)return J({ok:true});
   const raw=await env.DB.get('d:'+m[1]);if(!raw)return J({error:'فضای خصوصی پیدا نشد'},404);const doc=JSON.parse(raw),h=await sha(req.headers.get('x-token')||'');const role=await resolveRole(env,m[1],h,doc);
   if(!role)return J({error:'برای دیدن این فضا باید وارد حساب خود شوید'},401);
   if(req.method==='GET')return J({items:doc.items,seen:doc.seen});
   if(req.method!=='PUT')return J({error:'روش نامعتبر'},405);
   const declared=+(req.headers.get('content-length')||0);if(declared>2e6)return J({error:'حجم درخواست زیاد است'},413);const txt=await req.text();if(txt.length>2e6)return J({error:'حجم درخواست زیاد است'},413);let body;try{body=JSON.parse(txt)}catch{return J({error:'JSON نامعتبر است'},400)}
   const inc=body&&body.items;if(!inc||typeof inc!=='object'||Array.isArray(inc))return J({error:'items نامعتبر است'},400);const ks=Object.keys(inc);if(ks.length>300)return J({error:'تعداد تغییرات در یک درخواست زیاد است'},413);const now=Date.now();
   for(const k of ks){const it=inc[k];if(!KEY.test(k)||!it||typeof it.t!=='number'||!isFinite(it.t))return J({error:'کلید یا مقدار نامعتبر'},400);const v=it.v===undefined?null:it.v;if(JSON.stringify(v).length>MAX_ITEM)return J({error:'یکی از موارد بیش از حد بزرگ است'},413);if((k==='s:0'&&role!=='a')||(k==='s:1'&&role!=='b'))return J({error:'این امضا مخصوص طرف دیگر است'},403);const cur=doc.items[k],t=Math.min(it.t,now+36e5);if(!cur||t>cur.t||(t===cur.t&&JSON.stringify(v)>JSON.stringify(cur.v)))doc.items[k]={v,t}}
   if(Object.keys(doc.items).length>MAX_KEYS)return J({error:'سند بیش از حد بزرگ شد'},413);doc.seen[role]=now;const out=JSON.stringify(doc);if(out.length>MAX_DOC)return J({error:'فضای مشترک بیش از حد بزرگ شد'},413);await env.DB.put('d:'+m[1],out);return J({items:doc.items,seen:doc.seen});
  }catch(e){console.error('OurHome Worker error:',e&&e.stack||e);return J({error:'خطای سرور؛ در تنظیمات Worker، اتصال KV با نام DB و متغیرهای محیطی را بررسی کنید.'},500)}
 }
};
async function resolveRole(env,id,hash,doc){
 if(hash===doc.ta)return 'a';if(hash===doc.tb)return 'b';
 const raw=await env.DB.get('s:'+hash);if(!raw)return '';try{const s=JSON.parse(raw);return s.id===id?s.role:''}catch{return ''}
}
