const PWA_RESET_VERSION = "2026-04-23-frontend-refresh-3";
const PWA_RESET_KEY = `become-pwa-reset:${PWA_RESET_VERSION}`;
const PWA_SCRIPT_VERSION = "2026-04-23-frontend-refresh-3";

export const getPwaScriptUrl = () => `/sw.js?v=${PWA_SCRIPT_VERSION}`;

export const isPreviewHost = () => {
  if (typeof window === "undefined") return false;

  return (
    window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com")
  );
};

export const clearPwaRuntime = async () => {
  if (typeof window === "undefined") return;

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ("caches" in window) {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
  }
}
;

export const maybeForcePublishedPwaRefresh = async () => {
  if (typeof window === "undefined" || isPreviewHost()) return;
  if (!("serviceWorker" in navigator)) return;
  if (localStorage.getItem(PWA_RESET_KEY) === "done") return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  const cacheKeys = "caches" in window ? await caches.keys() : [];

  if (registrations.length === 0 && cacheKeys.length === 0) {
    localStorage.setItem(PWA_RESET_KEY, "done");
    return;
  }

  await clearPwaRuntime();
  localStorage.setItem(PWA_RESET_KEY, "done");

  if (!sessionStorage.getItem(PWA_RESET_KEY)) {
    sessionStorage.setItem(PWA_RESET_KEY, "reloading");
    const url = new URL(window.location.href);
    url.searchParams.set("_r", Date.now().toString());
    window.location.replace(url.toString());
  }
};

export const registerPublishedServiceWorker = async () => {
  if (typeof window === "undefined" || isPreviewHost()) return null;
  if (!("serviceWorker" in navigator)) return null;

  const registration = await navigator.serviceWorker.register(getPwaScriptUrl(), {
    scope: "/",
  });

  await registration.update().catch(() => null);
  return registration;
};

export const forceRefreshToLatest = async (waitingWorker?: ServiceWorker | null) => {
  if (waitingWorker) {
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.update().catch(() => null)));
  }

  await clearPwaRuntime();
  localStorage.setItem(PWA_RESET_KEY, "done");

  const url = new URL(window.location.href);
  url.searchParams.set("_r", Date.now().toString());
  window.location.replace(url.toString());
};