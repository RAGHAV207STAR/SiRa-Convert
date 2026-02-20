const state = {
    images: [],
    busy: false,
    activeIndex: -1,
    pdfBlob: null,
    pdfUrl: null,
    dragIndex: -1
};

const PERF_LIMITS = {
    maxImagesDesktop: 100,
    maxImagesMobile: 50,
    maxPixelsPerImage: 36_000_000,
    maxPixelsTotal: 240_000_000
};

const imageInput = document.getElementById("imageInput");
const dropZone = document.getElementById("dropZone");
const uploadBtn = document.getElementById("uploadBtn");
const pasteBtn = document.getElementById("pasteBtn");
const fileMeta = document.getElementById("fileMeta");
const convertBtn = document.getElementById("convertBtn");
const clearBtn = document.getElementById("clearBtn");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const sharePdfBtn = document.getElementById("sharePdfBtn");
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
const outputResultInfo = document.getElementById("outputResultInfo");
const outputPreviewCanvas = document.getElementById("outputPreviewCanvas");
const progressBar = document.getElementById("progressBar");
const pageSizeInput = document.getElementById("pageSizeInput");
const orientationInput = document.getElementById("orientationInput");
const fitInput = document.getElementById("fitInput");
const marginInput = document.getElementById("marginInput");
const qualityInput = document.getElementById("qualityInput");
const compressionInput = document.getElementById("compressionInput");
const outputNameInput = document.getElementById("outputNameInput");
const pageSizeValue = document.getElementById("pageSizeValue");
const orientationValue = document.getElementById("orientationValue");
const fitValue = document.getElementById("fitValue");
const marginValue = document.getElementById("marginValue");
const qualityValue = document.getElementById("qualityValue");
const compressionValue = document.getElementById("compressionValue");
const toast = document.getElementById("toast");
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
}

marginInput.addEventListener("input", () => {
    marginValue.textContent = `${marginInput.value} mm`;
});
qualityInput.addEventListener("input", () => {
    qualityValue.textContent = `${qualityInput.value}%`;
});
compressionInput.addEventListener("change", () => {
    compressionValue.textContent = compressionInput.selectedOptions[0].text;
});
pageSizeInput.addEventListener("change", () => {
    pageSizeValue.textContent = pageSizeInput.selectedOptions[0].text;
});
orientationInput.addEventListener("change", () => {
    orientationValue.textContent = orientationInput.selectedOptions[0].text;
});
fitInput.addEventListener("change", () => {
    fitValue.textContent = fitInput.selectedOptions[0].text;
});

uploadBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    imageInput.click();
});
dropZone.addEventListener("click", () => imageInput.click());
dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragging"));
dropZone.addEventListener("drop", async (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
    if (event.dataTransfer && event.dataTransfer.files) {
        await tryAddFiles(Array.from(event.dataTransfer.files));
    }
});

pasteBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    handlePasteButton();
});
document.addEventListener("paste", handlePasteShortcut);

imageInput.addEventListener("change", async () => {
    if (imageInput.files && imageInput.files.length) {
        await tryAddFiles(Array.from(imageInput.files));
    }
});

clearBtn.addEventListener("click", resetAll);
convertBtn.addEventListener("click", createPdf);
downloadPdfBtn.addEventListener("click", downloadPdf);
sharePdfBtn.addEventListener("click", sharePdf);
prevPreviewBtn.addEventListener("click", () => setPreviewByIndex(state.activeIndex - 1));
nextPreviewBtn.addEventListener("click", () => setPreviewByIndex(state.activeIndex + 1));

