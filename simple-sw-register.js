if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    let hasRefreshed = false;

    function promptForUpdate(worker) {
      if (!worker) return;

      const message = "A new version is available! Would you like to update now?";

      if (typeof window.showToast === "function") {
        window.showToast(message, "info");
      }

      const shouldUpdate = window.confirm(message);
      if (!shouldUpdate) return;

      worker.postMessage({ type: "SKIP_WAITING" });
      if (!hasRefreshed) {
        hasRefreshed = true;
        window.location.reload();
      }
    }

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hasRefreshed) return;
      hasRefreshed = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          promptForUpdate(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state !== "installed") return;
            if (!navigator.serviceWorker.controller) return;
            promptForUpdate(newWorker);
          });
        });
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  });
}
