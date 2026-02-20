const { PDFDocument } = window.PDFLib;

const state = {
    files: [],
    busy: false,
    activeIndex: -1,
    mergedBlob: null,
    mergedUrl: null,
    dragIndex: -1
};

const PERF_LIMITS = {
    maxFilesDesktop: 80,
    maxFilesMobile: 40,
    maxTotalBytes: 500 * 1024 * 1024
};

const pdfInput = document.getElementById("pdfInput");
const dropZone = document.getElementById("dropZone");
const uploadBtn = document.getElementById("uploadBtn");
const pasteBtn = document.getElementById("pasteBtn");
const fileMeta = document.getElementById("fileMeta");
const mergeBtn = document.getElementById("mergeBtn");
const clearBtn = document.getElementById("clearBtn");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const sharePdfBtn = document.getElementById("sharePdfBtn");
const gallery = document.getElementById("gallery");
const galleryCount = document.getElementById("galleryCount");
const previewEmpty = document.getElementById("previewEmpty");
const previewCanvas = document.getElementById("previewCanvas");
const previewTitle = document.getElementById("previewTitle");
const previewMeta = document.getElementById("previewMeta");
const prevPreviewBtn = document.getElementById("prevPreviewBtn");
const nextPreviewBtn = document.getElementById("nextPreviewBtn");
const statusText = document.getElementById("statusText");
const resultInfo = document.getElementById("resultInfo");
const outputResultInfo = document.getElementById("outputResultInfo");
const outputPreviewCanvas = document.getElementById("outputPreviewCanvas");
const progressBar = document.getElementById("progressBar");
const sortInput = document.getElementById("sortInput");
const outputNameInput = document.getElementById("outputNameInput");
const skipLockedInput = document.getElementById("skipLockedInput");
const sortValue = document.getElementById("sortValue");
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

sortInput.addEventListener("change", () => {
    sortValue.textContent = sortInput.selectedOptions[0].text;
});

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
    if (event.dataTransfer && event.dataTransfer.files) {
        await tryAddFiles(Array.from(event.dataTransfer.files));
    }
});

pasteBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    handlePasteButton();
});
document.addEventListener("paste", handlePasteShortcut);

pdfInput.addEventListener("change", async () => {
    if (pdfInput.files && pdfInput.files.length) {
        await tryAddFiles(Array.from(pdfInput.files));
    }
});

clearBtn.addEventListener("click", resetAll);
mergeBtn.addEventListener("click", mergePdfFiles);
downloadPdfBtn.addEventListener("click", downloadMergedPdf);
sharePdfBtn.addEventListener("click", shareMergedPdf);
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
            if (!item.types.includes("application/pdf")) continue;
            const blob = await item.getType("application/pdf");
            files.push(new File([blob], `clipboard-${Date.now()}.pdf`, { type: "application/pdf" }));
        }
        if (!files.length) {
            showToast("No PDF found in clipboard.", "warn");
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
        if (!file) continue;
        const isPdf = file.type === "application/pdf" || (file.name || "").toLowerCase().endsWith(".pdf");
        if (isPdf) files.push(file);
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
        const message = error && error.message ? error.message : "Failed to add selected PDFs.";
        setStatus(message);
        showToast(message, "error");
    }
}

async function addFiles(files) {
    if (state.busy) return;

    const pdfFiles = files.filter((file) => file.type === "application/pdf" || (file.name || "").toLowerCase().endsWith(".pdf"));
    if (!pdfFiles.length) {
        showToast("Only PDF files are supported.", "error");
        return;
    }
    validateIncomingPdfCount(pdfFiles.length);

    setStatus("Reading PDF files...");
    for (const file of pdfFiles) {
        const loaded = await inspectPdf(file);
        if (loaded) state.files.push(loaded);
    }

    state.mergedBlob = null;
    revokeMergedUrl();
    updateOutputPreview();
    downloadPdfBtn.disabled = true;
    sharePdfBtn.disabled = true;
    mergeBtn.disabled = state.files.length < 2;

    renderQueue();
    updateFileMeta();
    resultInfo.textContent = state.files.length ? `${state.files.length} PDF file(s) queued.` : "No PDF files selected yet.";
    setStatus(state.files.length ? "PDF files ready. Click Merge PDFs." : "Waiting for PDF upload/paste.");
    showToast(`${pdfFiles.length} PDF file(s) added.`, "success");
}

async function inspectPdf(file) {
    try {
        const pdf = await PDFDocument.load(await file.arrayBuffer());
        return {
            id: cryptoRandom(),
            file,
            name: file.name || "document.pdf",
            size: file.size,
            pages: pdf.getPageCount()
        };
    } catch (error) {
        showToast(`${file.name || "A file"} could not be read.`, "warn");
        return null;
    }
}

