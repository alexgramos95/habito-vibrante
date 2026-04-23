const BUILD_VERSION = (typeof __APP_BUILD_ID__ !== "undefined" ? __APP_BUILD_ID__ : "dev-build");
const PWA_RESET_VERSION = `frontend-refresh-${BUILD_VERSION}`;
const PWA_RESET_KEY = `become-pwa-reset:${PWA_RESET_VERSION}`;
const PWA_SCRIPT_VERSION = BUILD_VERSION;

const CURRENT_SW_MARKER = `v=${PWA_SCRIPT_VERSION}`;

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

const hasCurrentScriptVersion = (registration: ServiceWorkerRegistration) => {
  return [registration.active, registration.waiting, registration.installing].some(
    (worker) => worker?.scriptURL?.includes(CURRENT_SW_MARKER),
  );
};

export const maybeForcePublishedPwaRefresh = async (): Promise<boolean> => {
  if (typeof window === "undefined" || isPreviewHost()) return false;
  if (!("serviceWorker" in navigator)) return false;

  const registrations = await navigator.serviceWorker.getRegistrations();
  const cacheKeys = "caches" in window ? await caches.keys() : [];
  const hasStaleRegistration = registrations.some(
    (registration) => !hasCurrentScriptVersion(registration),
  );

  if (registrations.length === 0 && cacheKeys.length === 0) {
    localStorage.setItem(PWA_RESET_KEY, "done");
    return false;
  }

  if (localStorage.getItem(PWA_RESET_KEY) === "done" && !hasStaleRegistration) {
    return false;
  }

  await clearPwaRuntime();
  localStorage.setItem(PWA_RESET_KEY, "done");

  if (!sessionStorage.getItem(PWA_RESET_KEY)) {
    sessionStorage.setItem(PWA_RESET_KEY, "reloading");
    const url = new URL(window.location.href);
    url.searchParams.set("_r", Date.now().toString());
    window.location.replace(url.toString());
    return true;
  }

  return true;
};

export const registerPublishedServiceWorker = async () => {
  if (typeof window === "undefined" || isPreviewHost()) return null;
  if (!("serviceWorker" in navigator)) return null;

  const registration = await navigator.serviceWorker.register(getPwaScriptUrl(), {
    scope: "/",
    updateViaCache: "none",
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