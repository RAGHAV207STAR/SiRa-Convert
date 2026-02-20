const hasPdfJs = typeof window.pdfjsLib !== "undefined";
const hasZip = typeof window.JSZip !== "undefined";

if (hasPdfJs) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
}

const state = {
    file: null,
    images: [],
    busy: false,
    lastZipBlob: null,
    activeIndex: -1
};
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const MAX_CONVERT_PAGES = 100;
const analytics = window.SiRaAnalytics || null;

const pdfInput = document.getElementById("pdfInput");
const dropZone = document.getElementById("dropZone");
const uploadBtn = document.getElementById("uploadBtn");
const pasteBtn = document.getElementById("pasteBtn");
const fileMeta = document.getElementById("fileMeta");
const convertBtn = document.getElementById("convertBtn");
const clearBtn = document.getElementById("clearBtn");
const cancelUnlockBtn = document.getElementById("cancelUnlockBtn");
const downloadZipBtn = document.getElementById("downloadZipBtn");
const downloadAllBtn = document.getElementById("downloadAllBtn");
const shareZipBtn = document.getElementById("shareZipBtn");
const gallery = document.getElementById("gallery");
const galleryCount = document.getElementById("galleryCount");
const previewEmpty = document.getElementById("previewEmpty");
const previewImage = document.getElementById("previewImage");
const previewTitle = document.getElementById("previewTitle");
const previewMeta = document.getElementById("previewMeta");
const prevPreviewBtn = document.getElementById("prevPreviewBtn");
const nextPreviewBtn = document.getElementById("nextPreviewBtn");
const statusText = document.getElementById("statusText");
const resultInfo = document.getElementById("resultInfo");
const progressBar = document.getElementById("progressBar");
const modeInput = document.getElementById("modeInput");
const scaleInput = document.getElementById("scaleInput");
const qualityInput = document.getElementById("qualityInput");
const formatInput = document.getElementById("formatInput");
const rangeInput = document.getElementById("rangeInput");
const scaleValue = document.getElementById("scaleValue");
const qualityValue = document.getElementById("qualityValue");
const formatValue = document.getElementById("formatValue");
const modeValue = document.getElementById("modeValue");
const modeHint = document.getElementById("modeHint");
const toast = document.getElementById("toast");
const uploadedInputCanvas = document.getElementById("uploadedInputCanvas");
let inlineAlert = null;
let unlockCancelController = null;
if (window.SiRaShared) {
    window.SiRaShared.initTheme();
    window.SiRaShared.initUserMenu();
    window.SiRaShared.initAuthBridge({
        loginUrl: "index.html?login=1",
        logoutUrl: "index.html?logout=1"
    });
    window.SiRaShared.initPanelToggles({
        controlsPanelId: "controlsPanel",
        controlsStateId: "controlsState",
        previewPanelId: "uploadedPreviewPanel",
        previewStateId: "uploadedPreviewState",
        secondaryPreviewPanelId: "outputPreviewPanel",
        secondaryPreviewStateId: "outputPreviewState"
    });
    window.SiRaShared.registerServiceWorker({
        onUpdateReady: () => showToast("New version available. Refresh to update.", "info"),
        onError: (error) => console.error("Service worker registration failed:", error)
    });
    window.SiRaShared.initInstallPrompt({
        notify: (message, type) => showToast(message, type)
    });
    if (typeof window.SiRaShared.initInlineAlert === "function") {
        inlineAlert = window.SiRaShared.initInlineAlert({ hostId: "statusText" });
    }
}

scaleInput.addEventListener("input", () => {
    scaleValue.textContent = `${Number(scaleInput.value).toFixed(1)}x`;
});

qualityInput.addEventListener("input", () => {
    qualityValue.textContent = `${qualityInput.value}%`;
});
formatInput.addEventListener("change", () => {
    formatValue.textContent = formatInput.selectedOptions[0].text;
});
modeInput.addEventListener("change", () => {
    applyModePreset(modeInput.value);
});
initializeModePreset();

uploadBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    pdfInput.click();
});
dropZone.addEventListener("click", () => pdfInput.click());
dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragging"));
dropZone.addEventListener("drop", async (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
    const droppedFiles = event.dataTransfer && event.dataTransfer.files
        ? Array.from(event.dataTransfer.files)
        : [];
    if (droppedFiles.length > 1) {
        showToast("PDF to JPG supports one PDF at a time. Using first file.", "warn");
    }
    const dropped = droppedFiles[0];
    if (dropped) {
        await handlePickedFile(dropped);
    }
});

pasteBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    handlePasteButton();
});
document.addEventListener("paste", handlePasteShortcut);

pdfInput.addEventListener("change", async () => {
    if (pdfInput.files && pdfInput.files.length) {
        if (pdfInput.files.length > 1) {
            showToast("PDF to JPG supports one PDF at a time. Using first file.", "warn");
        }
        await handlePickedFile(pdfInput.files[0]);
    }
});

clearBtn.addEventListener("click", resetAll);
convertBtn.addEventListener("click", convertPdfToJpg);
downloadZipBtn.addEventListener("click", () => downloadAllAsZip());
downloadAllBtn.addEventListener("click", downloadAllAsJpg);
shareZipBtn.addEventListener("click", shareZip);
prevPreviewBtn.addEventListener("click", () => setPreviewByIndex(state.activeIndex - 1));
nextPreviewBtn.addEventListener("click", () => setPreviewByIndex(state.activeIndex + 1));

bootstrapDependencies();

async function handlePasteButton() {
    if (!navigator.clipboard || !navigator.clipboard.read) {
        showToast("Clipboard paste button is not supported. Use Ctrl+V.", "warn");
        setStatus("Press Ctrl+V after copying a PDF file.");
        return;
    }

    try {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
            if (item.types.includes("application/pdf")) {
                const blob = await item.getType("application/pdf");
                const file = new File([blob], "clipboard.pdf", { type: "application/pdf" });
                await handlePickedFile(file);
                return;
            }
        }
        showToast("No PDF found in clipboard.", "warn");
    } catch (error) {
        showToast("Clipboard access blocked. Try Ctrl+V inside the page.", "warn");
    }
}

async function handlePasteShortcut(event) {
    const items = event.clipboardData && event.clipboardData.items;
    if (!items) return;

    const pdfFiles = [];
    for (const item of items) {
        if (item.kind !== "file") continue;
        const file = item.getAsFile();
        if (!file) continue;

        const isPdf = file.type === "application/pdf" || (file.name && file.name.toLowerCase().endsWith(".pdf"));
        if (isPdf) {
            pdfFiles.push(file);
        }
    }
    if (!pdfFiles.length) return;

    event.preventDefault();
    if (pdfFiles.length > 1) {
        showToast("PDF to JPG supports one PDF at a time. Using first file.", "warn");
    }
    await handlePickedFile(pdfFiles[0]);
}

async function handlePickedFile(file) {
    if (state.busy) return;

    if (file.type !== "application/pdf" && !(file.name || "").toLowerCase().endsWith(".pdf")) {
        setStatus("Only PDF files are supported.");
        showToast("Only PDF files are supported.", "error");
        showInlineError("Only PDF files are supported.");
        return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
        setStatus("PDF must be 100 MB or smaller.");
        showToast("Upload limit: PDF must be 100 MB or smaller.", "error");
        showInlineError("Upload limit: PDF must be 100 MB or smaller.");
        return;
    }

    setStatus("Checking PDF security...");
    const validation = await validatePdfFile(file);
    if (!validation.ok) {
        if (validation.reason === "locked") {
            const unlockedFile = await unlockPdfWithBackend(file);
            if (!unlockedFile) {
                resetAll();
                setStatus("Locked PDF was not unlocked.");
                return;
            }
            const unlockedValidation = await validatePdfFile(unlockedFile);
            if (!unlockedValidation.ok) {
                resetAll();
                setStatus("Unlocked PDF is still invalid.");
                showToast("Unlocked PDF is invalid.", "error");
                showInlineError("Unlocked PDF is invalid.");
                return;
            }
            file = unlockedFile;
            validation.ok = true;
            validation.numPages = unlockedValidation.numPages;
            showToast("PDF unlocked successfully.", "success");
            clearInlineError();
        } else {
            resetAll();
            setStatus("Invalid or unreadable PDF file.");
            showToast("Invalid or unreadable PDF file.", "error");
            showInlineError("Invalid or unreadable PDF file.");
            return;
        }
    }
    clearInlineError();

    clearImageUrls();
    state.file = file;
    state.images = [];
    state.lastZipBlob = null;
    state.activeIndex = -1;
    gallery.innerHTML = "";
    galleryCount.textContent = "0 files";
    clearPreview();
    progressBar.style.width = "0%";
    downloadZipBtn.disabled = true;
    downloadAllBtn.disabled = true;
    shareZipBtn.disabled = true;
    convertBtn.disabled = false;

    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    fileMeta.style.display = "flex";
    fileMeta.innerHTML = `
        <span class="pill">File: ${escapeHtml(file.name || "clipboard.pdf")}</span>
        <span class="pill">Size: ${sizeMB} MB</span>
        <span class="pill">Pages: ${validation.numPages}</span>
    `;
    updateUploadedInputPreview(file, validation.numPages, sizeMB);
    resultInfo.textContent = "Ready to convert.";
    setStatus("PDF loaded. Set options and click Convert JPG.");
    showToast("PDF accepted. Ready to convert.", "success");
    trackAnalytics("tool_file_ready", {
        tool: "pdf_to_jpg",
        file_size_bytes: file.size,
        page_count: validation.numPages
    });
}