async function handlePasteButton() {
    if (!navigator.clipboard || !navigator.clipboard.read) {
        showToast("Clipboard button not supported. Use Ctrl+V.", "warn");
        return;
    }

    try {
        const clipboardItems = await navigator.clipboard.read();
        const files = [];
        for (const item of clipboardItems) {
            const imageType = item.types.find((type) => type.startsWith("image/"));
            if (!imageType) continue;
            const blob = await item.getType(imageType);
            files.push(new File([blob], `clipboard-${Date.now()}.png`, { type: imageType }));
        }
        if (!files.length) {
            showToast("No image found in clipboard.", "warn");
            return;
        }
        await tryAddFiles(files);
    } catch (error) {
        showToast("Clipboard access blocked. Try Ctrl+V.", "warn");
    }
}

async function handlePasteShortcut(event) {
    const items = event.clipboardData && event.clipboardData.items;
    if (!items) return;

    const files = [];
    for (const item of items) {
        if (item.kind !== "file") continue;
        const file = item.getAsFile();
        if (!file || !file.type.startsWith("image/")) continue;
        files.push(file);
    }
    if (files.length) {
        event.preventDefault();
        await tryAddFiles(files);
    }
}

async function tryAddFiles(files) {
    try {
        await addFiles(files);
    } catch (error) {
        const message = error && error.message ? error.message : "Failed to add selected images.";
        setStatus(message);
        showToast(message, "error");
    }
}

async function addFiles(files) {
    if (state.busy) return;

    const valid = files.filter((file) => file.type.startsWith("image/"));
    if (!valid.length) {
        showToast("Only image files are supported.", "error");
        return;
    }
    validateIncomingImages(valid.length);

    setStatus("Reading images...");
    for (const file of valid) {
        const imageData = await buildImageData(file);
        state.images.push(imageData);
    }

    state.pdfBlob = null;
    revokePdfUrl();
    updateOutputPreview();
    downloadPdfBtn.disabled = true;
    sharePdfBtn.disabled = true;
    convertBtn.disabled = state.images.length === 0;

    renderQueue();
    updateFileMeta();
    resultInfo.textContent = `${state.images.length} image(s) queued.`;
    setStatus("Images ready. Click Create PDF.");
    showToast(`${valid.length} image(s) added.`, "success");
}

async function buildImageData(file) {
    const url = URL.createObjectURL(file);
    try {
        const dims = await getImageDimensions(url);
        validateImageDimensions(dims, file.name || "image");
        return {
            id: cryptoRandom(),
            file,
            url,
            name: file.name || "image",
            width: dims.width,
            height: dims.height,
            size: file.size
        };
    } catch (error) {
        URL.revokeObjectURL(url);
        throw error;
    }
}

function getImageDimensions(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = reject;
        img.src = url;
    });
}

function renderQueue() {
    gallery.innerHTML = "";
    galleryCount.textContent = `${state.images.length} file${state.images.length > 1 ? "s" : ""}`;

    state.images.forEach((image, index) => {
        const card = document.createElement("article");
        card.className = "thumb";
        card.draggable = true;
        card.innerHTML = `
            <button class="remove" type="button" aria-label="Remove image">×</button>
            <img src="${image.url}" alt="${escapeHtml(image.name)}" loading="lazy" />
            <p class="caption">${escapeHtml(shortName(image.name))}</p>
            <p class="meta">${image.width}×${image.height} • ${formatBytes(image.size)}</p>
        `;

        const removeBtn = card.querySelector(".remove");
        const imageEl = card.querySelector("img");
        removeBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            removeImage(index);
        });
        imageEl.addEventListener("click", () => setPreviewByIndex(index));
        card.addEventListener("dragstart", () => {
            state.dragIndex = index;
        });
        card.addEventListener("dragover", (event) => {
            event.preventDefault();
            card.classList.add("drag-over");
        });
        card.addEventListener("dragleave", () => {
            card.classList.remove("drag-over");
        });
        card.addEventListener("drop", (event) => {
            event.preventDefault();
            card.classList.remove("drag-over");
            reorderImages(state.dragIndex, index);
        });
        card.addEventListener("dragend", () => {
            state.dragIndex = -1;
            card.classList.remove("drag-over");
        });

        gallery.appendChild(card);
    });

    if (state.images.length) {
        setPreviewByIndex(Math.max(0, Math.min(state.activeIndex, state.images.length - 1)));
    } else {
        clearPreview();
    }
}

