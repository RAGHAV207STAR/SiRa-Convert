(function () {
  "use strict";

  const imageInput = document.getElementById("imageInput");
  const uploadBtn = document.getElementById("uploadBtn");
  const clearBtn = document.getElementById("clearBtn");
  const extractBtn = document.getElementById("extractBtn");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const languageSelect = document.getElementById("languageSelect");
  const dropZone = document.getElementById("dropZone");
  const ocrToolCard = document.getElementById("ocrToolCard");
  const processingOverlay = document.getElementById("processingOverlay");
  const previewWrap = document.getElementById("previewWrap");
  const beforeStage = document.getElementById("beforeStage");
  const afterStage = document.getElementById("afterStage");
  const beforeMeta = document.getElementById("beforeMeta");
  const afterMeta = document.getElementById("afterMeta");
  const enhanceToggle = document.getElementById("enhanceToggle");
  const resultText = document.getElementById("resultText");
  const statusText = document.getElementById("statusText");
  const progressText = document.getElementById("progressText");
  const progressBar = document.getElementById("progressBar");
  const ocrLoading = document.getElementById("ocrLoading");
  const loadingLabel = document.getElementById("loadingLabel");
  const toast = document.getElementById("toast");

  let selectedFile = null;
  let previewUrl = "";
  let processedPreviewUrl = "";
  let busy = false;
  const langPath = "https://tessdata.projectnaptha.com/4.0.0";

  if (window.SiRaShared) {
    window.SiRaShared.initTheme();
    window.SiRaShared.initUserMenu();
    window.SiRaShared.initAuthBridge({
      loginUrl: "index.html?login=1",
      logoutUrl: "index.html?logout=1"
    });
    window.SiRaShared.initInstallPrompt({
      notify: (message, type) => showToast(message, type)
    });
  }

  registerServiceWorkerWithPrompt();

  uploadBtn.addEventListener("click", () => imageInput.click());
  clearBtn.addEventListener("click", resetAll);
  extractBtn.addEventListener("click", runOCR);
  copyBtn.addEventListener("click", copyResultText);
  downloadBtn.addEventListener("click", downloadResultText);

  imageInput.addEventListener("change", () => {
    if (!imageInput.files || !imageInput.files.length) return;
    applyFile(imageInput.files[0]);
  });

  dropZone.addEventListener("click", (event) => {
    if (event.target && event.target.closest("button")) return;
    imageInput.click();
  });
  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragging"));
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
    if (!event.dataTransfer || !event.dataTransfer.files || !event.dataTransfer.files.length) return;
    applyFile(event.dataTransfer.files[0]);
  });

  function registerServiceWorkerWithPrompt() {
    if (!("serviceWorker" in navigator)) return;

    let hasRefreshed = false;

    const onControllerChange = () => {
      if (hasRefreshed) return;
      hasRefreshed = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((registration) => {
          const maybePrompt = (worker) => {
            if (!worker || !navigator.serviceWorker.controller) return;
            const message = "A new version is available! Would you like to update now?";
            const accepted = window.confirm(message);
            if (!accepted) return;
            worker.postMessage({ type: "SKIP_WAITING" });
            if (!hasRefreshed) {
              hasRefreshed = true;
              window.location.reload();
            }
          };

          if (registration.waiting) {
            maybePrompt(registration.waiting);
          }

          registration.addEventListener("updatefound", () => {
            const nextWorker = registration.installing;
            if (!nextWorker) return;
            nextWorker.addEventListener("statechange", () => {
              if (nextWorker.state === "installed") {
                maybePrompt(nextWorker);
              }
            });
          });
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    });
  }

  function applyFile(file) {
    if (!file || !file.type || !file.type.startsWith("image/")) {
      showToast("Please upload a JPG or PNG image.", "error");
      return;
    }

    if (!/image\/(jpeg|png)/i.test(file.type)) {
      showToast("Only JPG and PNG are supported.", "warn");
      return;
    }

    selectedFile = file;
    resultText.value = "";
    setProgress(0, "Ready to extract text.");
    renderPreview(file);
    renderCompareOriginal(file);
    resetCompareProcessed();
    dropZone.classList.add("file-ready");
    extractBtn.disabled = false;
    showToast("Image loaded. Choose language and extract text.", "success");
  }

  function renderPreview(file) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    previewWrap.innerHTML = "";
    const img = document.createElement("img");
    img.src = previewUrl;
    img.alt = "OCR input preview";
    previewWrap.appendChild(img);
  }

  function setProgress(percent, label) {
    const normalized = Math.max(0, Math.min(100, Number(percent) || 0));
    progressBar.style.width = normalized + "%";
    progressText.textContent = normalized + "%";
    if (label) {
      statusText.textContent = label;
      if (loadingLabel) loadingLabel.textContent = label;
    }
  }

  function renderCompareOriginal(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    beforeStage.innerHTML = "";
    const img = document.createElement("img");
    img.src = url;
    img.alt = "Original OCR input";
    img.onload = () => URL.revokeObjectURL(url);
    beforeStage.appendChild(img);
    const sizeKB = Math.max(1, Math.round(file.size / 1024));
    beforeMeta.textContent = `Raw input • ${sizeKB} KB`;
  }

  function renderCompareProcessed(blob, details) {
    if (!blob) {
      resetCompareProcessed();
      return;
    }
    if (processedPreviewUrl) URL.revokeObjectURL(processedPreviewUrl);
    processedPreviewUrl = URL.createObjectURL(blob);
    afterStage.innerHTML = "";
    const img = document.createElement("img");
    img.src = processedPreviewUrl;
    img.alt = "Processed OCR input";
    afterStage.appendChild(img);
    const ms = details && details.durationMs ? details.durationMs : 0;
    const sizeKB = Math.max(1, Math.round(blob.size / 1024));
    const dimensions = details ? `${details.width}x${details.height}` : "";
    afterMeta.textContent = `Processed • ${dimensions} • ${sizeKB} KB • ${ms}ms`;
  }

  function resetCompareProcessed() {
    if (processedPreviewUrl) {
      URL.revokeObjectURL(processedPreviewUrl);
      processedPreviewUrl = "";
    }
    afterStage.innerHTML = '<p class="compare-empty">Enable Enhance Image for optimized OCR preview.</p>';
    afterMeta.textContent = "Pre-processing not applied yet";
  }

  function mapStatus(rawStatus) {
    const value = String(rawStatus || "").toLowerCase();
    if (value.includes("loading tesseract core")) return "Initializing Engine...";
    if (value.includes("loading language traineddata")) return "Downloading Language Data...";
    if (value.includes("initializing tesseract")) return "Initializing Engine...";
    if (value.includes("recognizing text")) return "Scanning Image...";
    if (value.includes("final")) return "Finalizing Text...";
    if (value.includes("loading")) return "Initializing Engine...";
    return "Scanning Image...";
  }

  async function runOCR() {
    if (busy) return;
    if (!selectedFile) {
      showToast("Upload an image first.", "warn");
      return;
    }
    if (!window.Tesseract) {
      showToast("OCR engine not loaded. Refresh and try again.", "error");
      return;
    }

    busy = true;
    toggleBusyState(true);
    setProgress(0, "Initializing Engine...");

    const language = languageSelect.value || "eng";
    let worker = null;
    let workerNeedsLanguageInit = true;
    let imageForOcr = selectedFile;

    try {
      if (enhanceToggle && enhanceToggle.checked) {
        setProgress(4, "Preparing image...");
        try {
          const processed = await preprocessImage(selectedFile);
          imageForOcr = processed.blob;
          renderCompareProcessed(processed.blob, processed);
          setProgress(8, "Enhancement complete.");
        } catch (prepError) {
          console.warn("Pre-processing failed, using raw image:", prepError);
          showToast("Enhancement skipped. Scanning original image.", "warn");
          resetCompareProcessed();
        }
      } else {
        resetCompareProcessed();
      }

      try {
        // v2/v4 compatible path.
        worker = await window.Tesseract.createWorker({
          logger: (message) => {
            const percent = Math.round((Number(message.progress) || 0) * 100);
            setProgress(percent, mapStatus(message.status));
          },
          langPath
        });
      } catch (legacyWorkerError) {
        // v5+ path where createWorker may initialize by language directly.
        worker = await window.Tesseract.createWorker(language, 1, {
          logger: (message) => {
            const percent = Math.round((Number(message.progress) || 0) * 100);
            setProgress(percent, mapStatus(message.status));
          },
          langPath
        });
        workerNeedsLanguageInit = false;
      }

      if (workerNeedsLanguageInit && typeof worker.loadLanguage === "function") {
        setProgress(10, "Downloading Language Data...");
        await worker.loadLanguage(language);
      }
      if (workerNeedsLanguageInit && typeof worker.initialize === "function") {
        setProgress(20, "Initializing Engine...");
        await worker.initialize(language);
      } else if (workerNeedsLanguageInit && typeof worker.reinitialize === "function") {
        setProgress(20, "Initializing Engine...");
        await worker.reinitialize(language);
      }

      setProgress(30, "Scanning Image...");
      const result = await worker.recognize(imageForOcr);

      const text = (result && result.data && result.data.text ? result.data.text : "").trim();
      resultText.value = text;
      setProgress(100, "Finalizing Text...");
      showToast("Text extracted successfully.", "success");
    } catch (error) {
      console.error("OCR failed:", error);
      const message = String((error && error.message) || error || "").toLowerCase();
      if (message.includes("memory") || message.includes("allocation")) {
        setProgress(0, "Low memory. Try a smaller image.");
        showToast("Low memory: use a smaller/lower-resolution image.", "error");
      } else if (message.includes("image") || message.includes("format")) {
        setProgress(0, "Invalid image format.");
        showToast("Invalid image format. Use JPG or PNG.", "error");
      } else {
        setProgress(0, "OCR failed. Try another image.");
        showToast("OCR failed. Try a clearer image.", "error");
      }
    } finally {
      if (worker && typeof worker.terminate === "function") {
        try {
          await worker.terminate();
        } catch (terminateError) {
          console.warn("Worker termination failed:", terminateError);
        }
      }
      busy = false;
      toggleBusyState(false);
    }
  }

  async function copyResultText() {
    const text = resultText.value.trim();
    if (!text) {
      showToast("No text to copy yet.", "warn");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied to clipboard.", "success");
    } catch (error) {
      console.error("Copy failed:", error);
      showToast("Clipboard not available. Copy manually.", "warn");
    }
  }

  function downloadResultText() {
    const text = resultText.value.trim();
    if (!text) {
      showToast("No text to download yet.", "warn");
      return;
    }
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ocr-output.txt";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast("Text file downloaded.", "success");
  }

  function toggleBusyState(isBusy) {
    extractBtn.disabled = isBusy || !selectedFile;
    uploadBtn.disabled = isBusy;
    clearBtn.disabled = isBusy;
    languageSelect.disabled = isBusy;
    copyBtn.disabled = isBusy;
    downloadBtn.disabled = isBusy;
    if (ocrLoading) ocrLoading.hidden = !isBusy;
    setBusyOverlay(isBusy);
  }

  function resetAll() {
    if (busy) return;
    selectedFile = null;
    imageInput.value = "";
    resultText.value = "";
    setProgress(0, "Waiting for image upload.");
    extractBtn.disabled = true;
    dropZone.classList.remove("file-ready");
    previewWrap.innerHTML = '<p class="preview-empty">Image preview will appear here.</p>';
    beforeStage.innerHTML = '<p class="compare-empty">Upload an image to preview.</p>';
    beforeMeta.textContent = "Raw input image";
    resetCompareProcessed();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = "";
    }
  }

  function showToast(message, type) {
    if (!toast) return;
    const toastType = type || "info";
    toast.textContent = String(message || "");
    toast.className = "toast " + toastType;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }

  async function preprocessImage(imageSource) {
    const startedAt = performance.now();
    const bitmap = await loadImageBitmap(imageSource);

    // Downscale high-resolution images to avoid memory pressure.
    const maxDimension = 2200;
    const scaleRatio = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scaleRatio));
    const height = Math.max(1, Math.round(bitmap.height * scaleRatio));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas context unavailable");

    ctx.drawImage(bitmap, 0, 0, width, height);
    if (typeof bitmap.close === "function") bitmap.close();

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const gray = new Uint8Array(width * height);

    // High-quality grayscale conversion.
    for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
      const value = Math.round((0.299 * data[i]) + (0.587 * data[i + 1]) + (0.114 * data[i + 2]));
      gray[j] = value;
    }

    // Contrast enhancement.
    const contrast = 42;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    for (let i = 0; i < gray.length; i += 1) {
      const enhanced = factor * (gray[i] - 128) + 128;
      gray[i] = clampByte(enhanced);
    }

    // Otsu thresholding for clean black/white document image.
    const threshold = otsuThreshold(gray);
    for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
      const bw = gray[j] >= threshold ? 255 : 0;
      data[i] = bw;
      data[i + 1] = bw;
      data[i + 2] = bw;
      data[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    const blob = await canvasToBlob(canvas, "image/png", 0.92);
    const durationMs = Math.round(performance.now() - startedAt);
    return { blob, width, height, durationMs };
  }

  async function loadImageBitmap(imageSource) {
    if (typeof createImageBitmap === "function") {
      return createImageBitmap(imageSource);
    }

    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(imageSource);
      const img = new Image();
      img.onload = () => {
        const fallbackCanvas = document.createElement("canvas");
        fallbackCanvas.width = img.naturalWidth || img.width;
        fallbackCanvas.height = img.naturalHeight || img.height;
        const context = fallbackCanvas.getContext("2d");
        if (!context) {
          URL.revokeObjectURL(url);
          reject(new Error("Fallback canvas context unavailable"));
          return;
        }
        context.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(fallbackCanvas);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Image decode failed"));
      };
      img.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Image encoding failed"));
          return;
        }
        resolve(blob);
      }, type || "image/png", quality);
    });
  }

  function clampByte(value) {
    if (value < 0) return 0;
    if (value > 255) return 255;
    return Math.round(value);
  }

  function otsuThreshold(grayPixels) {
    const histogram = new Uint32Array(256);
    for (let i = 0; i < grayPixels.length; i += 1) {
      histogram[grayPixels[i]] += 1;
    }

    const total = grayPixels.length;
    let sum = 0;
    for (let t = 0; t < 256; t += 1) {
      sum += t * histogram[t];
    }

    let sumBackground = 0;
    let weightBackground = 0;
    let maxVariance = -1;
    let threshold = 127;

    for (let t = 0; t < 256; t += 1) {
      weightBackground += histogram[t];
      if (weightBackground === 0) continue;

      const weightForeground = total - weightBackground;
      if (weightForeground === 0) break;

      sumBackground += t * histogram[t];
      const meanBackground = sumBackground / weightBackground;
      const meanForeground = (sum - sumBackground) / weightForeground;
      const varianceBetween =
        weightBackground * weightForeground * (meanBackground - meanForeground) * (meanBackground - meanForeground);

      if (varianceBetween > maxVariance) {
        maxVariance = varianceBetween;
        threshold = t;
      }
    }

    return threshold;
  }

  function setBusyOverlay(isBusy) {
    if (processingOverlay) processingOverlay.hidden = !isBusy;
    if (ocrToolCard) {
      ocrToolCard.classList.toggle("busy-lock", isBusy);
      ocrToolCard.setAttribute("aria-busy", isBusy ? "true" : "false");
    }
  }
})();
