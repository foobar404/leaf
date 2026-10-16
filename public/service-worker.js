const CACHE_NAME = 'leaf-pwa-v3'
const APP_BASE_URL = new URL('./', self.location.href)
const APP_SHELL = ['manifest.webmanifest', 'logo.svg'].map((path) => new URL(path, APP_BASE_URL).href)

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    const indexResponse = await fetch(APP_BASE_URL.href)
    if (!indexResponse.ok) throw new Error('Could not precache the app shell.')
    const html = await indexResponse.clone().text()
    await cache.put(APP_BASE_URL.href, indexResponse)
    const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
      .map((match) => new URL(match[1], APP_BASE_URL))
      .filter((url) => url.origin === self.location.origin && url.pathname.startsWith(APP_BASE_URL.pathname) && /\.(?:js|css)$/.test(url.pathname))
      .map((url) => url.href)
    await cache.addAll([...APP_SHELL, ...assets])
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames
      .filter((name) => name.startsWith('leaf-pwa-') && name !== CACHE_NAME)
      .map((name) => caches.delete(name)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  event.respondWith((async () => {
    try {
      const response = await fetch(request)
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(request, response.clone())
      }
      return response
    } catch (error) {
      const cached = await caches.match(request)
      if (cached) return cached
      if (request.mode === 'navigate') {
        const appShell = await caches.match(APP_BASE_URL.href)
        if (appShell) return appShell
      }
      throw error
    }
  })())
})