function setPreviewByIndex(index) {
    if (index < 0 || index >= state.images.length) return;
    const image = state.images[index];
    state.activeIndex = index;
    previewImage.src = image.url;
    previewImage.hidden = false;
    previewImage.alt = `Preview of ${image.name}`;
    previewEmpty.hidden = true;
    previewTitle.textContent = `Image ${index + 1} selected`;
    previewMeta.textContent = `${image.width}×${image.height} px • ${formatBytes(image.size)} • ${image.name}`;
    prevPreviewBtn.disabled = index === 0;
    nextPreviewBtn.disabled = index === state.images.length - 1;

    Array.from(gallery.children).forEach((item, idx) => {
        item.classList.toggle("active", idx === index);
    });
}

function removeImage(index) {
    const [removed] = state.images.splice(index, 1);
    if (removed) URL.revokeObjectURL(removed.url);

    state.pdfBlob = null;
    revokePdfUrl();
    updateOutputPreview();
    downloadPdfBtn.disabled = true;
    sharePdfBtn.disabled = true;
    convertBtn.disabled = state.images.length === 0;

    renderQueue();
    updateFileMeta();
    resultInfo.textContent = state.images.length ? `${state.images.length} image(s) queued.` : "No images selected yet.";
    setStatus(state.images.length ? "Image removed." : "Waiting for image upload/paste.");
}

function reorderImages(fromIndex, toIndex) {
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    if (fromIndex >= state.images.length || toIndex >= state.images.length) return;

    const [moved] = state.images.splice(fromIndex, 1);
    state.images.splice(toIndex, 0, moved);
    renderQueue();
    setPreviewByIndex(toIndex);
    state.pdfBlob = null;
    revokePdfUrl();
    updateOutputPreview();
    downloadPdfBtn.disabled = true;
    sharePdfBtn.disabled = true;
    setStatus("Image order updated.");
}

async function createPdf() {
    if (!state.images.length || state.busy) return;

    state.busy = true;
    convertBtn.disabled = true;
    downloadPdfBtn.disabled = true;
    sharePdfBtn.disabled = true;
    progressBar.style.width = "0%";

    try {
        setStatus("Generating PDF...");
        const margin = Number(marginInput.value);
        const imageQuality = Number(qualityInput.value);
        const compression = compressionInput.value;
        const sizeMode = pageSizeInput.value;
        const orientationMode = orientationInput.value;
        const fitMode = fitInput.value;
        validatePdfBuildBudget(state.images, margin, imageQuality, compression);

        let doc = null;

        for (let i = 0; i < state.images.length; i += 1) {
            const image = state.images[i];
            const payload = await fileToPdfImagePayload(image.file, imageQuality);
            const imgMm = pixelToMm(image.width, image.height);
            const page = getPageConfig(sizeMode, orientationMode, imgMm.width, imgMm.height, margin);

            if (!doc) {
                doc = new window.jspdf.jsPDF({ unit: "mm", format: [page.width, page.height], orientation: page.width > page.height ? "l" : "p" });
            } else {
                doc.addPage([page.width, page.height], page.width > page.height ? "l" : "p");
            }

            const contentW = Math.max(10, page.width - margin * 2);
            const contentH = Math.max(10, page.height - margin * 2);
            const scale = fitMode === "cover"
                ? Math.max(contentW / imgMm.width, contentH / imgMm.height)
                : Math.min(contentW / imgMm.width, contentH / imgMm.height);
            const drawW = imgMm.width * scale;
            const drawH = imgMm.height * scale;
            const x = margin + (contentW - drawW) / 2;
            const y = margin + (contentH - drawH) / 2;

            doc.addImage(payload.dataUrl, payload.format, x, y, drawW, drawH, undefined, compression);

            const progress = Math.round(((i + 1) / state.images.length) * 100);
            progressBar.style.width = `${progress}%`;
            setStatus(`Processed image ${i + 1}/${state.images.length}.`);
            await yieldToUi();
        }

        if (!doc) throw new Error("No pages generated.");

        state.pdfBlob = doc.output("blob");
        revokePdfUrl();
        state.pdfUrl = URL.createObjectURL(state.pdfBlob);

        resultInfo.textContent = `PDF created from ${state.images.length} image(s) at ${imageQuality}% quality.`;
        updateOutputPreview();
        setStatus("PDF is ready. You can download or share.");
        downloadPdfBtn.disabled = false;
        sharePdfBtn.disabled = false;
        showToast("PDF created successfully.", "success");
    } catch (error) {
        setStatus("Failed to create PDF.");
        showToast(error.message || "Failed to create PDF.", "error");
    } finally {
        state.busy = false;
        convertBtn.disabled = state.images.length === 0;
    }
}

