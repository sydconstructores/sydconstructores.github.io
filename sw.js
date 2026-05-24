// SYD Constructores — Service Worker Beta-1.0.3
const CACHE_NAME = 'syd-app-Beta-1.0.3';

const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './assets/icon-solid-192.png'
];

// Instalación: cachear recursos clave
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    // IMPORTANTE: Removemos self.skipWaiting() para que el nuevo SW no tome el control
    self.skipWaiting();
});

// Activación: limpiar caches viejos
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: primero red, si falla usa caché
self.addEventListener('fetch', e => {
    e.respondWith(
        fetch(e.request)
            .then(resp => {
                const clone = resp.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                return resp;
            })
            .catch(() => caches.match(e.request))
    );
});

// Mensajes: Escuchar cuando la UI nos dice que saltemos la espera (botón Actualizar pulsado)
self.addEventListener('message', event => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});