async function validatePdfFile(file) {
    try {
        const pdfData = await file.arrayBuffer();
        const pdf = await loadPdfDocument(pdfData);
        const numPages = pdf.numPages;
        if (typeof pdf.destroy === "function") {
            await pdf.destroy();
        }
        return { ok: true, numPages };
    } catch (error) {
        return { ok: false, reason: isPdfPasswordError(error) ? "locked" : "invalid" };
    }
}

function isPdfPasswordError(error) {
    const unlocker = window.SiRaUnlocker || null;
    if (unlocker && typeof unlocker.isPdfPasswordError === "function") {
        const passCode = hasPdfJs ? (pdfjsLib.PasswordResponses || {}) : {};
        return unlocker.isPdfPasswordError(error, passCode);
    }
    return Boolean(error && /password|protected|encrypted/i.test(String(error.message || "")));
}

async function unlockPdfWithBackend(file) {
    const unlocker = window.SiRaUnlocker || null;
    if (!unlocker || typeof unlocker.askPassword !== "function") {
        throw new Error("Unlock module is unavailable. Refresh and try again.");
    }
    let attempt = 0;
    while (attempt < 3) {
        attempt += 1;
        const password = await unlocker.askPassword({
            title: `Unlock PDF (${attempt}/3)`,
            message: `Enter password for ${file.name || "this PDF"} to continue conversion.`
        });
        if (password === null) {
            showToast("Unlock cancelled.", "warn");
            showInlineError("Unlock canceled by user.");
            return null;
        }

        setStatus("Unlocking PDF on server...");
        unlockCancelController = new AbortController();
        setUnlockCancelUi(true);
        try {
            const unlocked = await requestPdfUnlock(file, password, { signal: unlockCancelController.signal });
            clearInlineError();
            return unlocked;
        } catch (error) {
            const message = String(error && error.message ? error.message : "Failed to unlock PDF.");
            if (/incorrect pdf password/i.test(message)) {
                showToast("Incorrect password. Try again.", "warn");
                showInlineError("Incorrect PDF password.");
                continue;
            }
            showToast(message, "error");
            showInlineError(message);
            return null;
        } finally {
            unlockCancelController = null;
            setUnlockCancelUi(false);
        }
    }
    showToast("Password attempts exceeded.", "error");
    showInlineError("Password attempts exceeded.");
    return null;
}

function setUnlockCancelUi(active) {
    if (!cancelUnlockBtn) return;
    cancelUnlockBtn.hidden = !active;
    cancelUnlockBtn.disabled = !active;
}

if (cancelUnlockBtn) {
    cancelUnlockBtn.addEventListener("click", () => {
        if (!unlockCancelController) return;
        unlockCancelController.abort();
    });
}

async function requestPdfUnlock(file, password, options) {
    const unlocker = window.SiRaUnlocker || null;
    if (!unlocker || typeof unlocker.requestPdfUnlock !== "function") {
        throw new Error("Unlock module is unavailable. Refresh and try again.");
    }
    return unlocker.requestPdfUnlock(file, password, options || {});
}