function getPageConfig(sizeMode, orientationMode, imgW, imgH, margin) {
    let width;
    let height;

    if (sizeMode === "auto") {
        width = Math.max(60, imgW + margin * 2);
        height = Math.max(60, imgH + margin * 2);
    } else if (sizeMode === "letter") {
        width = 215.9;
        height = 279.4;
    } else {
        width = 210;
        height = 297;
    }

    let landscape = imgW > imgH;
    if (orientationMode === "portrait") landscape = false;
    if (orientationMode === "landscape") landscape = true;

    if (landscape && height > width) {
        [width, height] = [height, width];
    }
    if (!landscape && width > height) {
        [width, height] = [height, width];
    }

    return { width, height };
}

function pixelToMm(pxW, pxH) {
    return { width: pxW * 0.264583, height: pxH * 0.264583 };
}

function fileToPdfImagePayload(file, qualityPercent) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        const quality = Math.min(1, Math.max(0.8, qualityPercent / 100));
        const type = String(file.type || "").toLowerCase();
        const usePng = type === "image/png";

        reader.onload = () => {
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext("2d", { alpha: false });
                if (!usePng) {
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                ctx.drawImage(img, 0, 0);
                if (usePng) {
                    resolve({ dataUrl: canvas.toDataURL("image/png"), format: "PNG" });
                    return;
                }
                resolve({ dataUrl: canvas.toDataURL("image/jpeg", quality), format: "JPEG" });
            };
            img.onerror = reject;
            img.src = reader.result;
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function downloadPdf() {
    if (!state.pdfBlob || !state.pdfUrl) return;
    const link = document.createElement("a");
    link.href = state.pdfUrl;
    link.download = buildOutputName();
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("PDF downloaded.", "success");
}

async function sharePdf() {
    if (!state.pdfBlob) return;

    try {
        const file = new File([state.pdfBlob], buildOutputName(), { type: "application/pdf" });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: "JPG to PDF",
                text: "Created with SiRa Convert"
            });
            showToast("PDF shared successfully.", "success");
            return;
        }

        showToast("Sharing is not supported on this browser.", "warn");
    } catch (error) {
        if (error.name !== "AbortError") showToast("Failed to share PDF.", "error");
    }
}

function updateFileMeta() {
    if (!state.images.length) {
        fileMeta.style.display = "none";
        fileMeta.innerHTML = "";
        return;
    }

    const totalBytes = state.images.reduce((sum, img) => sum + img.size, 0);
    fileMeta.style.display = "flex";
    fileMeta.innerHTML = `
        <span class="pill">Files: ${state.images.length}</span>
        <span class="pill">Total size: ${formatBytes(totalBytes)}</span>
        <span class="pill">Output: High-quality PDF</span>
    `;
}

