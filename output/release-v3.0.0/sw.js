/*
 * sw.js — Service Worker: guarda os arquivos do app para funcionar OFFLINE.
 * AJUSTAR: sempre que mudar algum arquivo, aumente a VERSAO para o celular baixar a nova.
 */
const PREFIXO = 'cifradog:' + self.registration.scope + ':';
const VERSAO = PREFIXO + '3.1.0';
const ARQUIVOS = [
    './', './index.html', './manifest.json', './css/app.css', './css/taverna.css', './css/estudio.css', './css/show.css',
    './js/cifra-motor.js', './js/db.js', './js/exemplos.js', './js/lista-video.js', './js/rolagem-bpm.js', './js/programada.js', './js/controle.js',
    './js/ui.js', './js/telas.js', './js/app.js',
    './js/sala.js', './js/show-programado.js',
    './js/drive-backup.js',
    './img/taverna/pub-background.webp', './img/taverna/covers-atlas.webp', './img/taverna/materials-atlas.webp',
    './img/taverna/pub-mobile.webp',
    './js/catalogo.js', './js/aprender.js', './js/pitch-worklet.js',
    './img/brand/logo-pub.webp', './img/brand/dog-pub.webp', './img/brand/genres-atlas.webp',
    './img/brand/icon-180.png', './img/brand/icon-192.png', './img/brand/icon-512.png',
];
const CAMINHOS = new Set(ARQUIVOS.map(a => new URL(a, self.registration.scope).pathname));

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then(nomes => Promise.all(nomes.filter(n => n.startsWith(PREFIXO) && n !== VERSAO).map(n => caches.delete(n))))
            .then(() => self.clients.claim())
    );
});

/* Só gerencia os arquivos do app. YouTube e outros sites seguem direto pela rede. */
self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    const url = new URL(e.request.url);
    if (url.origin !== self.location.origin || !CAMINHOS.has(url.pathname)) return;
    e.respondWith(caches.open(VERSAO).then(async cache => {
        const salvo = await cache.match(e.request, { ignoreSearch: true });
        if (salvo) return salvo;
        const resposta = await fetch(e.request);
        if (resposta.ok) {
            url.search = '';
            await cache.put(url.href, resposta.clone());
        }
        return resposta;
    }));
});
