import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost = window.location.hostname.includes("id-preview--") || window.location.hostname.includes("lovableproject.com");
const shouldDisableServiceWorker = isInIframe || isPreviewHost;

if (shouldDisableServiceWorker && "serviceWorker" in navigator) {
  const originalRegister = navigator.serviceWorker.register.bind(navigator.serviceWorker);

  navigator.serviceWorker.register = (() => Promise.reject(new Error("Service worker disabled in preview"))) as typeof originalRegister;

  navigator.serviceWorker.getRegistrations().then(async (registrations) => {
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
    }

    if (navigator.serviceWorker.controller && !sessionStorage.getItem("become-preview-sw-reset")) {
      sessionStorage.setItem("become-preview-sw-reset", "1");
      window.location.reload();
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
