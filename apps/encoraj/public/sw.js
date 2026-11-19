/*
 * Service worker mínimo do Encoraj — escrito à mão, sem build.
 *
 * Faz só duas coisas:
 *   1. mostra /offline.html quando uma navegação falha por falta de rede;
 *   2. apaga os caches deixados pelo service worker antigo (next-pwa/workbox).
 *
 * NÃO guarda página, dado ou imagem de usuário logado: o aparelho da portaria é
 * compartilhado, e nada de um morador pode sobrar no dispositivo depois do logout.
 * Mudou este arquivo? Troque o número da versão para os aparelhos atualizarem.
 */
const VERSION = 'encoraj-sw-v1'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      // tudo que não é o cache desta versão sai — inclui os caches do workbox antigo
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  // Só navegação de página. Todo o resto (API, imagens, JS) vai direto para a rede.
  if (event.request.mode !== 'navigate') return

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE_URL).then((offline) => offline ?? Response.error()),
    ),
  )
})
