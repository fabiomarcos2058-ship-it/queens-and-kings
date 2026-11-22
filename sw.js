// Service worker do Queens and Kings: deixa instalar o jogo e abrir mesmo sem internet.
// - Código (html/js/css/json): sempre tenta a rede primeiro (assim as atualizações chegam na hora) e guarda uma cópia pro modo offline.
// - Imagens, sons e artes: mostra a cópia guardada na hora e atualiza em segundo plano.
// - versao.txt e tudo que não é do jogo (Firebase, fontes): passa direto, sem cache.
const CODIGO = 'qk-codigo-v1';
const MIDIA = 'qk-midia-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CODIGO).then((c) => c.addAll(['./index.html', './manifest.webmanifest']).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => ![CODIGO, MIDIA].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

async function redePrimeiro(req) {
  try {
    const r = await fetch(req);
    if (r && r.ok) { const c = await caches.open(CODIGO); c.put(req, r.clone()); }
    return r;
  } catch (err) {
    const c = await caches.open(CODIGO);
    return (await c.match(req)) || (req.mode === 'navigate' ? await c.match('./index.html') : null) || Response.error();
  }
}
async function cacheEAtualiza(req) {
  const c = await caches.open(MIDIA);
  const guardado = await c.match(req);
  const rede = fetch(req).then((r) => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
  return guardado || (await rede) || Response.error();
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/versao.txt') || url.pathname.endsWith('/sw.js')) return;
  if (req.headers.has('range')) return; // áudio/vídeo em pedaços: deixa o navegador resolver
  if (/\.(png|jpe?g|webp|gif|svg|mp3|ogg|wav|m4a|woff2?)$/i.test(url.pathname)) { e.respondWith(cacheEAtualiza(req)); return; }
  e.respondWith(redePrimeiro(req));
});
