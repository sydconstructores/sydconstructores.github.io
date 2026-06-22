importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey:            "AIzaSyBT6HgmdI2PQAKu7dlGzvNVFLSQnhNqLLc",
    authDomain:        "syd-constructores.firebaseapp.com",
    projectId:         "syd-constructores",
    storageBucket:     "syd-constructores.firebasestorage.app",
    messagingSenderId: "496488157373",
    appId:             "1:496488157373:web:d2d13880031b05547c67d4"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Mensaje recibido en background: ', payload);
  const notificationTitle = payload.notification.title || 'Nueva Notificación de SYD';
  const notificationOptions = {
    body: payload.notification.body || 'Entra a la aplicación para ver los detalles.',
    icon: './assets/icon-solid-192.png',
    badge: './assets/icon-solid-192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// SYD Constructores — Service Worker v1.1.21
const CACHE_NAME = 'syd-app-v1.1.21';

const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './assets/icon-solid-192.png'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    // IMPORTANTE: NO usamos self.skipWaiting() aquí. El usuario debe decidir actualizar.
});

// Recibir mensaje para saltar la espera (cuando el usuario hace clic en "Actualizar")
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => {
            // Notificar a todas las pestañas que hay una nueva versión activa
            self.clients.matchAll({ type: 'window' }).then(clients => {
                clients.forEach(client => {
                    client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
                });
            });
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    const url = new URL(e.request.url);
    if (!url.protocol.startsWith('http')) return;
    
    if (url.hostname.includes('firestore.googleapis.com') || 
        url.hostname.includes('generativelanguage.googleapis.com') ||
        url.hostname.includes('api.imgbb.com') ||
        url.pathname.includes('/__/firebase/')) return;

    e.respondWith(
        fetch(e.request)
            .then(resp => {
                if (resp && resp.status === 200 && resp.type === 'basic') {
                    const clone = resp.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                }
                return resp;
            })
            .catch(() => caches.match(e.request))
    );
});
