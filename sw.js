// Service Worker para la funcionalidad offline

const CACHE_NAME = 'inventory-app-cache-v1';
// Lista de recursos para cachear. Incluimos las librerías de CDNs.
const urlsToCache = [
  '.',
  'index.html',
  'manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://unpkg.com/html5-qrcode/html5-qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// Evento 'install': se dispara cuando el Service Worker se instala.
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  // Esperamos a que la promesa de caches.open se resuelva.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache abierto, agregando recursos...');
        // Agregamos todos los recursos de la lista a la caché.
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Service Worker: Falló la instalación del cache', error);
      })
  );
});

// Evento 'fetch': se dispara cada vez que la aplicación solicita un recurso (p. ej., una página, un script, una imagen).
self.addEventListener('fetch', event => {
  // Respondemos con una estrategia "Cache First".
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si el recurso se encuentra en la caché, lo devolvemos desde ahí.
        if (response) {
          console.log(`Service Worker: Devolviendo desde caché: ${event.request.url}`);
          return response;
        }

        // Si no está en la caché, lo buscamos en la red.
        console.log(`Service Worker: Buscando en la red: ${event.request.url}`);
        return fetch(event.request).then(
          networkResponse => {
            // Si la respuesta de la red es válida, la clonamos y la guardamos en la caché para futuras peticiones.
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
              return networkResponse;
            }
            
            // Es importante clonar la respuesta. Una respuesta es un stream y solo se puede consumir una vez.
            // Necesitamos una para el navegador y otra para la caché.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        );
      })
      .catch(error => {
        console.error('Service Worker: Error durante el fetch', error);
        // Opcional: Podrías devolver una página de "offline" personalizada aquí.
      })
  );
});

// Evento 'activate': se dispara cuando el Service Worker se activa.
// Se usa para limpiar cachés antiguas.
self.addEventListener('activate', event => {
  console.log('Service Worker: Activando...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log(`Service Worker: Limpiando caché antigua: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});