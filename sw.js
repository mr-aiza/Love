var C='our-home-v3',A=['index.html','story.html','letters.html','wishes.html','calendar.html','qa.html','pledge.html','style.css','app.js','config.js','icon.svg','manifest.webmanifest'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(C).then(function(c){return c.addAll(A)}));self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==C}).map(function(x){return caches.delete(x)}))}));self.clients.claim()});
self.addEventListener('fetch',function(e){
  var r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith(fetch(r).then(function(x){var c=x.clone();caches.open(C).then(function(h){h.put(r,c)});return x}).catch(function(){return caches.match(r).then(function(m){return m||caches.match('index.html')})}));
});
