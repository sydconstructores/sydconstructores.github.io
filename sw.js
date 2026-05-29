// SYD Constructores — Service Worker v1.0.0
const CACHE_NAME = 'syd-app-v1.1.14';

const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './assets/icon-solid-192.png'
];

// Instalación: cachear recursos y activarse de inmediato
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
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

// Fetch: primero red, si falla usa caché (solo GET y recursos HTTP/HTTPS locales)
self.addEventListener('fetch', e => {
    // Solo interceptar peticiones GET
    if (e.request.method !== 'GET') {
        return;
    }

    // Evitar cachear llamadas de otros protocolos (chrome-extension, etc.)
    const url = new URL(e.request.url);
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Ignorar APIs externas dinámicas y Firebase Websockets/REST
    if (url.hostname.includes('firestore.googleapis.com') || 
        url.hostname.includes('generativelanguage.googleapis.com') ||
        url.hostname.includes('api.imgbb.com') ||
        url.pathname.includes('/__/firebase/')) {
        return;
    }

    e.respondWith(
        fetch(e.request)
            .then(resp => {
                // Solo cachear respuestas válidas y exitosas del mismo origen
                if (resp && resp.status === 200 && resp.type === 'basic') {
                    const clone = resp.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                }
                return resp;
            })
            .catch(() => caches.match(e.request))
    );
});


