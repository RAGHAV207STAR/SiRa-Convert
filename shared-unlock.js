(function () {
  "use strict";

  var modalHost = null;
  var pendingResolver = null;
  var pendingCancel = null;
  var previousActiveElement = null;
  var apiBaseUrl = detectApiBaseUrl();

  function detectApiBaseUrl() {
    var fromWindow = typeof window.SIRA_UNLOCK_API_BASE === "string" ? window.SIRA_UNLOCK_API_BASE : "";
    var metaTag = document.querySelector('meta[name="sira-unlock-api"]');
    var fromMeta = metaTag ? String(metaTag.getAttribute("content") || "") : "";
    var candidate = String(fromWindow || fromMeta || "").trim();
    if (!candidate) return "";
    return candidate.replace(/\/+$/, "");
  }

  function buildApiUrl(path) {
    var cleanPath = String(path || "").startsWith("/") ? path : "/" + String(path || "");
    if (!apiBaseUrl) return cleanPath;
    return apiBaseUrl + cleanPath;
  }

  function normalizeBase(base) {
    var value = String(base || "").trim();
    return value ? value.replace(/\/+$/, "") : "";
  }

  function toSafeFileName(name, fallback) {
    var selected = String(name || fallback || "document.pdf");
    var withoutControls = selected.replace(/[\u0000-\u001f\u007f]/g, "");
    var cleaned = withoutControls.replace(/[\\/"\r\n]+/g, "-").trim();
    return cleaned || String(fallback || "document.pdf");
  }

  function getApiBaseCandidates() {
    var set = new Set();
    var configured = normalizeBase(apiBaseUrl);
    if (configured) set.add(configured);
    if (window.location && window.location.origin && window.location.origin !== "null") {
      set.add(normalizeBase(window.location.origin));
    }
    set.add("http://localhost:8080");
    set.add("http://127.0.0.1:8080");
    return Array.from(set).filter(Boolean);
  }

  function buildApiUrlForBase(base, path) {
    var cleanPath = String(path || "").startsWith("/") ? path : "/" + String(path || "");
    var normalized = normalizeBase(base);
    if (!normalized) return cleanPath;
    return normalized + cleanPath;
  }

  function ensureModal() {
    if (modalHost) return modalHost;

    var style = document.createElement("style");
    style.textContent = [
      ".unlock-modal-overlay{position:fixed;inset:0;background:rgba(3,8,18,.62);display:grid;place-items:center;z-index:1200;padding:clamp(12px,4vw,24px);overflow-y:auto;-webkit-overflow-scrolling:touch;}",
      ".unlock-modal{width:min(100%,420px);max-height:calc(100dvh - 24px);border:1px solid rgba(125,150,190,.35);border-radius:16px;background:#0f1c31;color:#eaf2ff;box-shadow:0 24px 60px rgba(2,9,24,.55);padding:16px;overflow:auto;}",
      "[data-theme='light'] .unlock-modal{background:#f7fbff;color:#102644;}",
      ".unlock-modal h3{margin:0 0 8px;font-size:1.05rem;}",
      ".unlock-modal p{margin:0 0 12px;font-size:.9rem;color:#9eb2cf;}",
      "[data-theme='light'] .unlock-modal p{color:#3d5b84;}",
      ".unlock-input-row{display:grid;grid-template-columns:1fr auto;gap:8px;margin-bottom:12px;}",
      ".unlock-input-row input{min-width:0;border:1px solid rgba(125,150,190,.35);border-radius:10px;padding:10px 12px;background:rgba(5,14,26,.9);color:inherit;}",
      "[data-theme='light'] .unlock-input-row input{background:#fff;}",
      ".unlock-actions{display:flex;justify-content:flex-end;gap:8px;}",
      ".unlock-actions button,.unlock-input-row button{border:1px solid rgba(125,150,190,.35);border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer;}",
      ".unlock-submit{background:linear-gradient(120deg,#0ea5e9,#2563eb);color:#fff;border:none;}",
      ".unlock-modal-overlay[hidden]{display:none!important;}",
      "@media (max-width:520px){.unlock-modal{padding:14px;border-radius:14px;}.unlock-input-row{grid-template-columns:1fr;}.unlock-input-row button,.unlock-actions button{width:100%;}.unlock-actions{flex-direction:column-reverse;}}"
    ].join("");
    document.head.appendChild(style);

    modalHost = document.createElement("div");
    modalHost.id = "pdfUnlockModal";
    modalHost.className = "unlock-modal-overlay";
    modalHost.hidden = true;
    modalHost.innerHTML =
      '<div class="unlock-modal" role="dialog" aria-modal="true" aria-labelledby="unlockModalTitle">' +
      '<h3 id="unlockModalTitle" data-role="title">Unlock PDF</h3>' +
      '<p data-role="message">Enter password for locked PDF.</p>' +
      '<div class="unlock-input-row">' +
      '<input type="password" data-role="input" autocomplete="current-password" placeholder="PDF password" />' +
      '<button type="button" data-role="toggle">Show</button>' +
      "</div>" +
      '<div class="unlock-actions">' +
      '<button type="button" data-role="cancel">Cancel</button>' +
      '<button type="button" class="unlock-submit" data-role="submit">Unlock</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(modalHost);
    return modalHost;
  }

  function askPassword(options) {
    var opts = options || {};
    if (pendingCancel) pendingCancel();
    return new Promise(function (resolve) {
      var modal = ensureModal();
      var titleEl = modal.querySelector("[data-role='title']");
      var messageEl = modal.querySelector("[data-role='message']");
      var inputEl = modal.querySelector("[data-role='input']");
      var submitBtn = modal.querySelector("[data-role='submit']");
      var cancelBtn = modal.querySelector("[data-role='cancel']");
      var toggleBtn = modal.querySelector("[data-role='toggle']");
      var dialog = modal.querySelector(".unlock-modal");
      previousActiveElement = document.activeElement;
      pendingResolver = resolve;

      titleEl.textContent = String(opts.title || "Unlock PDF");
      messageEl.textContent = String(opts.message || "Enter password for locked PDF.");
      inputEl.value = "";
      inputEl.type = "password";
      toggleBtn.textContent = "Show";
      modal.hidden = false;
      setTimeout(function () {
        inputEl.focus();
      }, 0);

      function cleanup() {
        modal.hidden = true;
        submitBtn.removeEventListener("click", onSubmit);
        cancelBtn.removeEventListener("click", onCancel);
        toggleBtn.removeEventListener("click", onToggle);
        modal.removeEventListener("click", onOverlayClick);
        inputEl.removeEventListener("keydown", onKeyDown);
        dialog.removeEventListener("keydown", onKeyDown);
        if (pendingResolver === resolve) pendingResolver = null;
        if (pendingCancel === onCancel) pendingCancel = null;
        if (previousActiveElement && typeof previousActiveElement.focus === "function") {
          previousActiveElement.focus();
        }
      }
      function onSubmit() {
        var value = String(inputEl.value || "");
        cleanup();
        resolve(value);
      }
      function onCancel() {
        cleanup();
        resolve(null);
      }
      function onToggle() {
        var show = inputEl.type === "password";
        inputEl.type = show ? "text" : "password";
        toggleBtn.textContent = show ? "Hide" : "Show";
        inputEl.focus();
      }
      function onKeyDown(event) {
        if (event.key === "Enter") {
          event.preventDefault();
          onSubmit();
        } else if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }
      function onOverlayClick(event) {
        if (event.target === modal) onCancel();
      }

      submitBtn.addEventListener("click", onSubmit);
      cancelBtn.addEventListener("click", onCancel);
      toggleBtn.addEventListener("click", onToggle);
      inputEl.addEventListener("keydown", onKeyDown);
      dialog.addEventListener("keydown", onKeyDown);
      modal.addEventListener("click", onOverlayClick);
      pendingCancel = onCancel;
    });
  }

  function wait(ms, signal) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        cleanup();
        resolve();
      }, ms);
      function onAbort() {
        cleanup();
        reject(new DOMException("Aborted", "AbortError"));
      }
      function cleanup() {
        clearTimeout(timer);
        if (signal) signal.removeEventListener("abort", onAbort);
      }
      if (signal) signal.addEventListener("abort", onAbort);
    });
  }

  function cancelUnlockJob(jobId, base) {
    if (!jobId) return Promise.resolve();
    var endpoint = buildApiUrlForBase(base || apiBaseUrl, "/api/unlock-pdf/cancel/" + encodeURIComponent(jobId));
    return fetch(endpoint, {
      method: "POST",
      cache: "no-store"
    }).catch(function () {});
  }

  function requestPdfUnlock(file, password, options) {
    var opts = options || {};
    var signal = opts.signal || null;
    var onJobId = typeof opts.onJobId === "function" ? opts.onJobId : null;
    var formData = new FormData();
    formData.append("file", file, file.name || "locked.pdf");
    formData.append("password", password);
    var activeJobId = "";
    var activeApiBase = "";

    function mapHttpErrorMessage(response, payload) {
      var apiError = payload && payload.error ? String(payload.error) : "";
      if (apiError) return apiError;
      if (response.status === 401) return "Incorrect PDF password.";
      if (response.status === 403) return "Unlock request blocked by server policy. Refresh and try again.";
      if (response.status === 404) return "Unlock API not found. Start backend server and expose /api/unlock-pdf routes.";
      if (response.status === 413) return "PDF file is too large for unlock service.";
      if (response.status === 429) return "Too many unlock attempts. Please wait and try again.";
      if (response.status >= 500) return "Unlock service error. Check backend server and qpdf installation.";
      return "Failed to unlock PDF.";
    }

    function parseError(response) {
      return response
        .json()
        .catch(function () {
          return null;
        })
        .then(function (payload) {
          throw new Error(mapHttpErrorMessage(response, payload));
        });
    }

    function fetchUnlockStart() {
      var candidates = getApiBaseCandidates();
      var index = 0;

      function tryNext(lastError) {
        if (index >= candidates.length) {
          if (lastError && lastError.name === "AbortError") throw lastError;
          var endpoints = candidates.map(function (base) {
            return buildApiUrlForBase(base, "/api/unlock-pdf/start");
          });
          throw new Error("Cannot reach unlock service. Checked: " + endpoints.join(", "));
        }
        var base = candidates[index];
        index += 1;
        var endpoint = buildApiUrlForBase(base, "/api/unlock-pdf/start");
        return fetch(endpoint, {
          method: "POST",
          body: formData,
          signal: signal,
          cache: "no-store"
        })
          .then(function (response) {
            if (!response.ok) {
              return parseError(response);
            }
            activeApiBase = base;
            return response.json();
          })
          .catch(function (error) {
            if (error && error.name === "AbortError") throw error;
            var text = String((error && error.message) || "");
            var retryable =
              /Cannot reach unlock service/i.test(text) ||
              /Unlock API not found/i.test(text) ||
              /blocked by server policy/i.test(text);
            if (error && error.message && !retryable) {
              throw error;
            }
            return tryNext(error);
          });
      }

      return tryNext(null);
    }

    return fetchUnlockStart()
      .then(function (payload) {
        activeJobId = String((payload && payload.jobId) || "");
        if (!activeJobId) throw new Error("Unlock job was not created.");
        if (onJobId) onJobId(activeJobId);
        return pollJobResult(activeJobId, signal, activeApiBase);
      })
      .then(function (blob) {
        var safeName = toSafeFileName((file.name || "document.pdf").replace(/\.pdf$/i, "") + "-unlocked.pdf", "document-unlocked.pdf");
        return new File([blob], safeName, { type: "application/pdf" });
      })
      .catch(function (error) {
        if (error && error.name === "AbortError" && activeJobId) {
          cancelUnlockJob(activeJobId, activeApiBase);
          throw new Error("Unlock canceled.");
        }
        throw error;
      });
  }

  function pollJobResult(jobId, signal, base) {
    var endpoint = buildApiUrlForBase(base || apiBaseUrl, "/api/unlock-pdf/result/" + encodeURIComponent(jobId));
    return fetch(endpoint, { method: "GET", signal: signal, cache: "no-store" }).then(function (response) {
      if (response.status === 202) {
        return wait(350, signal).then(function () {
          return pollJobResult(jobId, signal, base);
        });
      }
      if (!response.ok) {
        return response
          .json()
          .catch(function () {
            return null;
          })
          .then(function (payload) {
            var apiError = payload && payload.error ? String(payload.error) : "";
            if (apiError) {
              throw new Error(apiError);
            }
            if (response.status === 404) {
              throw new Error("Unlock job not found. Retry unlock.");
            }
            if (response.status >= 500) {
              throw new Error("Unlock service error while polling result.");
            }
            throw new Error("Failed to unlock PDF.");
          });
      }
      return response.blob();
    });
  }

  function isPdfPasswordError(error, pdfJsPasswordResponses) {
    var passCode = pdfJsPasswordResponses || {};
    return Boolean(
      error &&
        (error.name === "PasswordException" ||
          error.code === passCode.NEED_PASSWORD ||
          error.code === passCode.INCORRECT_PASSWORD ||
          /password|protected|encrypted/i.test(String(error.message || "")))
    );
  }

  window.SiRaUnlocker = {
    askPassword: askPassword,
    requestPdfUnlock: requestPdfUnlock,
    cancelUnlockJob: cancelUnlockJob,
    isPdfPasswordError: isPdfPasswordError,
    getApiBaseUrl: function () {
      return apiBaseUrl || window.location.origin;
    }
  };
})();
