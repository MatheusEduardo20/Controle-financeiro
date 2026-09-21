// Service worker simples: guarda os arquivos do app em cache para permitir
// instalação e uso offline. Não guarda nenhum dado financeiro — os dados
// continuam só no localStorage do navegador, o service worker só cacheia
// os arquivos estáticos (html/ícones).
//
// Sempre que o app for atualizado de novo, mude o número da versão abaixo
// (v2 -> v3 -> v4...) para forçar todos os aparelhos a baixarem a versão nova
// em vez de continuar mostrando uma cópia antiga guardada no celular.
const CACHE_NAME = 'financas-app-v9';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './splash-coin.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Para a própria página (navegação/HTML): tenta buscar a versão mais nova
  // na rede primeiro, e só usa a cópia salva em cache se estiver offline.
  // Isso evita o efeito de "abrir e mostrar a tela antiga por um instante"
  // depois de uma atualização.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Para os demais arquivos (ícones, manifesto): usa o cache primeiro (mais
  // rápido) e atualiza silenciosamente em segundo plano.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
