/* Cloudflare Worker: API همگام‌سازی «خانه‌ی ما» و تعهدنامه
   لازم: یک KV Namespace با نام Binding برابر DB
   اختیاری: متغیر ORIGIN (مثلاً https://example.com) برای محدود کردن دامنه */
const MAX_ITEM = 300000, MAX_DOC = 4500000, MAX_KEYS = 5000;
const KEY = /^[a-z]{1,12}(:[A-Za-z0-9_-]{1,40}){1,2}$/;
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const rnd = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const sha = async s => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'access-control-allow-origin': env.ORIGIN || origin || 'null',
      'access-control-allow-headers': 'content-type,x-token',
      'access-control-allow-methods': 'GET,PUT,POST,OPTIONS',
      'access-control-max-age': '86400',
      'vary': 'Origin'
    };
    const J = (x, s = 200) => new Response(JSON.stringify(x), {
      status: s, headers: { ...cors, 'content-type': 'application/json;charset=utf-8', 'cache-control': 'no-store' }
    });
    if (!env.ORIGIN) return J({ error: 'برای امنیت، متغیر ORIGIN باید در تنظیمات Worker تعریف شود' }, 503);
    if (req.method === 'OPTIONS') {
      if (origin !== env.ORIGIN) return J({ error: 'دامنه مجاز نیست' }, 403);
      return new Response(null, { status: 204, headers: cors });
    }
    try {
      if (origin !== env.ORIGIN) return J({ error: 'دامنه مجاز نیست' }, 403);
      const u = new URL(req.url);

      if (req.method === 'POST' && u.pathname === '/api/create') {
        const ip = req.headers.get('CF-Connecting-IP') || 'x';
        const rk = 'rl:' + ip + ':' + Math.floor(Date.now() / 36e5);
        const n = +(await env.DB.get(rk) || 0);
        if (n >= 10) return J({ error: 'درخواست زیاد است؛ یک ساعت دیگر تلاش کنید' }, 429);
        await env.DB.put(rk, String(n + 1), { expirationTtl: 3700 });
        const id = rnd(8), a = rnd(24), b = rnd(24), v = rnd(24);
        await env.DB.put('d:' + id, JSON.stringify({ ta: await sha(a), tb: await sha(b), tv: await sha(v), items: {}, seen: { a: 0, b: 0 } }));
        return J({ id, a, b, v });
      }

      const vm = u.pathname.match(/^\/api\/view-token\/([a-f0-9]{16})$/);
      if (req.method === 'POST' && vm) {
        const rawDoc = await env.DB.get('d:' + vm[1]);
        if (!rawDoc) return J({ error: 'فضای مشترک پیدا نشد' }, 404);
        const vd = JSON.parse(rawDoc), tokenHash = await sha(req.headers.get('x-token') || '');
        if (tokenHash !== vd.ta && tokenHash !== vd.tb) return J({ error: 'فقط اعضای فضای مشترک می‌توانند لینک مشاهده بسازند' }, 401);
        const v = rnd(24); vd.tv = await sha(v);
        await env.DB.put('d:' + vm[1], JSON.stringify(vd));
        return J({ v });
      }

      const m = u.pathname.match(/^\/api\/doc\/([a-f0-9]{16})$/);
      if (!m) return J({ ok: true });
      const raw = await env.DB.get('d:' + m[1]);
      if (!raw) return J({ error: 'سند پیدا نشد' }, 404);
      const doc = JSON.parse(raw);
      const h = await sha(req.headers.get('x-token') || '');
      const role = h === doc.ta ? 'a' : h === doc.tb ? 'b' : h === doc.tv ? 'v' : '';
      if (!role) return J({ error: 'دسترسی مجاز نیست' }, 401);
      if (req.method === 'GET') return J({ items: doc.items, seen: doc.seen });
      if (role === 'v') return J({ error: 'این لینک فقط اجازه مشاهده دارد' }, 403);
      if (req.method !== 'PUT') return J({ error: 'روش نامعتبر' }, 405);

      const declared = +(req.headers.get('content-length') || 0);
      if (declared > 2e6) return J({ error: 'حجم درخواست زیاد است' }, 413);
      const txt = await req.text();
      if (txt.length > 2e6) return J({ error: 'حجم درخواست زیاد است' }, 413);
      let body; try { body = JSON.parse(txt) } catch { return J({ error: 'JSON نامعتبر' }, 400) }
      const inc = body && body.items;
      if (!inc || typeof inc !== 'object' || Array.isArray(inc)) return J({ error: 'items نامعتبر' }, 400);
      const ks = Object.keys(inc);
      if (ks.length > 300) return J({ error: 'تعداد تغییرات در یک درخواست زیاد است' }, 413);
      const now = Date.now();
      for (const k of ks) {
        const it = inc[k];
        if (!KEY.test(k) || !it || typeof it.t !== 'number' || !isFinite(it.t)) return J({ error: 'کلید یا مقدار نامعتبر' }, 400);
        const v = it.v === undefined ? null : it.v;
        if (JSON.stringify(v).length > MAX_ITEM) return J({ error: 'یکی از موارد بیش از حد بزرگ است' }, 413);
        if ((k === 's:0' && role !== 'a') || (k === 's:1' && role !== 'b')) return J({ error: 'این امضا مخصوص طرف دیگر است' }, 403);
        const cur = doc.items[k], t = Math.min(it.t, now + 36e5);
        if (!cur || t > cur.t || (t === cur.t && JSON.stringify(v) > JSON.stringify(cur.v))) doc.items[k] = { v, t };
      }
      if (Object.keys(doc.items).length > MAX_KEYS) return J({ error: 'سند بیش از حد بزرگ شد' }, 413);
      doc.seen[role] = now;
      const out = JSON.stringify(doc);
      if (out.length > MAX_DOC) return J({ error: 'سند بیش از حد بزرگ شد' }, 413);
      await env.DB.put('d:' + m[1], out);
      return J({ items: doc.items, seen: doc.seen });
    } catch (e) {
      return J({ error: 'خطای سرور' }, 500);
    }
  }
};
