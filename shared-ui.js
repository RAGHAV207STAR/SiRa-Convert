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

  function safeRemove(storage, key) {
    try {
      storage.removeItem(key);
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

  function initAuthBridge(options) {
    var opts = options || {};
    var storageKey = opts.storageKey || "sira-auth-user";
    var profileDisplay = document.getElementById(opts.profileDisplayId || "profileDisplay");
    var userNameDisplay = document.getElementById(opts.userNameId || "userNameDisplay");
    var userEmailDisplay = document.getElementById(opts.userEmailId || "userEmailDisplay");
    var loginLink = document.getElementById(opts.loginLinkId || "loginFromToolLink");
    var logoutButton = document.getElementById(opts.logoutButtonId || "logoutBtn");
    var logoutUrl = opts.logoutUrl || "index.html?logout=1";
    var loginUrl = opts.loginUrl || "index.html?login=1";

    function getStoredUser() {
      var raw = safeGet(localStorage, storageKey);
      if (!raw) return null;
      try {
        var parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        return parsed;
      } catch (error) {
        return null;
      }
    }

    function setGuestAvatar() {
      if (!profileDisplay) return;
      profileDisplay.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
    }

    function setUserAvatar(photoURL, name) {
      if (!profileDisplay) return;
      profileDisplay.replaceChildren();
      if (!photoURL) {
        setGuestAvatar();
        return;
      }
      var img = document.createElement("img");
      img.src = photoURL;
      img.alt = name || "User profile";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.referrerPolicy = "no-referrer";
      profileDisplay.appendChild(img);
    }

    function render() {
      var storedUser = getStoredUser();
      if (storedUser) {
        if (userNameDisplay) userNameDisplay.textContent = storedUser.displayName || "Signed-in User";
        if (userEmailDisplay) userEmailDisplay.textContent = storedUser.email || "Signed in";
        if (loginLink) {
          loginLink.textContent = "Account";
          loginLink.href = "index.html";
        }
        if (logoutButton) logoutButton.hidden = false;
        setUserAvatar(storedUser.photoURL, storedUser.displayName);
        return;
      }

      if (userNameDisplay) userNameDisplay.textContent = "Guest User";
      if (userEmailDisplay) userEmailDisplay.textContent = "Tool-only mode";
      if (loginLink) {
        loginLink.textContent = "Sign in";
        loginLink.href = loginUrl;
      }
      if (logoutButton) logoutButton.hidden = true;
      setGuestAvatar();
    }

    if (logoutButton && !logoutButton.dataset.boundLogoutBridge) {
      logoutButton.addEventListener("click", function () {
        safeRemove(localStorage, storageKey);
        window.location.href = logoutUrl;
      });
      logoutButton.dataset.boundLogoutBridge = "true";
    }

    render();
    return { render: render };
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
    var swPath = opts.path || "/sw.js";

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
    var installHeader = document.getElementById(opts.headerId || "installHeaderBanner");
    var headerText = document.getElementById(opts.headerTextId || "installHeaderText");
    var headerAction = document.getElementById(opts.headerActionId || "installHeaderAction");
    var headerClose = document.getElementById(opts.headerCloseId || "installHeaderClose");
    var notify = typeof opts.notify === "function" ? opts.notify : null;

    var hasFooterInstall = !!(installPanel && installButton);
    var hasBottomNotice = !!(installNotice && noticeText && noticeAction && noticeClose);
    var hasHeaderNotice = !!(installHeader && headerText && headerAction && headerClose);

    if (!hasFooterInstall && !hasBottomNotice && !hasHeaderNotice) {
      return;
    }

    var dismissedKey = opts.dismissedKey || "sira-install-dismissed";
    var dismissedUntilKey = opts.dismissedUntilKey || "sira-install-dismissed-until";
    var installedKey = opts.installedKey || "sira-installed";
    var dismissForMs = Number(opts.dismissForMs || 6 * 60 * 60 * 1000);
    var bannerAutoHideMs = Number(opts.bannerAutoHideMs || 12000);
    var deferredInstallPrompt = null;
    var fallbackNoticeTimer = null;
    var headerAutoHideTimer = null;

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

    function isDismissed() {
      var dismissedUntil = Number(safeGet(localStorage, dismissedUntilKey) || "0");
      if (dismissedUntil > Date.now()) return true;
      return safeGet(sessionStorage, dismissedKey) === "true";
    }

    function clearHeaderAutoHideTimer() {
      if (!headerAutoHideTimer) return;
      window.clearTimeout(headerAutoHideTimer);
      headerAutoHideTimer = null;
    }

    function hideInstallExperience() {
      clearHeaderAutoHideTimer();
      if (installPanel) installPanel.hidden = true;
      if (installNotice) installNotice.hidden = true;
      if (installHeader) {
        installHeader.hidden = true;
        installHeader.classList.remove("show");
      }
    }

    function hideTransientPrompts() {
      clearHeaderAutoHideTimer();
      if (installNotice) installNotice.hidden = true;
      if (installHeader) {
        installHeader.hidden = true;
        installHeader.classList.remove("show");
      }
    }

    function dismissTransientPrompts() {
      safeSet(sessionStorage, dismissedKey, "true");
      safeSet(localStorage, dismissedUntilKey, String(Date.now() + dismissForMs));
      hideTransientPrompts();
    }

    function setNoticeMessage(message) {
      var finalMessage = message || "Install this app for faster access and offline support.";
      if (noticeText) noticeText.textContent = finalMessage;
      if (headerText) headerText.textContent = finalMessage;
    }

    function getManualInstallMessage() {
      if (isIosDevice && isSafariBrowser) {
        return 'Tap Share and then "Add to Home Screen" to install this app.';
      }

      return "Use your browser menu and choose Install App or Add to Home Screen.";
    }

    function showInstallExperience(message) {
      if (isInstalled()) {
        hideInstallExperience();
        return;
      }

      if (hasFooterInstall && installPanel) {
        installPanel.hidden = false;
      }

      if (isDismissed()) {
        hideTransientPrompts();
        return;
      }

      setNoticeMessage(message);

      if (hasHeaderNotice && installHeader) {
        installHeader.hidden = false;
        installHeader.classList.add("show");
        clearHeaderAutoHideTimer();
        headerAutoHideTimer = window.setTimeout(function () {
          if (installHeader) {
            installHeader.classList.remove("show");
            installHeader.hidden = true;
          }
        }, bannerAutoHideMs);
        if (hasBottomNotice && installNotice) {
          installNotice.hidden = true;
        }
        return;
      }

      if (hasBottomNotice && installNotice) {
        installNotice.hidden = false;
      }
    }

    function markAsInstalled() {
      safeSet(localStorage, installedKey, "true");
      safeRemove(localStorage, dismissedUntilKey);
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

      var manualMessage = getManualInstallMessage();
      showInstallExperience(manualMessage);
      if (notify) notify(manualMessage, "info");
    }

    if (installButton && !installButton.dataset.boundInstallPrompt) {
      installButton.addEventListener("click", triggerInstall);
      installButton.dataset.boundInstallPrompt = "true";
    }
    if (noticeAction && !noticeAction.dataset.boundInstallPrompt) {
      noticeAction.addEventListener("click", triggerInstall);
      noticeAction.dataset.boundInstallPrompt = "true";
    }
    if (headerAction && !headerAction.dataset.boundInstallPrompt) {
      headerAction.addEventListener("click", triggerInstall);
      headerAction.dataset.boundInstallPrompt = "true";
    }
    if (noticeClose && !noticeClose.dataset.boundInstallDismiss) {
      noticeClose.addEventListener("click", dismissTransientPrompts);
      noticeClose.dataset.boundInstallDismiss = "true";
    }
    if (headerClose && !headerClose.dataset.boundInstallDismiss) {
      headerClose.addEventListener("click", dismissTransientPrompts);
      headerClose.dataset.boundInstallDismiss = "true";
    }

    window.addEventListener("beforeinstallprompt", function (event) {
      if (isInstalled()) {
        hideInstallExperience();
        return;
      }
      event.preventDefault();
      deferredInstallPrompt = event;
      showInstallExperience("Install this app for faster access and offline support.");
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

        showInstallExperience("Install this app for faster access and offline support.");
        if (deferredInstallPrompt) {
          return;
        }

        fallbackNoticeTimer = window.setTimeout(function () {
          if (!deferredInstallPrompt && !isInstalled()) {
            showInstallExperience(getManualInstallMessage());
          }
        }, 3000);
      });
    });

    window.addEventListener("beforeunload", function () {
      clearHeaderAutoHideTimer();
      if (fallbackNoticeTimer) {
        window.clearTimeout(fallbackNoticeTimer);
      }
    });
  }

  window.SiRaShared = {
    initTheme: initTheme,
    initUserMenu: initUserMenu,
    initAuthBridge: initAuthBridge,
    initPanelToggles: initPanelToggles,
    registerServiceWorker: registerServiceWorker,
    initInstallPrompt: initInstallPrompt
  };
})();
