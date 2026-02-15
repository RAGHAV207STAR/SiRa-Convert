const SW_VERSION = "v9";
const STATIC_CACHE = `sira-static-${SW_VERSION}`;
const RUNTIME_CACHE = `sira-runtime-${SW_VERSION}`;
const MAX_RUNTIME_ENTRIES = 120;

const APP_SHELL = [
    "/",
    "/index.html",
    "/jpg-to-pdf.html",
    "/pdf-to-jpg.html",
    "/merge-pdf.html",
    "/about.html",
    "/privacy.html",
    "/terms.html",
    "/blog.html",
    "/style.css",
    "/shared-ui.js",
    "/index.js",
    "/jpg-to-pdf.js",
    "/merge-pdf.js",
    "/pdf-to-jpg.js",
    "/gtag-init.js",
    "/structured-data.js",
    "/simple-sw-register.js",
    "/logo.png",
    "/manifest.json"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames.map((name) => {
                if (name !== STATIC_CACHE && name !== RUNTIME_CACHE) {
                    return caches.delete(name);
                }
                return Promise.resolve();
            })
        );
        if ("navigationPreload" in self.registration) {
            await self.registration.navigationPreload.enable();
        }
        await self.clients.claim();
    })());
});

self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    const requestUrl = new URL(event.request.url);
    const isSameOrigin = requestUrl.origin === self.location.origin;
    const isApi =
        requestUrl.hostname.includes("googleapis.com") ||
        requestUrl.hostname.includes("firebase");

    if (isApi) return;

    if (event.request.mode === "navigate") {
        event.respondWith(networkFirstNavigation(event));
        return;
    }

    if (isSameOrigin && isStaticAsset(requestUrl.pathname)) {
        event.respondWith(staleWhileRevalidate(event.request));
        return;
    }

    event.respondWith(cacheFirst(event.request));
});

async function networkFirstNavigation(event) {
    const preloadResponse = await event.preloadResponse;
    if (preloadResponse) {
        putInRuntimeCache(event.request, preloadResponse.clone());
        return preloadResponse;
    }

    try {
        const response = await fetch(event.request);
        putInRuntimeCache(event.request, response.clone());
        return response;
    } catch (error) {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return (await caches.match("/index.html")) || new Response("Offline", { status: 503 });
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);

    const networkPromise = fetch(request)
        .then((response) => {
            if (response && response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => null);

    return cached || networkPromise || new Response("", { status: 504 });
}

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response && response.ok) {
        await putInRuntimeCache(request, response.clone());
    }
    return response;
}

function isStaticAsset(pathname) {
    return /\.(?:css|js|mjs|json|png|jpg|jpeg|webp|svg|ico|woff2?|ttf)$/i.test(pathname);
}

async function putInRuntimeCache(request, response) {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response);
    await trimRuntimeCache(cache);
}

async function trimRuntimeCache(cache) {
    const keys = await cache.keys();
    if (keys.length <= MAX_RUNTIME_ENTRIES) return;
    const excess = keys.length - MAX_RUNTIME_ENTRIES;
    await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
}
