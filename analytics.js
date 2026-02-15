(function () {
  "use strict";

  function hasGtag() {
    return typeof window.gtag === "function";
  }

  function trimValue(value, maxLen) {
    if (value == null) return "";
    return String(value).replace(/\s+/g, " ").trim().slice(0, maxLen);
  }

  function sendEvent(name, params) {
    if (!hasGtag()) return;
    window.gtag("event", name, params || {});
  }

  function pickLabel(el) {
    if (!el) return "";
    return trimValue(
      el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        el.getAttribute("data-track-label") ||
        el.textContent ||
        el.value ||
        el.id ||
        el.name,
      80
    );
  }

  function pickTarget(el) {
    if (!el) return "";
    if (el.id) return "#" + trimValue(el.id, 60);
    if (el.name) return trimValue(el.name, 60);
    return trimValue(el.className || el.tagName || "", 60);
  }

  document.addEventListener(
    "click",
    function (event) {
      var el = event.target && event.target.closest("a,button,[role='button'],input[type='button'],input[type='submit'],summary");
      if (!el) return;

      var href = el.getAttribute("href") || "";
      var isDownload = el.hasAttribute("download") || /\.(pdf|zip|jpg|jpeg|png)$/i.test(href) || href.indexOf("blob:") === 0;

      sendEvent(isDownload ? "file_download_click" : "ui_click", {
        page_path: location.pathname,
        page_title: document.title,
        element_target: pickTarget(el),
        element_type: trimValue(el.tagName, 20).toLowerCase(),
        element_label: pickLabel(el),
        link_url: trimValue(href, 120)
      });
    },
    true
  );

  document.addEventListener(
    "submit",
    function (event) {
      var form = event.target;
      if (!form || !(form instanceof HTMLFormElement)) return;

      sendEvent("form_submit", {
        page_path: location.pathname,
        page_title: document.title,
        form_id: trimValue(form.id || form.name || "form", 60),
        form_action: trimValue(form.getAttribute("action") || "", 120)
      });
    },
    true
  );

  document.addEventListener(
    "change",
    function (event) {
      var el = event.target;
      if (!el) return;

      if (el.matches("input[type='file']")) {
        var count = el.files ? el.files.length : 0;
        sendEvent("file_selected", {
          page_path: location.pathname,
          page_title: document.title,
          input_target: pickTarget(el),
          file_count: count
        });
        return;
      }

      if (!el.matches("select,input[type='checkbox'],input[type='radio'],input[type='range'],input[type='number'],input[type='text'],textarea")) {
        return;
      }

      sendEvent("ui_change", {
        page_path: location.pathname,
        page_title: document.title,
        control_target: pickTarget(el),
        control_type: trimValue(el.type || el.tagName, 20).toLowerCase(),
        control_label: pickLabel(el)
      });
    },
    true
  );
})();
