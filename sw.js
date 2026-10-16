var C='our-home-v24',A=['index.html','album.html','draw.html','challenges.html','achievements.html','story.html','letters.html','wishes.html','calendar.html','qa.html','pledge.html','chat.html','games.html','map.html','settings.html','style.css','app.js','auth.js','auth-lock.css','config.js','v2-enhance.js','v2-enhance.css','icon.svg','manifest.webmanifest'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(C).then(function(c){return c.addAll(A)}));self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==C}).map(function(x){return caches.delete(x)}))}));self.clients.claim()});
self.addEventListener('fetch',function(e){
  var r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith(fetch(r).then(function(x){if(x&&x.ok){var c=x.clone();caches.open(C).then(function(h){h.put(r,c)})}return x}).catch(function(){return caches.match(r).then(function(m){if(m)return m;if(r.mode==='navigate')return caches.match('index.html');return new Response('این فایل در حالت آفلاین در دسترس نیست.',{status:503,headers:{'content-type':'text/plain;charset=utf-8'}})})}));
});