function getSortedFiles() {
    const list = [...state.files];
    const mode = sortInput.value;

    if (mode === "name-asc") {
        list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (mode === "name-desc") {
        list.sort((a, b) => b.name.localeCompare(a.name));
    }
    return list;
}

function renderQueue() {
    gallery.innerHTML = "";
    galleryCount.textContent = `${state.files.length} file${state.files.length > 1 ? "s" : ""}`;

    state.files.forEach((fileItem, index) => {
        const card = document.createElement("article");
        card.className = "thumb";
        card.draggable = true;
        card.innerHTML = `
            <button class="remove" type="button" aria-label="Remove PDF">×</button>
            <p class="caption">${escapeHtml(shortName(fileItem.name))}</p>
            <p class="meta">${fileItem.pages} pages • ${formatBytes(fileItem.size)}</p>
        `;

        const removeBtn = card.querySelector(".remove");
        removeBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            removePdf(index);
        });
        card.addEventListener("click", () => setPreviewByIndex(index));
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
            reorderPdfFiles(state.dragIndex, index);
        });
        card.addEventListener("dragend", () => {
            state.dragIndex = -1;
            card.classList.remove("drag-over");
        });
        gallery.appendChild(card);
    });

    if (state.files.length) {
        setPreviewByIndex(Math.max(0, Math.min(state.activeIndex, state.files.length - 1)));
    } else {
        clearPreview();
    }
}

function setPreviewByIndex(index) {
    if (index < 0 || index >= state.files.length) return;
    const item = state.files[index];
    state.activeIndex = index;

    previewEmpty.hidden = true;
    previewTitle.textContent = `File ${index + 1} selected`;
    previewMeta.textContent = `${item.pages} pages • ${formatBytes(item.size)} • ${item.name}`;
    prevPreviewBtn.disabled = index === 0;
    nextPreviewBtn.disabled = index === state.files.length - 1;

    previewCanvas.innerHTML = `
        <div class="pdf-file-card">
            <div class="pdf-icon">📄</div>
            <p class="caption">${escapeHtml(item.name)}</p>
            <p class="meta">${item.pages} pages • ${formatBytes(item.size)}</p>
        </div>
    `;

    Array.from(gallery.children).forEach((card, idx) => {
        card.classList.toggle("active", idx === index);
    });
}

function removePdf(index) {
    state.files.splice(index, 1);

    state.mergedBlob = null;
    revokeMergedUrl();
    updateOutputPreview();
    downloadPdfBtn.disabled = true;
    sharePdfBtn.disabled = true;
    mergeBtn.disabled = state.files.length < 2;

    renderQueue();
    updateFileMeta();
    resultInfo.textContent = state.files.length ? `${state.files.length} PDF file(s) queued.` : "No PDF files selected yet.";
    setStatus(state.files.length ? "PDF removed." : "Waiting for PDF upload/paste.");
}

function reorderPdfFiles(fromIndex, toIndex) {
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    if (fromIndex >= state.files.length || toIndex >= state.files.length) return;

    const [moved] = state.files.splice(fromIndex, 1);
    state.files.splice(toIndex, 0, moved);
    renderQueue();
    setPreviewByIndex(toIndex);
    state.mergedBlob = null;
    revokeMergedUrl();
    updateOutputPreview();
    downloadPdfBtn.disabled = true;
    sharePdfBtn.disabled = true;
    setStatus("Queue order updated.");
}

async function mergePdfFiles() {
    if (state.files.length < 2 || state.busy) return;

    state.busy = true;
    mergeBtn.disabled = true;
    downloadPdfBtn.disabled = true;
    sharePdfBtn.disabled = true;
    progressBar.style.width = "0%";

    try {
        const orderedFiles = getSortedFiles();
        const mergedPdf = await PDFDocument.create();
        mergedPdf.setCreator("SiRa Convert");
        mergedPdf.setProducer("SiRa Convert Merge Engine");
        mergedPdf.setTitle("Merged PDF - SiRa Convert");
        const skipLocked = skipLockedInput.checked;
        validateMergeBudget(orderedFiles);

        let mergedCount = 0;
        for (let i = 0; i < orderedFiles.length; i += 1) {
            const fileItem = orderedFiles[i];

            try {
                const donorBytes = await fileItem.file.arrayBuffer();
                const donor = await PDFDocument.load(donorBytes);
                const pages = await mergedPdf.copyPages(donor, donor.getPageIndices());
                pages.forEach((page) => mergedPdf.addPage(page));
                mergedCount += 1;
            } catch (error) {
                if (!skipLocked) {
                    throw new Error(`${fileItem.name} is locked or invalid.`);
                }
            }

            const progress = Math.round(((i + 1) / orderedFiles.length) * 100);
            progressBar.style.width = `${progress}%`;
            setStatus(`Processing ${i + 1}/${orderedFiles.length} file(s)...`);
            await yieldToUi();
        }

        if (mergedCount < 1) {
            throw new Error("No valid PDFs could be merged.");
        }

        const bytes = await mergedPdf.save({
            useObjectStreams: false,
            addDefaultPage: false,
            updateFieldAppearances: false
        });
        state.mergedBlob = new Blob([bytes], { type: "application/pdf" });
        revokeMergedUrl();
        state.mergedUrl = URL.createObjectURL(state.mergedBlob);

        resultInfo.textContent = `Merged ${mergedCount} PDF file(s) successfully.`;
        updateOutputPreview(mergedCount);
        setStatus("Merge complete. Original page quality preserved. You can download or share merged PDF.");
        downloadPdfBtn.disabled = false;
        sharePdfBtn.disabled = false;
        showToast("PDF merge completed successfully.", "success");
    } catch (error) {
        setStatus(error.message || "Merge failed.");
        showToast(error.message || "Merge failed.", "error");
    } finally {
        state.busy = false;
        mergeBtn.disabled = state.files.length < 2;
    }
}

