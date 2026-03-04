(function () {
  "use strict";

  const imageInput = document.getElementById("imageInput");
  const uploadBtn = document.getElementById("uploadBtn");
  const clearBtn = document.getElementById("clearBtn");
  const extractBtn = document.getElementById("extractBtn");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const dropZone = document.getElementById("dropZone");
  const previewWrap = document.getElementById("previewWrap");
  const beforeStage = document.getElementById("beforeStage");
  const afterStage = document.getElementById("afterStage");
  const beforeMeta = document.getElementById("beforeMeta");
  const afterMeta = document.getElementById("afterMeta");
  const statusText = document.getElementById("statusText");
  const progressText = document.getElementById("progressText");
  const progressBar = document.getElementById("progressBar");
  const ocrLoading = document.getElementById("ocrLoading");
  const loadingLabel = document.getElementById("loadingLabel");
  const processingOverlay = document.getElementById("processingOverlay");
  const ocrToolCard = document.getElementById("ocrToolCard");
  const enhanceToggle = document.getElementById("enhanceToggle");
  const manualLanguagePanel = document.getElementById("manualLanguagePanel");
  const languageSelect = document.getElementById("languageSelect");
  const ocrModeSelect = document.getElementById("ocrModeSelect");
  const ocrModeHint = document.getElementById("ocrModeHint");
  const ocrModeSpeed = document.getElementById("ocrModeSpeed");
  const resultText = document.getElementById("resultText") || document.getElementById("resultArea");
  const toast = document.getElementById("toast");
  const extractBtnLabel = extractBtn ? extractBtn.textContent : "Extract Text";

  const LANG_PATH = "https://tessdata.projectnaptha.com/4.0.0";
  const WORKER_PATH = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js";
  const CORE_PATH = "https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js";
  const MAX_FILE_SIZE = 20 * 1024 * 1024;
  const MAX_PIXELS = 45_000_000;

  let selectedFile = null;
  let busy = false;
  let previewUrl = "";
  let processedPreviewUrl = "";

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
    window.SiRaShared.registerServiceWorker({
      onUpdateReady: () => showToast("New version available. Refresh to update.", "info"),
      onError: (error) => console.error("Service worker registration failed:", error)
    });
  }

  uploadBtn.addEventListener("click", () => imageInput.click());
  clearBtn.addEventListener("click", resetAll);
  extractBtn.addEventListener("click", runOCR);
  copyBtn.addEventListener("click", copyResultText);
  downloadBtn.addEventListener("click", downloadResultText);

  imageInput.addEventListener("change", () => {
    if (!imageInput.files || !imageInput.files[0]) return;
    void applyFile(imageInput.files[0]);
  });

  dropZone.addEventListener("click", (event) => {
    if (event.target && event.target.closest("button")) return;
    imageInput.click();
  });

  dropZone.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    imageInput.click();
  });

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragging");
  });

  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
    const file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
    if (file) void applyFile(file);
  });

  if (ocrModeSelect) {
    ocrModeSelect.addEventListener("change", updateModeHint);
  }
  updateModeHint();

  function isManualLanguageMode() {
    return !!(manualLanguagePanel && manualLanguagePanel.open);
  }

  function getLanguage() {
    if (!isManualLanguageMode()) return "eng+hin";
    const value = languageSelect ? String(languageSelect.value || "eng").toLowerCase() : "eng";
    return value === "hin" ? "hin" : "eng";
  }

  function getModeConfig() {
    const mode = String(ocrModeSelect ? ocrModeSelect.value : "balanced").toLowerCase();
    if (mode === "fast") {
      return {
        key: "fast",
        psm: "6",
        dpi: "120",
        contrast: 36,
        speedLabel: "~1x (Fast)",
        hint: "Fast mode is quickest for clear screenshots and simple text."
      };
    }
    if (mode === "accurate") {
      return {
        key: "accurate",
        psm: "3",
        dpi: "220",
        contrast: 56,
        speedLabel: "~2x (Accurate)",
        hint: "Accurate mode is slower but improves difficult or small text."
      };
    }
    return {
      key: "balanced",
      psm: "6",
      dpi: "160",
      contrast: 46,
      speedLabel: "~1.4x (Balanced)",
      hint: "Balanced mode is recommended for most images."
    };
  }

  function updateModeHint() {
    const config = getModeConfig();
    if (ocrModeHint) ocrModeHint.textContent = config.hint;
    if (ocrModeSpeed) ocrModeSpeed.textContent = `Estimated speed: ${config.speedLabel}`;
  }

  async function applyFile(file) {
    if (busy) return;
    if (!file || !file.type || !/image\/(png|jpeg)/i.test(file.type)) {
      showToast("Please upload a JPG or PNG image.", "error");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      showToast("Image must be 20 MB or smaller.", "error");
      return;
    }

    try {
      const dimensions = await readImageDimensions(file);
      if ((dimensions.width * dimensions.height) > MAX_PIXELS) {
        showToast("Image resolution too high. Please use a smaller image.", "error");
        return;
      }
    } catch (_error) {
      showToast("Image could not be read. Use a valid JPG or PNG.", "error");
      return;
    }

    selectedFile = file;
    resultText.value = "";
    setProgress(0, "Ready to extract text.");
    extractBtn.disabled = false;
    dropZone.classList.add("file-ready");

    renderPreview(file);
    renderBefore(file);
    resetAfterPreview();
    showToast("Image loaded. Click Extract Text.", "success");
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

  function renderBefore(file) {
    const url = URL.createObjectURL(file);
    beforeStage.innerHTML = "";
    const img = document.createElement("img");
    img.src = url;
    img.alt = "Original OCR input";
    img.onload = () => URL.revokeObjectURL(url);
    beforeStage.appendChild(img);
    beforeMeta.textContent = `Raw input image • ${Math.max(1, Math.round(file.size / 1024))} KB`;
  }

  function resetAfterPreview() {
    if (processedPreviewUrl) {
      URL.revokeObjectURL(processedPreviewUrl);
      processedPreviewUrl = "";
    }
    afterStage.innerHTML = '<p class="compare-empty">Enable Enhance Image for optimized OCR preview.</p>';
    afterMeta.textContent = "Pre-processing not applied yet";
  }

  function renderAfterPreview(blob, width, height, durationMs) {
    if (!blob) {
      resetAfterPreview();
      return;
    }
    if (processedPreviewUrl) URL.revokeObjectURL(processedPreviewUrl);
    processedPreviewUrl = URL.createObjectURL(blob);
    afterStage.innerHTML = "";
    const img = document.createElement("img");
    img.src = processedPreviewUrl;
    img.alt = "Processed OCR input";
    afterStage.appendChild(img);
    afterMeta.textContent = `Processed • ${width}x${height} • ${Math.max(1, Math.round(blob.size / 1024))} KB • ${durationMs}ms`;
  }

  function mapStatus(status, progress, language) {
    const s = String(status || "").toLowerCase();
    const pct = Math.max(0, Math.min(100, Math.round((Number(progress) || 0) * 100)));

    if (s.includes("loading tesseract core") || s.includes("loading worker")) {
      return { label: "Step 1: Initializing OCR engine...", percent: Math.max(pct, 8) };
    }
    if (s.includes("loading language traineddata")) {
      if (String(language).includes("hin")) {
        return { label: `Step 2: Loading Hindi Data... (${pct}%)`, percent: Math.max(pct, 16) };
      }
      return { label: `Step 2: Loading Language Data... (${pct}%)`, percent: Math.max(pct, 16) };
    }
    if (s.includes("initializing tesseract")) {
      return { label: "Step 2: Initializing language model...", percent: Math.max(pct, 24) };
    }
    if (s.includes("recognizing text")) {
      return { label: `Step 3: Recognizing Text (${pct}%)...`, percent: Math.max(pct, 30) };
    }
    if (s.includes("final")) {
      return { label: "Step 4: Finalizing output...", percent: Math.max(pct, 95) };
    }
    return { label: "Processing OCR...", percent: pct };
  }

  function createLogger(language) {
    return (message) => {
      const mapped = mapStatus(message && message.status, message && message.progress, language);
      setProgress(mapped.percent, mapped.label);
    };
  }

  async function createConfiguredWorker(language, modeConfig) {
    // v5-safe path: language passed at worker creation time.
    let worker = null;
    try {
      worker = await window.Tesseract.createWorker(language, 1, {
        logger: createLogger(language),
        langPath: LANG_PATH,
        workerPath: WORKER_PATH,
        corePath: CORE_PATH
      });
    } catch (_primaryError) {
      // Fallback for alternate bundling behavior.
      worker = await window.Tesseract.createWorker({
        logger: createLogger(language),
        langPath: LANG_PATH,
        workerPath: WORKER_PATH,
        corePath: CORE_PATH
      });
      if (typeof worker.loadLanguage === "function") {
        setProgress(14, "Step 2: Loading language data...");
        await worker.loadLanguage(language);
      }
      if (typeof worker.initialize === "function") {
        setProgress(22, "Step 2: Initializing language model...");
        await worker.initialize(language);
      } else if (typeof worker.reinitialize === "function") {
        setProgress(22, "Step 2: Initializing language model...");
        await worker.reinitialize(language);
      }
    }

    if (typeof worker.setParameters === "function") {
      await worker.setParameters({
        tessedit_pageseg_mode: modeConfig.psm,
        user_defined_dpi: modeConfig.dpi,
        preserve_interword_spaces: modeConfig.key === "accurate" ? "1" : "0"
      });
    }

    return worker;
  }

  async function preprocessImage(file, modeConfig) {
    const start = performance.now();
    const bitmap = await createImageBitmap(file);
    const maxDim = modeConfig.key === "accurate" ? 2800 : modeConfig.key === "fast" ? 1500 : 1900;
    const ratio = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * ratio));
    const height = Math.max(1, Math.round(bitmap.height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas context unavailable");

    ctx.drawImage(bitmap, 0, 0, width, height);
    if (typeof bitmap.close === "function") bitmap.close();

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Grayscale + contrast boost for low-quality images.
    const contrast = modeConfig.contrast;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    for (let i = 0; i < data.length; i += 4) {
      const gray = (0.299 * data[i]) + (0.587 * data[i + 1]) + (0.114 * data[i + 2]);
      const adjusted = clampByte((factor * (gray - 128)) + 128);
      data[i] = adjusted;
      data[i + 1] = adjusted;
      data[i + 2] = adjusted;
      data[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    const blob = await canvasToBlob(canvas, "image/png", 0.9);
    const durationMs = Math.round(performance.now() - start);
    return { canvas, blob, width, height, durationMs };
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
    toggleBusy(true);
    setProgress(0, "Step 1: Initializing OCR engine...");

    const language = getLanguage();
    const modeConfig = getModeConfig();
    let worker = null;

    try {
      if (!navigator.onLine) {
        showToast("Offline: OCR works only if language data was downloaded earlier.", "warn");
      }

      let sourceForOCR = selectedFile;
      if (enhanceToggle && enhanceToggle.checked) {
        setProgress(5, "Preparing image (grayscale + contrast)...");
        const processed = await preprocessImage(selectedFile, modeConfig);
        sourceForOCR = processed.canvas;
        renderAfterPreview(processed.blob, processed.width, processed.height, processed.durationMs);
      } else {
        resetAfterPreview();
      }

      worker = await withTimeout(
        createConfiguredWorker(language, modeConfig),
        90000,
        "OCR initialization timeout: language data could not be loaded."
      );
      setProgress(35, "Step 3: Recognizing Text...");

      const recognitionPromise = worker.recognize(sourceForOCR);
      const result = await withTimeout(recognitionPromise, 150000, "OCR timeout: processing took too long.");
      const text = String(result && result.data && result.data.text ? result.data.text : "").trim();

      if (!text || isLikelyBadOutput(text)) {
        resultText.value = text;
        setProgress(100, "Step 4: Finalized (low quality output).");
        statusText.textContent = "Image too blurry. Try a clearer shot.";
        showToast("Image too blurry. Try a clearer shot.", "warn");
        return;
      }

      resultText.value = text;
      setProgress(100, "Step 4: Finalized.");
      statusText.textContent = "OCR complete.";
      showToast("Text extracted successfully.", "success");
    } catch (error) {
      console.error("OCR failed:", error);
      const message = String(error && error.message ? error.message : error).toLowerCase();
      if (message.includes("timeout")) {
        setProgress(0, "OCR timeout. Try a smaller or clearer image.");
        showToast("OCR timeout. Try a smaller or clearer image.", "error");
      } else if (message.includes("network") || message.includes("failed to fetch")) {
        setProgress(0, "Network error. Check internet connection.");
        showToast("Check internet connection or image quality.", "error");
      } else {
        setProgress(0, "OCR failed. Check internet or image quality.");
        showToast("Check internet connection or image quality.", "error");
      }
    } finally {
      if (worker && typeof worker.terminate === "function") {
        try {
          await worker.terminate();
        } catch (terminateError) {
          console.warn("Worker terminate warning:", terminateError);
        }
      }
      busy = false;
      toggleBusy(false);
    }
  }

  function isLikelyBadOutput(text) {
    const normalized = String(text || "").trim();
    if (normalized.length < 6) return true;
    const meaningfulChars = (normalized.match(/[\p{L}\p{N}\s]/gu) || []).length;
    return meaningfulChars / normalized.length < 0.45;
  }

  function withTimeout(promise, timeoutMs, errorMessage) {
    let timer = null;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  async function copyResultText() {
    const text = String(resultText.value || "").trim();
    if (!text) {
      showToast("No text to copy yet.", "warn");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied to clipboard.", "success");
    } catch (_error) {
      showToast("Clipboard unavailable. Copy manually.", "warn");
    }
  }

  function downloadResultText() {
    const text = String(resultText.value || "").trim();
    if (!text) {
      showToast("No text to download yet.", "warn");
      return;
    }

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ocr-output.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Text file downloaded.", "success");
  }

  function resetAll() {
    if (busy) return;
    selectedFile = null;
    if (imageInput) imageInput.value = "";
    if (resultText) resultText.value = "";

    extractBtn.disabled = true;
    dropZone.classList.remove("file-ready");
    setProgress(0, "Waiting for image upload.");

    previewWrap.innerHTML = '<p class="preview-empty">Image preview will appear here.</p>';
    beforeStage.innerHTML = '<p class="compare-empty">Upload an image to preview.</p>';
    beforeMeta.textContent = "Raw input image";
    resetAfterPreview();

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = "";
    }
  }

  function setProgress(percent, label) {
    const p = Math.max(0, Math.min(100, Number(percent) || 0));
    progressBar.style.width = `${p}%`;
    progressText.textContent = `${p}%`;
    if (label) {
      statusText.textContent = label;
      if (loadingLabel) loadingLabel.textContent = label;
    }
  }

  function toggleBusy(isBusy) {
    extractBtn.disabled = isBusy || !selectedFile;
    uploadBtn.disabled = isBusy;
    clearBtn.disabled = isBusy;
    copyBtn.disabled = isBusy;
    downloadBtn.disabled = isBusy;
    if (languageSelect) languageSelect.disabled = isBusy;
    if (ocrModeSelect) ocrModeSelect.disabled = isBusy;
    if (extractBtn) {
      extractBtn.classList.toggle("is-loading", isBusy);
      extractBtn.textContent = isBusy ? "Extracting..." : extractBtnLabel;
    }
    if (ocrLoading) ocrLoading.hidden = true;
    if (processingOverlay) processingOverlay.hidden = true;
    if (ocrToolCard) {
      ocrToolCard.classList.remove("busy-lock");
      ocrToolCard.setAttribute("aria-busy", isBusy ? "true" : "false");
    }
  }

  function showToast(message, type) {
    if (!toast) return;
    toast.textContent = String(message || "");
    toast.className = `toast ${type || "info"}`;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2600);
  }

  async function readImageDimensions(file) {
    const bitmap = await createImageBitmap(file);
    const width = bitmap.width;
    const height = bitmap.height;
    if (typeof bitmap.close === "function") bitmap.close();
    return { width, height };
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to build processed image."));
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
})();
