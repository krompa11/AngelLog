const CACHE='angellog-cloud-v4';
const CORE=['./','./index.html','./manifest.json'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',e=>{
  const u=e.request.url;
  if(u.includes('supabase.co')||u.includes('photon.komoot.io')||u.includes('tile.openstreetmap.org')||u.includes('unpkg.com')||u.includes('jsdelivr.net')) return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
