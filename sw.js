
const resources = [
  'icons/favicon.ico',
  'icons/apple-touch-icon.png',
  'icons/favicon-16x16.png',
  'icons/android-chrome-192x192.png',
  'icons/favicon-32x32.png',
  'icons/android-chrome-512x512.png',
  'index.js',
  'style.css'
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open("sw-cache").then(function (cache) {
      return Promise.all(resources.map((resource) => cache.add(resource)));
    }),
  );
});

self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      return response || fetch(event.request);
    }),
  );
});