function resetAll() {
    clearImageUrls();
    state.file = null;
    state.images = [];
    state.busy = false;
    state.lastZipBlob = null;
    state.activeIndex = -1;
    pdfInput.value = "";
    rangeInput.value = "";
    gallery.innerHTML = "";
    galleryCount.textContent = "0 files";
    clearPreview();
    fileMeta.style.display = "none";
    fileMeta.innerHTML = "";
    clearUploadedInputPreview();
    progressBar.style.width = "0%";
    convertBtn.disabled = true;
    downloadZipBtn.disabled = true;
    downloadAllBtn.disabled = true;
    shareZipBtn.disabled = true;
    resultInfo.textContent = "No pages converted yet.";
    setStatus("Waiting for PDF upload/paste.");
    setUnlockCancelUi(false);
    unlockCancelController = null;
    clearInlineError();
}

function setStatus(message) {
    statusText.textContent = message;
}

function showInlineError(message) {
    if (inlineAlert && typeof inlineAlert.showError === "function") {
        inlineAlert.showError(message);
    }
}

function clearInlineError() {
    if (inlineAlert && typeof inlineAlert.clear === "function") {
        inlineAlert.clear();
    }
}

function updateUploadedInputPreview(file, numPages, sizeMB) {
    if (!uploadedInputCanvas) return;
    uploadedInputCanvas.innerHTML = `
        <div class="uploaded-preview-card">
            <h4>PDF Loaded</h4>
            <p>File: ${escapeHtml(file.name || "clipboard.pdf")}</p>
            <p>Size: ${sizeMB} MB</p>
            <p>Pages: ${numPages}</p>
        </div>
    `;
}

function clearUploadedInputPreview() {
    if (!uploadedInputCanvas) return;
    uploadedInputCanvas.innerHTML = '<p class="preview-empty">Upload a PDF to view file details before conversion.</p>';
}

function parsePageRange(input, maxPage) {
    if (!input.trim()) {
        return Array.from({ length: maxPage }, (_, i) => i + 1);
    }

    const uniquePages = new Set();
    const chunks = input.split(",").map((part) => part.trim()).filter(Boolean);
    for (const chunk of chunks) {
        if (chunk.includes("-")) {
            const [startRaw, endRaw] = chunk.split("-").map((n) => Number(n.trim()));
            if (!Number.isInteger(startRaw) || !Number.isInteger(endRaw)) {
                throw new Error("Invalid range format.");
            }
            const start = Math.min(startRaw, endRaw);
            const end = Math.max(startRaw, endRaw);
            for (let p = start; p <= end; p += 1) {
                if (p >= 1 && p <= maxPage) uniquePages.add(p);
            }
        } else {
            const page = Number(chunk);
            if (!Number.isInteger(page)) {
                throw new Error("Invalid page number.");
            }
            if (page >= 1 && page <= maxPage) uniquePages.add(page);
        }
    }

    const pages = Array.from(uniquePages).sort((a, b) => a - b);
    if (!pages.length) {
        throw new Error("No valid pages found in the given range.");
    }
    return pages;
}