function downloadMergedPdf() {
    if (!state.mergedBlob || !state.mergedUrl) return;

    const link = document.createElement("a");
    link.href = state.mergedUrl;
    link.download = buildOutputName();
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("Merged PDF downloaded.", "success");
}

async function shareMergedPdf() {
    if (!state.mergedBlob) return;

    try {
        const file = new File([state.mergedBlob], buildOutputName(), { type: "application/pdf" });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: "Merged PDF",
                text: "Created with SiRa Convert"
            });
            showToast("Merged PDF shared successfully.", "success");
            return;
        }

        showToast("Sharing is not supported on this browser.", "warn");
    } catch (error) {
        if (error.name !== "AbortError") showToast("Failed to share merged PDF.", "error");
    }
}

function buildOutputName() {
    const base = (outputNameInput.value || "sira-merged-pdf").trim() || "sira-merged-pdf";
    return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

function updateFileMeta() {
    if (!state.files.length) {
        fileMeta.style.display = "none";
        fileMeta.innerHTML = "";
        return;
    }

    const totalBytes = state.files.reduce((sum, item) => sum + item.size, 0);
    const totalPages = state.files.reduce((sum, item) => sum + item.pages, 0);
    fileMeta.style.display = "flex";
    fileMeta.innerHTML = `
        <span class="pill">Files: ${state.files.length}</span>
        <span class="pill">Total pages: ${totalPages}</span>
        <span class="pill">Total size: ${formatBytes(totalBytes)}</span>
    `;
}

function resetAll() {
    state.files = [];
    state.activeIndex = -1;
    state.busy = false;
    state.mergedBlob = null;
    revokeMergedUrl();
    updateOutputPreview();

    pdfInput.value = "";
    gallery.innerHTML = "";
    galleryCount.textContent = "0 files";
    clearPreview();
    updateFileMeta();

    progressBar.style.width = "0%";
    mergeBtn.disabled = true;
    downloadPdfBtn.disabled = true;
    sharePdfBtn.disabled = true;
    resultInfo.textContent = "No PDF files selected yet.";
    setStatus("Waiting for PDF upload/paste.");
}

function clearPreview() {
    previewCanvas.innerHTML = `<p id="previewEmpty" class="preview-empty">Your selected PDF file details will appear here.</p>`;
    previewTitle.textContent = "No file selected";
    previewMeta.textContent = "Upload PDFs to inspect queue details.";
    prevPreviewBtn.disabled = true;
    nextPreviewBtn.disabled = true;
}

function updateOutputPreview(mergedCount) {
    if (!outputPreviewCanvas || !outputResultInfo) return;

    if (!state.mergedBlob) {
        outputResultInfo.textContent = "Merge PDFs to view output details.";
        outputPreviewCanvas.innerHTML = '<p class="preview-empty">Your merged PDF summary will appear here after processing.</p>';
        return;
    }

    const pagesText = Number.isFinite(mergedCount) ? `${mergedCount} file(s) merged` : "Merged output ready";
    outputResultInfo.textContent = `Output ready: ${buildOutputName()}`;
    outputPreviewCanvas.innerHTML = `
        <div class="output-preview-card">
            <h4>Merged PDF Ready</h4>
            <p>File: ${escapeHtml(buildOutputName())}</p>
            <p>Size: ${formatBytes(state.mergedBlob.size)}</p>
            <p>${pagesText}</p>
        </div>
    `;
}

function revokeMergedUrl() {
    if (state.mergedUrl) {
        URL.revokeObjectURL(state.mergedUrl);
        state.mergedUrl = null;
    }
}

function setStatus(message) {
    statusText.textContent = message;
}

function validateIncomingPdfCount(newCount) {
    const maxFiles = window.matchMedia("(max-width: 900px)").matches
        ? PERF_LIMITS.maxFilesMobile
        : PERF_LIMITS.maxFilesDesktop;

    if (state.files.length + newCount > maxFiles) {
        throw new Error(`Please merge up to ${maxFiles} files at once for stable performance.`);
    }
}

function validateMergeBudget(files) {
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > PERF_LIMITS.maxTotalBytes) {
        throw new Error("Selected files are too large for one merge. Split into smaller batches.");
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
    if (name.length <= 24) return name;
    return `${name.slice(0, 21)}...`;
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
