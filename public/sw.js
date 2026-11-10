// 오프라인 캐시: 화면 파일만 캐시하고 /api 는 절대 캐시하지 않는다.
const C = "simhak-pos-v2";
const FILES = ["./", "index.html", "manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(C).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.startsWith("/api/")) return; // 네트워크 그대로

  // 화면 파일: 온라인이면 최신본을 받아 캐시 갱신, 오프라인이면 캐시 사용
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) { const copy = r.clone(); caches.open(C).then((c) => c.put(e.request, copy)); }
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("index.html")))
  );
});