async function convertPdfToJpg() {
    if (!state.file || state.busy) return;

    state.busy = true;
    convertBtn.disabled = true;
    downloadZipBtn.disabled = true;
    shareZipBtn.disabled = true;
    clearImageUrls();
    state.images = [];
    state.lastZipBlob = null;
    state.activeIndex = -1;
    gallery.innerHTML = "";
    galleryCount.textContent = "0 files";
    clearPreview();
    progressBar.style.width = "0%";

    const startTime = performance.now();
    let pdf = null;
    let timerId = null;
    try {
        setStatus("Reading PDF...");
        const pdfData = await state.file.arrayBuffer();
        pdf = await loadPdfDocument(pdfData);
        const targetPages = parsePageRange(rangeInput.value, pdf.numPages);
        const mode = modeInput.value;
        const scale = Number(scaleInput.value);
        const quality = Number(qualityInput.value) / 100;
        const output = getImageOutputConfig(formatInput.value);
        validateConversionBudget(targetPages.length, scale, pdf);
        timerId = startAnalyticsTimer("pdf_to_jpg_convert", {
            tool: "pdf_to_jpg",
            page_count: targetPages.length,
            output_format: output.ext,
            mode
        });
        trackAnalytics("tool_conversion_started", {
            tool: "pdf_to_jpg",
            page_count: targetPages.length,
            output_format: output.ext,
            mode
        });

        setStatus(`Converting ${targetPages.length} page(s)...`);

        for (let index = 0; index < targetPages.length; index += 1) {
            const pageNumber = targetPages[index];
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d", { alpha: false });
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);

            await page.render({ canvasContext: ctx, viewport, intent: "print" }).promise;

            const blob = await new Promise((resolve) => {
                if (output.mime === "image/png") {
                    canvas.toBlob(resolve, output.mime);
                    return;
                }
                canvas.toBlob(resolve, output.mime, quality);
            });

            if (!blob) {
                throw new Error(`Failed converting page ${pageNumber}.`);
            }

            const fileName = `page-${String(pageNumber).padStart(3, "0")}.${output.ext}`;
            const url = URL.createObjectURL(blob);
            const imageFile = new File([blob], fileName, { type: output.mime });
            state.images.push({
                pageNumber,
                fileName,
                blob,
                url,
                file: imageFile,
                width: canvas.width,
                height: canvas.height,
                size: blob.size
            });
            renderThumb(pageNumber, fileName, url, state.images.length - 1);
            if (index === 0) {
                setPreviewByIndex(0);
            }
            galleryCount.textContent = `${state.images.length} file${state.images.length > 1 ? "s" : ""}`;

            const progress = Math.round(((index + 1) / targetPages.length) * 100);
            progressBar.style.width = `${progress}%`;
            setStatus(`Converted page ${pageNumber} (${index + 1}/${targetPages.length}).`);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = 1;
            canvas.height = 1;
            await yieldToUi();
        }

        const seconds = ((performance.now() - startTime) / 1000).toFixed(2);
        resultInfo.textContent = `${state.images.length} ${output.label} file(s) ready in ${seconds}s.`;
        setStatus("Conversion complete. You can download or share files.");
        downloadZipBtn.disabled = state.images.length === 0 || !hasZip;
        downloadAllBtn.disabled = state.images.length === 0;
        shareZipBtn.disabled = state.images.length === 0 || !hasZip;
        showToast("Conversion completed successfully.", "success");
        trackAnalytics("tool_conversion_success", {
            tool: "pdf_to_jpg",
            output_files: state.images.length,
            output_format: output.ext
        });
        endAnalyticsTimer(timerId, { status: "success", output_files: state.images.length });
    } catch (error) {
        setStatus(error.message || "Conversion failed.");
        resultInfo.textContent = "No pages converted yet.";
        showToast(error.message || "Conversion failed.", "error");
        trackAnalytics("tool_conversion_failed", {
            tool: "pdf_to_jpg",
            error_message: String(error && error.message ? error.message : "conversion_failed").slice(0, 120)
        });
        endAnalyticsTimer(timerId, { status: "failed" });
    } finally {
        if (pdf && typeof pdf.destroy === "function") {
            try {
                await pdf.destroy();
            } catch (error) {
                console.warn("Failed to release PDF document resources.", error);
            }
        }
        state.busy = false;
        convertBtn.disabled = !state.file;
    }
}

function initializeModePreset() {
    if (!modeInput) return;
    applyModePreset(modeInput.value || "balanced");
}

function applyModePreset(mode) {
    const presets = {
        fast: {
            scale: 1.75,
            quality: 86,
            format: "jpeg",
            label: "Fast",
            hint: "Fastest conversion with smaller JPG files. Best for quick sharing."
        },
        balanced: {
            scale: 2.75,
            quality: 97,
            format: "jpeg",
            label: "Balanced",
            hint: "Recommended balance of conversion speed and visual quality."
        },
        max: {
            scale: 3.5,
            quality: 100,
            format: "png",
            label: "Max quality",
            hint: "Highest detail output (PNG) with slower conversion and larger files."
        }
    };
    const preset = presets[mode] || presets.balanced;
    modeInput.value = mode in presets ? mode : "balanced";
    if (modeValue) modeValue.textContent = preset.label;
    if (modeHint) modeHint.textContent = preset.hint;
    scaleInput.value = String(preset.scale);
    qualityInput.value = String(preset.quality);
    formatInput.value = preset.format;
    scaleValue.textContent = `${Number(scaleInput.value).toFixed(1)}x`;
    qualityValue.textContent = `${qualityInput.value}%`;
    formatValue.textContent = formatInput.selectedOptions[0].text;
}

