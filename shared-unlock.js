(function () {
  "use strict";

  var modalHost = null;

  function ensureModal() {
    if (modalHost) return modalHost;

    var style = document.createElement("style");
    style.textContent = [
      ".unlock-modal-overlay{position:fixed;inset:0;background:rgba(3,8,18,.62);display:grid;place-items:center;z-index:1200;padding:16px;}",
      ".unlock-modal{width:min(100%,420px);border:1px solid rgba(125,150,190,.35);border-radius:16px;background:#0f1c31;color:#eaf2ff;box-shadow:0 24px 60px rgba(2,9,24,.55);padding:16px;}",
      "[data-theme='light'] .unlock-modal{background:#f7fbff;color:#102644;}",
      ".unlock-modal h3{margin:0 0 8px;font-size:1.05rem;}",
      ".unlock-modal p{margin:0 0 12px;font-size:.9rem;color:#9eb2cf;}",
      "[data-theme='light'] .unlock-modal p{color:#3d5b84;}",
      ".unlock-input-row{display:grid;grid-template-columns:1fr auto;gap:8px;margin-bottom:12px;}",
      ".unlock-input-row input{border:1px solid rgba(125,150,190,.35);border-radius:10px;padding:10px 12px;background:rgba(5,14,26,.9);color:inherit;}",
      "[data-theme='light'] .unlock-input-row input{background:#fff;}",
      ".unlock-actions{display:flex;justify-content:flex-end;gap:8px;}",
      ".unlock-actions button,.unlock-input-row button{border:1px solid rgba(125,150,190,.35);border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer;}",
      ".unlock-submit{background:linear-gradient(120deg,#0ea5e9,#2563eb);color:#fff;border:none;}"
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
    return new Promise(function (resolve) {
      var modal = ensureModal();
      var titleEl = modal.querySelector("[data-role='title']");
      var messageEl = modal.querySelector("[data-role='message']");
      var inputEl = modal.querySelector("[data-role='input']");
      var submitBtn = modal.querySelector("[data-role='submit']");
      var cancelBtn = modal.querySelector("[data-role='cancel']");
      var toggleBtn = modal.querySelector("[data-role='toggle']");

      titleEl.textContent = String(opts.title || "Unlock PDF");
      messageEl.textContent = String(opts.message || "Enter password for locked PDF.");
      inputEl.value = "";
      inputEl.type = "password";
      toggleBtn.textContent = "Show";
      modal.hidden = false;
      inputEl.focus();

      function cleanup() {
        modal.hidden = true;
        submitBtn.removeEventListener("click", onSubmit);
        cancelBtn.removeEventListener("click", onCancel);
        toggleBtn.removeEventListener("click", onToggle);
        inputEl.removeEventListener("keydown", onKeyDown);
      }
      function onSubmit() {
        var value = String(inputEl.value || "");
        if (!value) return;
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

      submitBtn.addEventListener("click", onSubmit);
      cancelBtn.addEventListener("click", onCancel);
      toggleBtn.addEventListener("click", onToggle);
      inputEl.addEventListener("keydown", onKeyDown);
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

  function cancelUnlockJob(jobId) {
    if (!jobId) return Promise.resolve();
    return fetch("/api/unlock-pdf/cancel/" + encodeURIComponent(jobId), {
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

    function parseError(response) {
      return response
        .json()
        .catch(function () {
          return null;
        })
        .then(function (payload) {
          throw new Error((payload && payload.error) || "Failed to unlock PDF.");
        });
    }

    return fetch("/api/unlock-pdf/start", {
      method: "POST",
      body: formData,
      signal: signal,
      cache: "no-store"
    })
      .then(function (response) {
        if (!response.ok) return parseError(response);
        return response.json();
      })
      .then(function (payload) {
        activeJobId = String((payload && payload.jobId) || "");
        if (!activeJobId) throw new Error("Unlock job was not created.");
        if (onJobId) onJobId(activeJobId);
        return pollJobResult(activeJobId, signal);
      })
      .then(function (blob) {
        var safeName = (file.name || "document.pdf").replace(/\.pdf$/i, "") + "-unlocked.pdf";
        return new File([blob], safeName, { type: "application/pdf" });
      })
      .catch(function (error) {
        if (error && error.name === "AbortError" && activeJobId) {
          cancelUnlockJob(activeJobId);
          throw new Error("Unlock canceled.");
        }
        throw error;
      });
  }

  function pollJobResult(jobId, signal) {
    var endpoint = "/api/unlock-pdf/result/" + encodeURIComponent(jobId);
    return fetch(endpoint, { method: "GET", signal: signal, cache: "no-store" }).then(function (response) {
      if (response.status === 202) {
        return wait(350, signal).then(function () {
          return pollJobResult(jobId, signal);
        });
      }
      if (!response.ok) {
        return response
          .json()
          .catch(function () {
            return null;
          })
          .then(function (payload) {
            throw new Error((payload && payload.error) || "Failed to unlock PDF.");
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
    isPdfPasswordError: isPdfPasswordError
  };
})();
