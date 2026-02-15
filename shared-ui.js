(function () {
  "use strict";

  function safeGet(storage, key) {
    try {
      return storage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeSet(storage, key, value) {
    try {
      storage.setItem(key, value);
    } catch (error) {
      // Ignore storage failures (private mode/quota).
    }
  }

  function initTheme(options) {
    var opts = options || {};
    var themeKey = opts.storageKey || "sira-theme";
    var defaultTheme = opts.defaultTheme || "light";
    var button = document.getElementById(opts.buttonId || "themeToggleBtn");
    var root = document.documentElement;

    function setIcon(theme) {
      if (!button) return;
      button.textContent = theme === "dark" ? "🌙" : "⭐";
    }

    function applyTheme(theme) {
      var normalized = theme === "dark" ? "dark" : "light";
      root.setAttribute("data-theme", normalized);
      safeSet(localStorage, themeKey, normalized);
      setIcon(normalized);
      return normalized;
    }

    window.toggleThemeIcon = function () {
      var current = root.getAttribute("data-theme") || defaultTheme;
      return applyTheme(current === "dark" ? "light" : "dark");
    };

    if (button && !button.dataset.boundThemeToggle) {
      button.addEventListener("click", function () {
        window.toggleThemeIcon();
      });
      button.dataset.boundThemeToggle = "true";
    }

    var stored = safeGet(localStorage, themeKey) || defaultTheme;
    applyTheme(stored);
    return { applyTheme: applyTheme };
  }

  function initUserMenu(options) {
    var opts = options || {};
    var menu = document.getElementById(opts.menuId || "userMenu");
    var navSelector = opts.navSelector || ".nav-right";
    var onProfileRequest = typeof opts.onProfileRequest === "function" ? opts.onProfileRequest : null;

    window.handleProfileClick = function () {
      if (onProfileRequest) {
        var handled = onProfileRequest();
        if (handled === false) return;
      }
      if (menu) {
        menu.classList.toggle("active");
      }
    };

    var profileButton = document.getElementById(opts.profileButtonId || "profileBox");
    if (profileButton && !profileButton.dataset.boundProfileToggle) {
      profileButton.addEventListener("click", window.handleProfileClick);
      profileButton.dataset.boundProfileToggle = "true";
    }

    document.addEventListener("click", function (event) {
      if (event.target.closest(navSelector)) return;
      document.querySelectorAll(".settings-menu").forEach(function (panel) {
        panel.classList.remove("active");
      });
    });
  }

  function initPanelToggles(options) {
    var opts = options || {};
    var controlsPanel = document.getElementById(opts.controlsPanelId || "controlsPanel");
    var controlsState = document.getElementById(opts.controlsStateId || "controlsState");
    var previewPanel = document.getElementById(opts.previewPanelId || "previewPanel");
    var previewState = document.getElementById(opts.previewStateId || "previewState");
    var secondaryPreviewPanel = document.getElementById(opts.secondaryPreviewPanelId || "");
    var secondaryPreviewState = document.getElementById(opts.secondaryPreviewStateId || "");
    var query = window.matchMedia(opts.mediaQuery || "(max-width: 980px)");

    if (!controlsPanel || !controlsState || !previewPanel || !previewState) return;

    function syncLabels() {
      controlsState.textContent = controlsPanel.open ? "Open" : "Closed";
      previewState.textContent = previewPanel.open ? "Open" : "Closed";
      if (secondaryPreviewPanel && secondaryPreviewState) {
        secondaryPreviewState.textContent = secondaryPreviewPanel.open ? "Open" : "Closed";
      }
    }

    function syncDefaults() {
      controlsPanel.open = false;
      previewPanel.open = !query.matches;
      if (secondaryPreviewPanel) {
        secondaryPreviewPanel.open = !query.matches;
      }
      syncLabels();
    }

    controlsPanel.addEventListener("toggle", syncLabels);
    previewPanel.addEventListener("toggle", syncLabels);
    if (secondaryPreviewPanel) {
      secondaryPreviewPanel.addEventListener("toggle", syncLabels);
    }
    syncDefaults();

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", syncDefaults);
    } else if (typeof query.addListener === "function") {
      query.addListener(syncDefaults);
    }
  }

  function registerServiceWorker(options) {
    var opts = options || {};
    var onUpdateReady = typeof opts.onUpdateReady === "function" ? opts.onUpdateReady : null;
    var onError = typeof opts.onError === "function" ? opts.onError : null;
    var swPath = opts.path || "sw.js";

    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", function () {
      navigator.serviceWorker
        .register(swPath, { updateViaCache: "none" })
        .then(function (registration) {
          if (registration.waiting && onUpdateReady) {
            onUpdateReady();
          }

          registration.addEventListener("updatefound", function () {
            var nextWorker = registration.installing;
            if (!nextWorker) return;

            nextWorker.addEventListener("statechange", function () {
              if (nextWorker.state === "installed" && navigator.serviceWorker.controller && onUpdateReady) {
                onUpdateReady();
              }
            });
          });

          setInterval(function () {
            registration.update().catch(function () {});
          }, 60 * 60 * 1000);
        })
        .catch(function (error) {
          if (onError) onError(error);
        });
    });
  }

  function initInstallPrompt(options) {
    var opts = options || {};
    var installPanel = document.getElementById(opts.panelId || "installFooterPanel");
    var installButton = document.getElementById(opts.buttonId || "installAppBtn");
    var installNotice = document.getElementById(opts.noticeId || "installNotice");
    var noticeText = document.getElementById(opts.noticeTextId || "installNoticeText");
    var noticeAction = document.getElementById(opts.noticeActionId || "installNoticeAction");
    var noticeClose = document.getElementById(opts.noticeCloseId || "installNoticeClose");
    var notify = typeof opts.notify === "function" ? opts.notify : null;

    if (!installPanel || !installButton || !installNotice || !noticeText || !noticeAction || !noticeClose) {
      return;
    }

    var dismissedKey = opts.dismissedKey || "sira-install-dismissed";
    var installedKey = opts.installedKey || "sira-installed";
    var deferredInstallPrompt = null;

    var isIosDevice = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    var isSafariBrowser =
      /safari/i.test(window.navigator.userAgent) &&
      !/crios|fxios|edgios|opr\//i.test(window.navigator.userAgent);

    function isStandaloneMode() {
      return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    }

    function isInstalled() {
      return isStandaloneMode() || safeGet(localStorage, installedKey) === "true";
    }

    function hideInstallExperience() {
      installPanel.hidden = true;
      installNotice.hidden = true;
    }

    function showInstallExperience(manualInstall) {
      if (isInstalled()) {
        hideInstallExperience();
        return;
      }

      installPanel.hidden = false;

      if (safeGet(sessionStorage, dismissedKey) === "true") {
        installNotice.hidden = true;
        return;
      }

      noticeText.textContent = manualInstall
        ? 'Tap Share and then "Add to Home Screen" to install this app.'
        : "Install this app for faster access and offline support.";
      installNotice.hidden = false;
    }

    function markAsInstalled() {
      safeSet(localStorage, installedKey, "true");
      deferredInstallPrompt = null;
      hideInstallExperience();
    }

    function detectInstalledRelatedApps() {
      if (!("getInstalledRelatedApps" in navigator)) {
        return Promise.resolve(false);
      }

      return navigator
        .getInstalledRelatedApps()
        .then(function (relatedApps) {
          if (Array.isArray(relatedApps) && relatedApps.length > 0) {
            safeSet(localStorage, installedKey, "true");
            return true;
          }
          return false;
        })
        .catch(function () {
          return false;
        });
    }

    function triggerInstall() {
      if (isInstalled()) {
        hideInstallExperience();
        return;
      }

      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice
          .then(function (choice) {
            if (choice && choice.outcome === "accepted") {
              markAsInstalled();
              if (notify) notify("SiRa app installed successfully.", "success");
            }
          })
          .catch(function () {})
          .finally(function () {
            deferredInstallPrompt = null;
          });
        return;
      }

      if (isIosDevice && isSafariBrowser && !isStandaloneMode()) {
        showInstallExperience(true);
        if (notify) notify('Use Share → "Add to Home Screen" to install.', "info");
        return;
      }

      installNotice.hidden = true;
      installPanel.hidden = true;
    }

    installButton.addEventListener("click", triggerInstall);
    noticeAction.addEventListener("click", triggerInstall);
    noticeClose.addEventListener("click", function () {
      safeSet(sessionStorage, dismissedKey, "true");
      installNotice.hidden = true;
    });

    window.addEventListener("beforeinstallprompt", function (event) {
      if (isInstalled()) {
        hideInstallExperience();
        return;
      }
      event.preventDefault();
      deferredInstallPrompt = event;
      showInstallExperience(false);
      if (notify) notify("Install SiRa for app-like speed and offline use.", "info");
    });

    window.addEventListener("appinstalled", function () {
      markAsInstalled();
      if (notify) notify("SiRa app installed successfully.", "success");
    });

    var displayModeQuery = window.matchMedia("(display-mode: standalone)");
    var handleDisplayModeChange = function (event) {
      if (event.matches) {
        markAsInstalled();
      }
    };

    if (typeof displayModeQuery.addEventListener === "function") {
      displayModeQuery.addEventListener("change", handleDisplayModeChange);
    } else if (typeof displayModeQuery.addListener === "function") {
      displayModeQuery.addListener(handleDisplayModeChange);
    }

    window.addEventListener("load", function () {
      if (isInstalled()) {
        hideInstallExperience();
        return;
      }

      detectInstalledRelatedApps().then(function (relatedInstalled) {
        if (relatedInstalled) {
          hideInstallExperience();
          return;
        }

        if (isIosDevice && isSafariBrowser && !isStandaloneMode()) {
          showInstallExperience(true);
          return;
        }

        if (deferredInstallPrompt) {
          showInstallExperience(false);
          return;
        }

        installPanel.hidden = true;
        installNotice.hidden = true;
      });
    });
  }

  window.SiRaShared = {
    initTheme: initTheme,
    initUserMenu: initUserMenu,
    initPanelToggles: initPanelToggles,
    registerServiceWorker: registerServiceWorker,
    initInstallPrompt: initInstallPrompt
  };
})();
