(function () {
  "use strict";

  function initAds() {
    var adSlots = document.querySelectorAll("ins.adsbygoogle:not([data-ad-init])");
    if (!adSlots.length) return;

    for (var i = 0; i < adSlots.length; i += 1) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        adSlots[i].setAttribute("data-ad-init", "true");
      } catch (_error) {
        return;
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAds, { once: true });
  } else {
    initAds();
  }

  window.addEventListener("pageshow", initAds);
})();