function resetAll() {
    for (const image of state.images) URL.revokeObjectURL(image.url);
    state.images = [];
    state.activeIndex = -1;
    state.busy = false;
    state.pdfBlob = null;
    revokePdfUrl();
    updateOutputPreview();

    imageInput.value = "";
    gallery.innerHTML = "";
    galleryCount.textContent = "0 files";
    clearPreview();
    updateFileMeta();

    progressBar.style.width = "0%";
    convertBtn.disabled = true;
    downloadPdfBtn.disabled = true;
    sharePdfBtn.disabled = true;
    resultInfo.textContent = "No images selected yet.";
    setStatus("Waiting for image upload/paste.");
}

function clearPreview() {
    previewImage.hidden = true;
    previewImage.removeAttribute("src");
    previewEmpty.hidden = false;
    previewTitle.textContent = "No image selected";
    previewMeta.textContent = "Add images to inspect details before generating PDF.";
    prevPreviewBtn.disabled = true;
    nextPreviewBtn.disabled = true;
}

function updateOutputPreview() {
    if (!outputPreviewCanvas || !outputResultInfo) return;

    if (!state.pdfBlob) {
        outputResultInfo.textContent = "Create PDF to view output details.";
        outputPreviewCanvas.innerHTML = '<p class="preview-empty">Your generated PDF summary will appear here after conversion.</p>';
        return;
    }

    outputResultInfo.textContent = `Output ready: ${buildOutputName()}`;
    outputPreviewCanvas.innerHTML = `
        <div class="output-preview-card">
            <h4>PDF Generated Successfully</h4>
            <p>File: ${escapeHtml(buildOutputName())}</p>
            <p>Size: ${formatBytes(state.pdfBlob.size)}</p>
            <p>Pages: ${state.images.length}</p>
        </div>
    `;
}

function revokePdfUrl() {
    if (state.pdfUrl) {
        URL.revokeObjectURL(state.pdfUrl);
        state.pdfUrl = null;
    }
}

function buildOutputName() {
    const base = (outputNameInput.value || "sira-jpg-to-pdf").trim() || "sira-jpg-to-pdf";
    return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

function setStatus(message) {
    statusText.textContent = message;
}

function validateIncomingImages(newCount) {
    const maxImages = window.matchMedia("(max-width: 900px)").matches
        ? PERF_LIMITS.maxImagesMobile
        : PERF_LIMITS.maxImagesDesktop;

    if (state.images.length + newCount > maxImages) {
        throw new Error(`Please keep up to ${maxImages} images per run for stable performance.`);
    }
}

function validateImageDimensions(dims, name) {
    const pixels = dims.width * dims.height;
    if (!Number.isFinite(pixels) || pixels <= 0) {
        throw new Error(`${name} could not be read.`);
    }
    if (pixels > PERF_LIMITS.maxPixelsPerImage) {
        throw new Error(`${name} is too large. Resize the image before converting.`);
    }
}

function validatePdfBuildBudget(images, margin, imageQuality, compression) {
    if (!Number.isFinite(margin) || margin < 0 || margin > 50) {
        throw new Error("Margin value is out of range.");
    }
    if (!Number.isFinite(imageQuality) || imageQuality < 80 || imageQuality > 100) {
        throw new Error("Image quality must be between 80 and 100.");
    }
    if (!["FAST", "MEDIUM", "SLOW"].includes(compression)) {
        throw new Error("Invalid PDF compression mode.");
    }

    let totalPixels = 0;
    for (const image of images) {
        const pixels = image.width * image.height;
        if (!Number.isFinite(pixels) || pixels <= 0) {
            throw new Error(`Invalid image dimensions: ${image.name}`);
        }
        if (pixels > PERF_LIMITS.maxPixelsPerImage) {
            throw new Error(`${image.name} is too large for stable conversion.`);
        }
        totalPixels += pixels;
    }

    if (totalPixels > PERF_LIMITS.maxPixelsTotal) {
        throw new Error("Total image size is too heavy for browser memory. Split into smaller batches.");
    }
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

function shortName(name) {
    if (name.length <= 22) return name;
    return `${name.slice(0, 19)}...`;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function cryptoRandom() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