function validateConversionBudget(pageCount, scale, pdf) {
    if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > MAX_CONVERT_PAGES) {
        throw new Error(`You can convert up to ${MAX_CONVERT_PAGES} pages at a time.`);
    }

    if (!Number.isFinite(scale) || scale <= 0) {
        throw new Error("Invalid render scale.");
    }

    if (scale > 4.5) {
        throw new Error("Render scale above 4.5 can crash browsers. Reduce scale.");
    }

    if (!pdf || typeof pdf.numPages !== "number") {
        throw new Error("Could not validate PDF conversion limits.");
    }
}

function getImageOutputConfig(mode) {
    if (mode === "png") {
        return { mime: "image/png", ext: "png", label: "PNG" };
    }
    return { mime: "image/jpeg", ext: "jpg", label: "JPG" };
}

function yieldToUi() {
    return new Promise((resolve) => {
        if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(() => resolve());
            return;
        }
        setTimeout(resolve, 0);
    });
}

function renderThumb(pageNumber, fileName, url, imageIndex) {
    const imageMeta = state.images[imageIndex];
    const ext = fileName.split(".").pop().toUpperCase();
    const card = document.createElement("article");
    card.className = "thumb";
    card.innerHTML = `
        <img src="${url}" alt="Preview of PDF page ${pageNumber}" loading="lazy" />
        <p class="caption">Page ${pageNumber}</p>
        <p class="meta">${imageMeta.width}×${imageMeta.height} • ${formatBytes(imageMeta.size)}</p>
        <div class="thumb-actions">
            <a href="${url}" download="${fileName}">Download ${ext}</a>
            <button type="button" data-image-index="${imageIndex}">Share ${ext}</button>
        </div>
    `;

    const shareBtn = card.querySelector("button");
    const imageEl = card.querySelector("img");
    imageEl.addEventListener("click", () => {
        setPreviewByIndex(imageIndex);
    });
    shareBtn.addEventListener("click", () => {
        shareImage(imageIndex);
    });

    gallery.appendChild(card);
}

function setPreviewByIndex(imageIndex) {
    if (imageIndex < 0 || imageIndex >= state.images.length) return;
    const image = state.images[imageIndex];
    state.activeIndex = imageIndex;
    previewImage.src = image.url;
    previewImage.hidden = false;
    previewImage.alt = `Preview of converted PDF page ${image.pageNumber}`;
    previewEmpty.hidden = true;
    previewTitle.textContent = `Page ${image.pageNumber} selected`;
    previewMeta.textContent = `${image.width}×${image.height} px • ${formatBytes(image.size)} • ${image.fileName}`;
    prevPreviewBtn.disabled = imageIndex === 0;
    nextPreviewBtn.disabled = imageIndex === state.images.length - 1;

    Array.from(gallery.children).forEach((item, idx) => {
        item.classList.toggle("active", idx === imageIndex);
    });
}

function clearPreview() {
    state.activeIndex = -1;
    previewImage.hidden = true;
    previewImage.removeAttribute("src");
    previewEmpty.hidden = false;
    previewTitle.textContent = "No page selected";
    previewMeta.textContent = "Convert a PDF to see image details and preview.";
    prevPreviewBtn.disabled = true;
    nextPreviewBtn.disabled = true;
    Array.from(gallery.children).forEach((item) => item.classList.remove("active"));
}

async function getZipBlob() {
    if (!hasZip) {
        throw new Error("ZIP library failed to load. Refresh and try again.");
    }
    if (state.lastZipBlob) return state.lastZipBlob;
    const zip = new JSZip();
    for (const image of state.images) {
        zip.file(image.fileName, image.blob);
    }
    state.lastZipBlob = await zip.generateAsync({ type: "blob" });
    return state.lastZipBlob;
}

