/* Cloudflare Worker: خانه‌ی ما — حساب کاربری + همگام‌سازی امن
 * Bindings: KV namespace DB
 * Variables/Secrets: ORIGIN=<exact site origin>; USER_424_PASSWORD; USER_626_PASSWORD;
 * VAPID_PUBLIC_KEY; VAPID_PRIVATE_KEY (Secret); VAPID_SUBJECT
 */
const MAX_ITEM=300000, MAX_DOC=4500000, MAX_KEYS=5000;
const KEY=/^[a-z]{1,12}(:[A-Za-z0-9_-]{1,40}){1,3}$/;
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const rnd=n=>hex(crypto.getRandomValues(new Uint8Array(n)));
const enc=s=>new TextEncoder().encode(s);
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc(s)));
async function hashPassword(password,salt){const key=await crypto.subtle.importKey('raw',enc(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc(salt),iterations:100000,hash:'SHA-256'},key,256);return hex(bits)}
async function verifyPassword(password,rec){try{return (await hashPassword(password,rec.salt))===rec.ph}catch{return false}}

const b64uBytes=s=>{s=String(s||'').replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return Uint8Array.from(atob(s),c=>c.charCodeAt(0))};
const b64u=b=>{let s='';for(const c of new Uint8Array(b))s+=String.fromCharCode(c);return btoa(s).replace(/=/g,'').replace(/[+]/g,'-').replace(/[/]/g,'_')};
const concat=(...parts)=>{const n=parts.reduce((a,p)=>a+p.length,0),out=new Uint8Array(n);let i=0;for(const p of parts){out.set(p,i);i+=p.length}return out};
async function hkdf(ikm,salt,info,length){const k=await crypto.subtle.importKey('raw',ikm,'HKDF',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info:typeof info==='string'?enc(info):info},k,length*8))}
function pushSubKey(id,role){return 'push:'+id+':'+role}
async function vapidAuth(endpoint,env){
 const pub=b64uBytes(env.VAPID_PUBLIC_KEY),d=b64uBytes(env.VAPID_PRIVATE_KEY);
 if(pub.length!==65||pub[0]!==4||d.length!==32)throw new Error('VAPID keys must be base64url encoded P-256 public (65-byte uncompressed) and private (32-byte) keys');
 const jwk={kty:'EC',crv:'P-256',x:b64u(pub.slice(1,33)),y:b64u(pub.slice(33,65)),d:b64u(d),ext:true,key_ops:['sign']};
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const aud=new URL(endpoint).origin,exp=Math.floor(Date.now()/1000)+12*60*60,sub=env.VAPID_SUBJECT||'mailto:admin@example.com';
 const head=b64u(enc(JSON.stringify({typ:'JWT',alg:'ES256'}))),body=b64u(enc(JSON.stringify({aud:aud,exp:exp,sub:sub}))),unsigned=head+'.'+body;
 const sig=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,enc(unsigned));
 return 'vapid t='+unsigned+'.'+b64u(sig)+', k='+env.VAPID_PUBLIC_KEY;
}
async function encryptPush(sub,payload){
 const clientPub=b64uBytes(sub.keys.p256dh),auth=b64uBytes(sub.keys.auth);
 if(clientPub.length!==65||auth.length!==16)throw new Error('Invalid Web Push subscription keys');
 const server=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 const serverPub=new Uint8Array(await crypto.subtle.exportKey('raw',server.publicKey));
 const clientKey=await crypto.subtle.importKey('raw',clientPub,{name:'ECDH',namedCurve:'P-256'},false,[]);
 const shared=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:clientKey},server.privateKey,256));
 const info=concat(enc('WebPush: info\0'),clientPub,serverPub);
 const ikm=await hkdf(shared,auth,info,32);
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const cek=await hkdf(ikm,salt,'Content-Encoding: aes128gcm\0',16);
 const nonce=await hkdf(ikm,salt,'Content-Encoding: nonce\0',12);
 const plain=concat(enc(JSON.stringify(payload)),new Uint8Array([2]));
 const aes=await crypto.subtle.importKey('raw',cek,{name:'AES-GCM'},false,['encrypt']);
 const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce,tagLength:128},aes,plain));
 const rs=new Uint8Array([0,0,16,0]),body=concat(salt,rs,new Uint8Array([serverPub.length]),serverPub,cipher);
 return body;
}
async function sendWebPush(sub,payload,env){
 const endpoint=new URL(sub.endpoint);if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password)throw new Error('Invalid push endpoint');
 const body=await encryptPush(sub,payload),authorization=await vapidAuth(sub.endpoint,env);
 return fetch(sub.endpoint,{method:'POST',redirect:'manual',headers:{'authorization':authorization,'content-encoding':'aes128gcm','content-type':'application/octet-stream','ttl':'60','urgency':'high'},body:body});
}
function accountKey(username){return 'u:'+username}
export default {
 async fetch(req,env){
  const origin=req.headers.get('Origin')||'';
  const cors={'access-control-allow-origin':env.ORIGIN||origin||'null','access-control-allow-headers':'content-type,x-token','access-control-allow-methods':'GET,PUT,POST,DELETE,OPTIONS','access-control-max-age':'86400','vary':'Origin'};
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


   if(req.method==='GET'&&u.pathname==='/api/push/public-key'){
    if(!env.VAPID_PUBLIC_KEY)return J({error:'اعلان Push هنوز در Worker پیکربندی نشده است'},503);
    return J({publicKey:env.VAPID_PUBLIC_KEY});
   }
   if((req.method==='POST'||req.method==='DELETE')&&u.pathname==='/api/push/subscribe'){
    const token=req.headers.get('x-token')||'';if(!token)return J({error:'ابتدا وارد حساب شوید'},401);
    const sessionRaw=await env.DB.get('s:'+await sha(token));if(!sessionRaw)return J({error:'نشست معتبر نیست؛ دوباره وارد شوید'},401);
    const session=JSON.parse(sessionRaw),key=pushSubKey(session.id,session.role);
    const body=await readBody();
    let subs=[];try{subs=JSON.parse(await env.DB.get(key)||'[]')}catch{subs=[]}
    if(!Array.isArray(subs))subs=[];
    if(req.method==='DELETE'){
     const endpoint=body&&String(body.endpoint||'');subs=subs.filter(s=>s&&s.endpoint!==endpoint);await env.DB.put(key,JSON.stringify(subs),{expirationTtl:31536000});return J({ok:true,subscriptions:subs.length});
    }
    const sub=body&&body.subscription;
    if(!sub||typeof sub.endpoint!=='string'||sub.endpoint.length>2048||!/^https:\/\//i.test(sub.endpoint)||!sub.keys||typeof sub.keys.p256dh!=='string'||typeof sub.keys.auth!=='string')return J({error:'اشتراک اعلان نامعتبر است'},400);
    if(!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY||!env.VAPID_SUBJECT)return J({error:'کلیدهای VAPID و VAPID_SUBJECT در تنظیمات Worker کامل نیستند'},503);
    try{if(b64uBytes(sub.keys.p256dh).length!==65||b64uBytes(sub.keys.auth).length!==16)return J({error:'کلیدهای اشتراک اعلان نامعتبرند'},400)}catch{return J({error:'کلیدهای اشتراک اعلان نامعتبرند'},400)}
    subs=subs.filter(s=>s&&s.endpoint!==sub.endpoint);subs.push({endpoint:sub.endpoint,keys:{p256dh:sub.keys.p256dh,auth:sub.keys.auth},createdAt:Date.now()});subs=subs.slice(-5);
    await env.DB.put(key,JSON.stringify(subs),{expirationTtl:31536000});return J({ok:true,subscriptions:subs.length});
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
   const pushEvents=[];
   for(const k of ks){const it=inc[k];if(!KEY.test(k))return J({error:'کلید نامعتبر است: '+k.slice(0,100)},400);if(!it||typeof it!=='object'||typeof it.t!=='number'||!isFinite(it.t))return J({error:'زمان ثبت یکی از موارد نامعتبر است'},400);const v=it.v===undefined?null:it.v;if(JSON.stringify(v).length>MAX_ITEM)return J({error:'یکی از موارد بیش از حد بزرگ است'},413);if((k==='s:0'&&role!=='a')||(k==='s:1'&&role!=='b'))return J({error:'این امضا مخصوص طرف دیگر است'},403);const cur=doc.items[k],t=Math.min(it.t,now+36e5);if(!cur||t>cur.t||(t===cur.t&&JSON.stringify(v)>JSON.stringify(cur.v))){doc.items[k]={v,t};if(k.indexOf('affection:')===0&&v&&typeof v==='object'&&v.from===role&&typeof v.text==='string'&&t>now-120000&&t<=now+60000)pushEvents.push({text:v.text.slice(0,140),kind:String(v.kind||'love').slice(0,24),key:k})}}
   if(Object.keys(doc.items).length>MAX_KEYS)return J({error:'سند بیش از حد بزرگ شد'},413);doc.seen[role]=now;const out=JSON.stringify(doc);if(out.length>MAX_DOC)return J({error:'فضای مشترک بیش از حد بزرگ شد'},413);await env.DB.put('d:'+m[1],out);
   if(pushEvents.length&&env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_KEY&&env.VAPID_SUBJECT){
    const targetRole=role==='a'?'b':'a',sk=pushSubKey(m[1],targetRole);let subscriptions=[];try{subscriptions=JSON.parse(await env.DB.get(sk)||'[]')}catch{subscriptions=[]}
    if(Array.isArray(subscriptions)&&subscriptions.length){
     const ev=pushEvents[pushEvents.length-1],payload={title:'یه پیام عاشقانه داری 💗',body:ev.text,url:'/timeline.html',tag:'affection-'+ev.key.slice(-24)};
     const outcomes=await Promise.all(subscriptions.map(async sub=>{try{const res=await sendWebPush(sub,payload,env);if(res.status===404||res.status===410)return {endpoint:sub.endpoint,remove:true};if(!res.ok)console.error('Web Push provider returned',res.status);return {endpoint:sub.endpoint,remove:false}}catch(e){console.error('Web Push send failed:',String(e));return {endpoint:sub.endpoint,remove:false}}}));
     const stale=outcomes.filter(x=>x.remove).map(x=>x.endpoint);if(stale.length){subscriptions=subscriptions.filter(x=>!stale.includes(x.endpoint));await env.DB.put(sk,JSON.stringify(subscriptions),{expirationTtl:31536000})}
    }
   }
   return J({items:doc.items,seen:doc.seen});
  }catch(e){console.error('OurHome Worker error:',e&&e.stack||e);return J({error:'خطای سرور؛ در تنظیمات Worker، اتصال KV با نام DB و متغیرهای محیطی را بررسی کنید.'},500)}
 }
};
async function resolveRole(env,id,hash,doc){
 if(hash===doc.ta)return 'a';if(hash===doc.tb)return 'b';
 const raw=await env.DB.get('s:'+hash);if(!raw)return '';try{const s=JSON.parse(raw);return s.id===id?s.role:''}catch{return ''}
}