async function downloadAllAsZip() {
    if (!state.images.length) return;
    downloadZipBtn.disabled = true;
    setStatus("Preparing ZIP file...");

    try {
        const zipBlob = await getZipBlob();
        const zipUrl = URL.createObjectURL(zipBlob);
        const link = document.createElement("a");
        link.href = zipUrl;
        link.download = "sira-pdf-to-jpg.zip";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(zipUrl);
        setStatus("ZIP downloaded.");
        showToast("ZIP downloaded.", "success");
    } catch (error) {
        setStatus("Failed to create ZIP.");
        showToast("Failed to create ZIP.", "error");
    } finally {
        downloadZipBtn.disabled = !hasZip;
    }
}

function downloadAllAsJpg() {
    if (!state.images.length) return;
    setStatus("Preparing image downloads...");

    state.images.forEach((image, index) => {
        setTimeout(() => {
            const link = document.createElement("a");
            link.href = image.url;
            link.download = image.fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
        }, index * 120);
    });

    showToast("Started all image downloads.", "success");
}

async function shareImage(imageIndex) {
    const image = state.images[imageIndex];
    if (!image) return;

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [image.file] })) {
        try {
            await navigator.share({
                files: [image.file],
                title: `PDF page ${image.pageNumber}`,
                text: `Converted using SiRa Convert`
            });
            showToast(`Shared page ${image.pageNumber}.`, "success");
        } catch (error) {
            if (error.name !== "AbortError") showToast("Could not share image.", "error");
        }
        return;
    }

    showToast("Sharing is not supported on this browser. Use Download JPG.", "warn");
}

async function shareZip() {
    if (!state.images.length) return;

    try {
        const zipBlob = await getZipBlob();
        const zipFile = new File([zipBlob], "sira-pdf-to-jpg.zip", { type: "application/zip" });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [zipFile] })) {
            await navigator.share({
                files: [zipFile],
                title: "PDF to JPG - ZIP",
                text: "Converted with SiRa Convert"
            });
            showToast("ZIP shared successfully.", "success");
            return;
        }

        showToast("Sharing ZIP is not supported on this browser. Use Download ZIP.", "warn");
    } catch (error) {
        if (error.name !== "AbortError") {
            showToast("Failed to share ZIP.", "error");
        }
    }
}

function showToast(message, type = "info") {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2600);
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function bootstrapDependencies() {
    if (!hasPdfJs) {
        setStatus("PDF engine failed to load. Refresh the page and check your connection.");
        resultInfo.textContent = "PDF conversion engine unavailable.";
        convertBtn.disabled = true;
        downloadAllBtn.disabled = true;
        shareZipBtn.disabled = true;
        showToast("PDF engine not loaded. Please refresh.", "error");
    }

    if (!hasZip) {
        downloadZipBtn.disabled = true;
        shareZipBtn.disabled = true;
        showToast("ZIP export unavailable right now.", "warn");
    }
}

async function loadPdfDocument(pdfData) {
    if (!hasPdfJs) {
        throw new Error("PDF conversion engine unavailable.");
    }

    try {
        return await pdfjsLib.getDocument({ data: pdfData }).promise;
    } catch (error) {
        const retryableWorkerIssue =
            /worker|setting up fake worker|networkerror|failed to fetch/i.test(String(error && error.message ? error.message : "")) ||
            error.name === "UnknownErrorException";

        if (!retryableWorkerIssue) {
            throw error;
        }
    }

    return pdfjsLib.getDocument({ data: pdfData, disableWorker: true }).promise;
}

function clearImageUrls() {
    for (const image of state.images) {
        URL.revokeObjectURL(image.url);
    }
}

function trackAnalytics(eventName, params) {
    if (!analytics || typeof analytics.trackEvent !== "function") return;
    analytics.trackEvent(eventName, params || {});
}

function startAnalyticsTimer(label, meta) {
    if (!analytics || typeof analytics.startTimer !== "function") return null;
    return analytics.startTimer(label, meta || {});
}

function endAnalyticsTimer(timerId, meta) {
    if (!timerId) return;
    if (!analytics || typeof analytics.endTimer !== "function") return;
    analytics.endTimer(timerId, meta || {});
}
