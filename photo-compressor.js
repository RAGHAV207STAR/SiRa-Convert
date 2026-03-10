(function () {
    "use strict";

    var dropZone = document.getElementById("drop-zone");
    var imageInput = document.getElementById("image-input");
    var uploadBtn = document.getElementById("upload-btn");
    var clearBtn = document.getElementById("clear-btn");
    var compressBtn = document.getElementById("compress-btn");
    var toolContainer = document.getElementById("toolContainer");
    var stepUpload = document.getElementById("stepUpload");
    var stepPreview = document.getElementById("stepPreview");
    var stepIndicator = document.getElementById("stepIndicator");
    var controlPanel = document.getElementById("controlPanel");
    var targetSizeInput = document.getElementById("target-size-input");
    var targetDisplay = document.getElementById("target-display");
    var targetWarning = document.getElementById("target-warning");
    var presetButtons = document.querySelectorAll(".preset-btn");
    var fileCountEl = document.getElementById("file-count");
    var totalSizeEl = document.getElementById("total-size");
    var statusText = document.getElementById("statusText");
    var progressBar = document.getElementById("progressBar");
    var progressWrap = document.getElementById("progressWrap");
    var uploadEmptyState = document.getElementById("uploadEmptyState");
    var previewRail = document.getElementById("previewRail");
    var resultsPanel = document.getElementById("resultsPanel");
    var resultsInfo = document.getElementById("results-info");
    var resultSummaryList = document.getElementById("resultSummaryList");
    var resultsEl = document.getElementById("results");
    var downloadAllBtn = document.getElementById("download-all-btn");
    var resultsTryAnotherBtn = document.getElementById("results-try-another-btn");
    var dynamicH1 = document.getElementById("dynamic-h1");
    var howToTitle = document.getElementById("dynamic-howto-title");
    var howToSubtitle = document.getElementById("dynamic-howto-subtitle");
    var seoTitle = document.getElementById("dynamic-seo-title");
    var seoSubtitle = document.getElementById("dynamic-seo-subtitle");
    var seoCopy = document.getElementById("dynamic-seo-copy");
    var faqQ1 = document.getElementById("dynamic-faq-q1");
    var faqA1 = document.getElementById("dynamic-faq-a1");
    var sizeNoteTitle = document.getElementById("dynamic-size-note-title");
    var sizeNoteSubtitle = document.getElementById("dynamic-size-note-subtitle");
    var sizeNoteBody = document.getElementById("dynamic-size-note-body");
    var sizeNoteList = document.getElementById("dynamic-size-usecases");
    var highClarityToggle = document.getElementById("high-clarity-toggle");
    var metaDescription = document.querySelector('meta[name="description"]');
    var canonicalLink = document.querySelector('link[rel="canonical"]');
    var maxBulkFiles = 50;
    var defaultCompressLabel = compressBtn.textContent;
    var stepChips = stepIndicator ? stepIndicator.querySelectorAll(".step-chip") : [];
    var stepLines = stepIndicator ? stepIndicator.querySelectorAll(".step-line") : [];

    var state = {
        files: [],
        resultUrls: [],
        isProcessing: false,
        zipArchive: null,
        zipTargetKb: 0,
        currentStep: "upload"
    };

    var inlineAlert = window.SiRaShared && window.SiRaShared.initInlineAlert
        ? window.SiRaShared.initInlineAlert({ hostId: "statusText" })
        : null;

    function notify(type, message) {
        if (!inlineAlert) return;
        if (type === "error") {
            inlineAlert.showError(message);
            return;
        }
        inlineAlert.showInfo(message);
    }

    function setCanonicalToCurrent() {
        if (!canonicalLink || !window.location) return;
        canonicalLink.setAttribute("href", window.location.origin + window.location.pathname);
    }

    function bytesToReadable(bytes) {
        if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
        if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
        return (bytes / 1024).toFixed(1) + " KB";
    }

    function formatDimensions(width, height) {
        if (!Number.isFinite(width) || !Number.isFinite(height)) return "Unknown";
        return Math.round(width) + " x " + Math.round(height) + " px";
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function getTargetKb() {
        var value = Number(targetSizeInput.value);
        if (!Number.isFinite(value) || value <= 0) return 200;
        return Math.max(1, Math.round(value));
    }

    function getToleranceBytes(targetBytes) {
        return Math.min(5 * 1024, Math.max(2 * 1024, Math.round(targetBytes * 0.1)));
    }

    function formatFileType(type) {
        if (!type) return "Image";
        var cleanType = String(type).split("/").pop() || "image";
        return cleanType.toUpperCase();
    }

    function getRecommendedMinimumKb() {
        if (state.files.length === 0) return 20;

        var largestFileKb = state.files.reduce(function (max, item) {
            return Math.max(max, Math.ceil(item.size / 1024));
        }, 0);

        return Math.max(10, Math.min(150, Math.round(largestFileKb * 0.04)));
    }

    function setText(node, value) {
        if (node && typeof value === "string") {
            node.textContent = value;
        }
    }

    function renderUseCases(items) {
        if (!sizeNoteList) return;
        sizeNoteList.innerHTML = "";
        items.forEach(function (item) {
            var li = document.createElement("li");
            li.textContent = item;
            sizeNoteList.appendChild(li);
        });
    }

    function getUseCases(targetKb, context) {
        var size = targetKb || 150;
        if (context.mode === "filetype" && context.fileLabel) {
            return [
                "Optimize " + context.fileLabel + " uploads for forms and portals around " + size + " KB.",
                "Speed up web pages by converting " + context.fileLabel + " assets to lightweight files.",
                "Batch-compress " + context.fileLabel + " screenshots before sharing or emailing."
            ];
        }
        if (context.mode === "usecase" && context.useLabel) {
            return [
                "Meet " + context.useLabel + " portal limits by setting a firm KB cap.",
                "Keep IDs and documents clear while staying under file-size rules.",
                "Batch process up to 50 files for the same " + context.useLabel + " submission."
            ];
        }
        if (size <= 30) {
            return [
                "Exam, scholarship, and government e-form uploads with strict caps.",
                "Passport-size photos where portals demand tiny file weights.",
                "Messaging apps that throttle larger attachments."
            ];
        }
        if (size <= 80) {
            return [
                "Job applications and HR portals needing small but readable headshots.",
                "College admissions portals and online forms with mid-size limits.",
                "Marketplace thumbnails that must stay crisp and light."
            ];
        }
        if (size <= 200) {
            return [
                "Website hero or banner images tuned for fast load without blur.",
                "Portfolio previews and LinkedIn banners that balance sharpness and weight.",
                "Email attachments that avoid bounce limits."
            ];
        }
        return [
            "Product detail images that need extra clarity while still loading fast.",
            "Slide decks and PDFs where embedded photos should stay under heavy weight.",
            "Blog and landing page graphics tuned for Core Web Vitals."
        ];
    }

    function detectLandingContext() {
        var path = (window.location && window.location.pathname ? window.location.pathname : "").toLowerCase();
        var kbMatch = path.match(/compress-image-to-(\d+)kb(?:\.html)?$/);
        if (kbMatch) {
            return { mode: "target", targetKb: Number(kbMatch[1]) };
        }
        if (path.indexOf("bulk-image-compressor") !== -1) {
            return { mode: "bulk", targetKb: null };
        }
        if (path.indexOf("reduce-image-size") !== -1 || path.indexOf("reduce-photo-size") !== -1) {
            return { mode: "reduce", targetKb: null };
        }
        if (path.indexOf("image-compressor") !== -1 || path.indexOf("photo-compressor") !== -1 || path.indexOf("online-photo-compressor") !== -1) {
            return { mode: "generic", targetKb: null };
        }
        if (path.indexOf("compress-jpg") !== -1 || path.indexOf("compress-jpeg") !== -1) {
            return { mode: "filetype", targetKb: 200, fileLabel: "JPG" };
        }
        if (path.indexOf("compress-png") !== -1) {
            return { mode: "filetype", targetKb: 200, fileLabel: "PNG" };
        }
        if (path.indexOf("compress-webp") !== -1) {
            return { mode: "filetype", targetKb: 180, fileLabel: "WEBP" };
        }
        if (path.indexOf("compress-image-for-passport") !== -1) {
            return { mode: "usecase", targetKb: 100, useLabel: "Passport Photo" };
        }
        if (path.indexOf("compress-image-for-online-form") !== -1) {
            return { mode: "usecase", targetKb: 100, useLabel: "Online Form" };
        }
        if (path.indexOf("compress-image-for-government-form") !== -1) {
            return { mode: "usecase", targetKb: 50, useLabel: "Government Form" };
        }
        if (path.indexOf("compress-image-for-job-application") !== -1) {
            return { mode: "usecase", targetKb: 150, useLabel: "Job Application" };
        }
        return { mode: "default", targetKb: null };
    }

    function applyLandingContext(context) {
        var sizeLabel = context.targetKb ? context.targetKb + "KB" : "exact size in KB";
        var titleBase = "SiRa Convert";
        var setHeading = function (html) {
            if (dynamicH1) dynamicH1.innerHTML = html;
        };

        if (context.mode === "target" && context.targetKb) {
            document.title = "Compress Image to " + context.targetKb + "KB Online Free \u2013 " + titleBase;
            setHeading("Compress Image to <span class=\"accent\">" + sizeLabel + "</span> Online");
            setText(howToTitle, "How to Compress Image to " + sizeLabel + " Online");
            setText(howToSubtitle, "Upload a JPG, PNG, or WEBP, set " + sizeLabel + ", and download instantly.");
            setText(seoTitle, "Compress Image to " + sizeLabel + " Online");
            setText(seoSubtitle, "Exact KB targeting for forms, portals, and fast websites.");
            setText(seoCopy,
                "SiRa Convert is a free image compressor online that lets you compress photos to " + sizeLabel +
                " without uploading to a server. Perfect for government forms, passport photos, college and job applications, visa portals, and scholarship submissions that demand strict limits. Designers and developers can reduce image size in KB for faster page loads, while marketers can compress JPG, PNG, or WEBP assets for landing pages and ads. Processing happens locally, so there is no waiting for uploads and your data stays private. Use it as a bulk image compressor to process up to 50 files in one go, then download individually or export a ZIP. With exact KB targeting, you get predictable output for professional and personal use.");
            setText(faqQ1, "How can I compress image to " + sizeLabel + "?");
            setText(faqA1, "Upload your photo, enter " + sizeLabel + " in the KB box, and click Compress. The tool adjusts quality and dimensions to reach about " + sizeLabel + ".");
            setText(sizeNoteTitle, "Why choose " + sizeLabel + "?");
            setText(sizeNoteSubtitle, "Examples of when " + sizeLabel + " works best.");
            setText(sizeNoteBody, "Pick " + sizeLabel + " when you need to pass strict upload limits while keeping enough clarity for IDs, forms, and thumbnails.");
            renderUseCases(getUseCases(context.targetKb, context));
            if (metaDescription) {
                metaDescription.setAttribute("content", "Compress image to " + sizeLabel + " online for free. Reduce photo size to " + sizeLabel + " instantly with fast, private browser compression.");
            }
            targetSizeInput.value = String(context.targetKb);
            updateTargetDisplay();
            if (highClarityToggle && context.targetKb <= 80) {
                highClarityToggle.checked = true;
            }
        } else if (context.mode === "bulk") {
            document.title = "Bulk Image Compressor Online (Up to 50 Photos) \u2013 " + titleBase;
            setHeading("Bulk <span class=\"accent\">Image Compressor</span> Online");
            setText(howToTitle, "How to Bulk Compress Images Online");
            setText(howToSubtitle, "Upload up to 50 images, set one KB target, and batch-compress in the browser.");
            setText(seoTitle, "Bulk Image Compressor for Consistent KB Sizes");
            setText(seoSubtitle, "Process large sets with a single target size and ZIP download.");
            setText(seoCopy,
                "Use SiRa Convert as a bulk image compressor to process up to 50 JPG, PNG, or WEBP files in one session. Set one KB goal, run the batch, and download all images or a ready ZIP. Everything is processed in your browser for privacy, speed, and predictable file sizes across product catalogs, course materials, and gallery uploads.");
            setText(faqQ1, "How can I bulk compress images online?");
            setText(faqA1, "Upload multiple photos, choose a KB target, click Compress, and download all results or a ZIP.");
            setText(sizeNoteTitle, "When to use bulk compression");
            setText(sizeNoteSubtitle, "Keep a consistent KB target across up to 50 photos.");
            setText(sizeNoteBody, "Batch mode is ideal when you need uniform weight for catalogs, course packs, or mass form submissions.");
            renderUseCases(["Unify product photo weights before uploading a collection.", "Prepare training or course images to keep LMS pages fast.", "Export a ready-to-send ZIP for email or drive uploads."]);
        } else if (context.mode === "reduce") {
            document.title = "Reduce Image Size in KB Online \u2013 Free Photo Compressor | " + titleBase;
            setHeading("Reduce Image Size in <span class=\"accent\">KB</span> Online");
            setText(howToTitle, "How to Reduce Image Size Without Losing Quality");
            setText(howToSubtitle, "Pick a KB target that fits your portal and compress directly in the browser.");
            setText(seoTitle, "Reduce Photo Size Without Losing Quality");
            setText(seoSubtitle, "Smart quality tuning keeps clarity while shrinking file weight.");
            setText(seoCopy,
                "SiRa Convert helps you reduce image size in KB while keeping clarity. Adjust the target to match job portals, exam sites, and web performance budgets. Because compression runs in your browser, sensitive IDs and documents never leave your device. Batch support lets you handle multiple uploads at once.");
            setText(faqQ1, "How can I reduce image size in KB online?");
            setText(faqA1, "Upload your image, choose a KB target that meets your requirement, and click Compress to shrink it safely.");
            setText(sizeNoteTitle, "Best targets to reduce photo size");
            setText(sizeNoteSubtitle, "Stay sharp while dropping file weight.");
            setText(sizeNoteBody, "Aim for 80–200KB for a balance of clarity and speed on most portals and landing pages.");
            renderUseCases(["Move photos under portal caps without visible blur.", "Improve Core Web Vitals by lightening hero images.", "Send lighter email attachments that still look crisp."]);
        } else if (context.mode === "filetype") {
            var label = context.fileLabel || "Image";
            document.title = "Compress " + label + " Image Online Free \u2013 " + titleBase;
            setHeading("Compress <span class=\"accent\">" + label + "</span> Image Online");
            setText(howToTitle, "How to Compress " + label + " Files Online");
            setText(howToSubtitle, "Upload one or more " + label + " images, choose a KB target, and compress in the browser.");
            setText(seoTitle, "Compress " + label + " Without Losing Quality");
            setText(seoSubtitle, "Browser-based compression for " + label + " photos, screenshots, and assets.");
            setText(seoCopy,
                "SiRa Convert is a free image compressor online that supports " + label + " files along with PNG and WEBP. Pick a KB target such as 100KB or 200KB, then run batch compression locally in your browser for privacy and speed. Great for resumes, forms, and web uploads where " + label + " files must stay small.");
            setText(faqQ1, "How can I compress a " + label + " image online?");
            setText(faqA1, "Upload your " + label + " file, set a KB target, and click Compress to download a lighter version.");
            setText(sizeNoteTitle, "Why compress " + label + " files?");
            setText(sizeNoteSubtitle, label + " compression tips");
            setText(sizeNoteBody, "Most " + label + " uploads pass portals at 100–250KB while staying sharp. Choose tighter caps for forms, higher caps for product shots.");
            renderUseCases(getUseCases(context.targetKb, context));
            if (context.targetKb) {
                targetSizeInput.value = String(context.targetKb);
                updateTargetDisplay();
            }
        } else if (context.mode === "usecase") {
            var useLabel = context.useLabel || "Forms";
            document.title = "Compress Image for " + useLabel + " \u2013 Free Online Tool | " + titleBase;
            setHeading("Compress Image for <span class=\"accent\">" + useLabel + "</span>");
            setText(howToTitle, "How to Compress Image for " + useLabel);
            setText(howToSubtitle, "Upload, set the KB limit, and download a file that passes portal checks.");
            setText(seoTitle, "Compress Photos for " + useLabel + " Requirements");
            setText(seoSubtitle, "Hit strict KB limits for " + useLabel.toLowerCase() + " uploads.");
            setText(seoCopy,
                "SiRa Convert helps you compress images for " + useLabel.toLowerCase() + " by setting an exact KB cap. Keep quality while meeting portal rules for IDs, passports, government paperwork, or hiring systems. All processing stays on your device, so sensitive documents remain private. Batch up to 50 images and export a ZIP when you are done.");
            setText(faqQ1, "How can I compress image for " + useLabel + "?");
            setText(faqA1, "Upload your image, set the KB limit required for " + useLabel.toLowerCase() + ", and click Compress to get a compliant file.");
            setText(sizeNoteTitle, "KB tips for " + useLabel);
            setText(sizeNoteSubtitle, "Hit the required size the first time.");
            setText(sizeNoteBody, "Set a KB cap that matches your portal guidelines, then preview and download instantly without server uploads.");
            renderUseCases(getUseCases(context.targetKb, context));
            if (context.targetKb) {
                targetSizeInput.value = String(context.targetKb);
                updateTargetDisplay();
            }
        } else {
            document.title = "Compress Image to Exact KB Online (20KB, 50KB, 100KB) | " + titleBase;
            setHeading("Compress Image to Exact Size in <span class=\"accent\">KB</span>");
            setText(sizeNoteTitle, "Choose the right KB target");
            setText(sizeNoteSubtitle, "Quick tips to balance quality and size.");
            setText(sizeNoteBody, "Pick 20–80KB for strict forms, 100–200KB for balanced uploads, and 250KB+ for sharper previews.");
            renderUseCases(["20–80KB for forms and IDs", "100–200KB for job portals and LinkedIn", "250KB+ for product/portfolio clarity"]);
        }

        updateStructuredData(context);
        setCanonicalToCurrent();
        return context;
    }

    function updateStructuredData(context) {
        var script = document.getElementById("seo-structured-data");
        if (!script) return;
        try {
            var data = JSON.parse(script.textContent);
            var sizeLabel = context.targetKb ? context.targetKb + "KB" : "your target KB";

            data["@graph"].forEach(function (node) {
                if (node["@type"] === "SoftwareApplication") {
                    node.featureList = [
                        "Compress image to exact size in KB",
                        "Compress image to 20KB, 50KB, 100KB" + (context.targetKb ? " (" + sizeLabel + " focus)" : ""),
                        "Bulk image compressor up to 50 files",
                        "Browser-based, private processing",
                        "Supports JPG, PNG, WEBP"
                    ];
                }
                if (node["@type"] === "FAQPage" && node.mainEntity && node.mainEntity[0]) {
                    node.mainEntity[0].name = "How can I compress image to " + sizeLabel + "?";
                    node.mainEntity[0].acceptedAnswer.text = "Upload your image, enter " + sizeLabel + " in the KB box, and click Compress to reach that size.";
                }
                if (node["@type"] === "HowTo") {
                    node.name = "Compress image to " + sizeLabel + " online";
                    node.description = "Use SiRa Convert to compress a photo to " + sizeLabel + " directly in the browser.";
                    if (node.step && node.step[1]) {
                        node.step[1].text = "Type " + sizeLabel + " or another KB value.";
                    }
                }
            });

            script.textContent = JSON.stringify(data, null, 2);
        } catch (error) {
            console.warn("Structured data update skipped:", error);
        }
    }

    function updatePresetState(targetKb) {
        Array.prototype.forEach.call(presetButtons, function (button) {
            var isActive = Number(button.getAttribute("data-size")) === targetKb;
            button.classList.toggle("is-active", isActive);
        });
    }

    function updateTargetAssist() {
        var targetKb = getTargetKb();
        var recommendedMinimumKb = getRecommendedMinimumKb();

        if (targetDisplay) {
            targetDisplay.textContent = targetKb + " KB";
        }
        targetWarning.hidden = state.files.length === 0 || targetKb >= recommendedMinimumKb;
        targetWarning.textContent = "This target is very small for the current images and may noticeably reduce image quality.";
        updatePresetState(targetKb);
    }

    function setProgress(current, total) {
        var percent = total > 0 ? Math.round((current / total) * 100) : 0;
        progressBar.style.width = percent + "%";
    }

    function updateDownloadAllVisibility() {
        var readyItems = state.files.filter(function (file) {
            return !!file.compressedFile;
        });
        var showZipButton = !state.isProcessing &&
            state.files.length > 1 &&
            readyItems.length === state.files.length &&
            !!state.zipArchive;
        downloadAllBtn.hidden = !showZipButton;
    }

    function openPicker() {
        if (!state.isProcessing) {
            imageInput.click();
        }
    }

    function revokeResultUrls() {
        state.resultUrls.forEach(function (url) {
            URL.revokeObjectURL(url);
        });
        state.resultUrls = [];
    }

    function revokeSourceUrls() {
        state.files.forEach(function (item) {
            if (item.originalPreviewUrl) {
                URL.revokeObjectURL(item.originalPreviewUrl);
                item.originalPreviewUrl = "";
            }
        });
    }

    function removeFileAt(index) {
        var item = state.files[index];
        if (!item || state.isProcessing) return;

        if (item.originalPreviewUrl) {
            URL.revokeObjectURL(item.originalPreviewUrl);
        }
        if (item.downloadUrl) {
            URL.revokeObjectURL(item.downloadUrl);
            state.resultUrls = state.resultUrls.filter(function (url) {
                return url !== item.downloadUrl;
            });
        }

        state.files.splice(index, 1);
        imageInput.value = "";
        if (inlineAlert) inlineAlert.clear();
        resetResults();
        statusText.textContent = state.files.length > 0
            ? state.files.length + (state.files.length === 1 ? " image ready for compression." : " images ready for compression.")
            : "Waiting for image upload.";
        syncSummary();
    }

    function renderPreviewRail() {
        previewRail.innerHTML = "";

        if (state.files.length === 0) {
            return;
        }
        var fragment = document.createDocumentFragment();

        var addMoreCard = document.createElement("article");
        addMoreCard.className = "add-more-card";
        addMoreCard.innerHTML =
            '<button type="button" aria-label="Upload more photos">' +
                '<span class="add-icon">+</span>' +
                '<span>Add more</span>' +
            '</button>';
        addMoreCard.querySelector("button").addEventListener("click", function (event) {
            event.stopPropagation();
            openPicker();
        });
        fragment.appendChild(addMoreCard);

        state.files.forEach(function (item, itemIndex) {
            var card = document.createElement("article");
            var activePreviewUrl = item.compressedFile && item.downloadUrl ? item.downloadUrl : item.originalPreviewUrl;
            var activeState = item.compressedFile ? "Compressed" : "Original";
            var activeSize = item.compressedFile ? item.compressedFile.size : item.size;

            card.className = "preview-card";
            card.innerHTML =
                '<button class="preview-remove" type="button" aria-label="Remove photo">×</button>' +
                '<div class="preview-frame"><img src="' + activePreviewUrl + '" alt="' + escapeHtml(item.name) + '"></div>' +
                '<div class="preview-body">' +
                    '<div class="preview-meta-row">' +
                        '<span class="preview-state">' + activeState + '</span>' +
                        '<span class="preview-format">' + formatFileType(item.type) + '</span>' +
                    '</div>' +
                    '<strong>' + escapeHtml(item.name) + '</strong>' +
                    '<div class="preview-meta">' +
                        '<div class="preview-meta-line"><span>Current size</span><span>' + bytesToReadable(activeSize) + '</span></div>' +
                        '<div class="preview-meta-line"><span>Source size</span><span>' + bytesToReadable(item.size) + '</span></div>' +
                    '</div>' +
                '</div>';

            card.querySelector(".preview-remove").addEventListener("click", function (event) {
                event.stopPropagation();
                removeFileAt(itemIndex);
            });
            fragment.appendChild(card);
        });
        previewRail.appendChild(fragment);
    }

    function updateStepIndicator() {
        var stepOrder = ["upload", "preview", "result"];
        var activeIndex = stepOrder.indexOf(state.currentStep);

        Array.prototype.forEach.call(stepChips, function (chip, index) {
            chip.classList.toggle("is-active", index === activeIndex);
            chip.classList.toggle("is-complete", index < activeIndex);
        });

        Array.prototype.forEach.call(stepLines, function (line, index) {
            line.classList.toggle("is-active", index < activeIndex);
        });
    }

    function showStep(stepName) {
        state.currentStep = stepName;
        stepUpload.hidden = stepName !== "upload";
        stepPreview.hidden = stepName !== "preview";
        resultsPanel.hidden = stepName !== "result";
        resultsTryAnotherBtn.hidden = stepName !== "result";
        updateStepIndicator();
    }

    function updateLayoutMode() {
        progressWrap.hidden = !state.isProcessing;

        if (state.currentStep === "result") {
            showStep("result");
            return;
        }

        if (state.files.length > 0) {
            showStep("preview");
            return;
        }

        showStep("upload");
    }

    function syncSummary() {
        var totalBytes = state.files.reduce(function (sum, file) {
            return sum + file.size;
        }, 0);
        var readyItems = state.files.filter(function (file) {
            return !!file.compressedFile;
        });
        fileCountEl.textContent = state.files.length + (state.files.length === 1 ? " file selected" : " files selected");
        totalSizeEl.textContent = bytesToReadable(totalBytes) + " total";
        compressBtn.disabled = state.files.length === 0 || state.isProcessing;
        clearBtn.disabled = state.isProcessing;
        clearBtn.hidden = state.files.length === 0 && !state.isProcessing;
        resultsInfo.textContent = readyItems.length > 0
            ? readyItems.length + "/" + state.files.length + " images compressed."
            : (state.files.length > 0 ? "Images added. Run compression to see results." : "Upload image files and set a target size to begin.");
        renderPreviewRail();
        updateTargetAssist();
        updateLayoutMode();
        updateDownloadAllVisibility();
    }

    function resetResults() {
        revokeResultUrls();
        resultsEl.innerHTML = "";
        resultSummaryList.innerHTML = "";
        resultSummaryList.hidden = true;
        resultsInfo.textContent = "Upload image files and set a target size to begin.";
        state.zipArchive = null;
        state.zipTargetKb = 0;
        setProgress(0, 0);
        updateLayoutMode();
        updateDownloadAllVisibility();
    }

    function clearAll() {
        revokeSourceUrls();
        state.files = [];
        state.isProcessing = false;
        state.currentStep = "upload";
        imageInput.value = "";
        statusText.textContent = "Waiting for image upload.";
        compressBtn.innerHTML = defaultCompressLabel;
        if (inlineAlert) inlineAlert.clear();
        resetResults();
        syncSummary();
    }

    function sanitizeFiles(fileList) {
        var accepted = [];
        var rejected = 0;
        var remainingSlots = Math.max(0, maxBulkFiles - state.files.length);

        Array.prototype.forEach.call(fileList, function (file) {
            if (accepted.length >= remainingSlots) {
                rejected += 1;
                return;
            }
            if (file && typeof file.type === "string" && file.type.startsWith("image/")) {
                accepted.push({
                    file: file,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    originalWidth: 0,
                    originalHeight: 0,
                    compressedFile: null,
                    compressedWidth: 0,
                    compressedHeight: 0,
                    originalPreviewUrl: URL.createObjectURL(file),
                    downloadUrl: ""
                });
            } else {
                rejected += 1;
            }
        });

        if (rejected > 0) {
            notify("error", state.files.length + accepted.length >= maxBulkFiles
                ? "Only the first " + maxBulkFiles + " images can be added to one batch."
                : "Invalid File: only image uploads are allowed.");
        }

        return accepted;
    }

    function renderResultSummary(readyItems) {
        resultSummaryList.innerHTML = "";

        if (!readyItems || readyItems.length === 0) {
            resultSummaryList.hidden = true;
            return;
        }

        readyItems.forEach(function (item) {
            var row = document.createElement("div");
            row.className = "result-summary-row";
            row.innerHTML =
                '<span class="result-summary-name">' + escapeHtml(item.name) + ' →</span>' +
                '<span class="result-summary-size">' + bytesToReadable(item.compressedFile.size) + '</span>';
            resultSummaryList.appendChild(row);
        });

        resultSummaryList.hidden = false;
    }

    function renderResults() {
        resultsEl.innerHTML = "";

        var readyItems = state.files.filter(function (item) {
            return !!item.compressedFile;
        });

        if (readyItems.length === 0) {
            renderResultSummary(readyItems);
            syncSummary();
            return;
        }

        renderResultSummary(readyItems);
        var fragment = document.createDocumentFragment();

        readyItems.forEach(function (item) {
            var safeName = escapeHtml(item.name);
            var card = document.createElement("article");
            card.className = "result-card";
            card.innerHTML =
                '<div class="result-compact">' +
                    '<div class="result-thumb"><img src="' + item.downloadUrl + '" alt="' + safeName + ' compressed preview"></div>' +
                    '<div class="result-body">' +
                        '<p class="result-name">' + safeName + '</p>' +
                        '<div class="result-meta">' +
                            '<div class="result-spec">' +
                                '<span class="result-label">Compressed</span>' +
                                '<div class="result-spec-line"><span>Size</span><strong>' + bytesToReadable(item.compressedFile.size) + '</strong></div>' +
                                '<div class="result-spec-line"><span>Pixels</span><strong>' + formatDimensions(item.compressedWidth, item.compressedHeight) + '</strong></div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="result-actions-row">' +
                            '<button class="btn btn-primary result-download" type="button">Download</button>' +
                            '<button class="result-toggle" type="button" aria-expanded="false">Full Preview</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="result-preview-drawer" hidden>' +
                    '<div class="result-compare" style="--compare-position:50%;">' +
                        '<div class="compare-stage">' +
                            '<div class="compare-image"><img src="' + item.originalPreviewUrl + '" alt="' + safeName + ' original preview"></div>' +
                            '<div class="compare-overlay"><img src="' + item.downloadUrl + '" alt="' + safeName + ' compressed preview"></div>' +
                            '<span class="compare-label compare-label-original">Original</span>' +
                            '<span class="compare-label compare-label-compressed">Compressed</span>' +
                            '<div class="compare-divider" aria-hidden="true"><span class="compare-handle">↔</span></div>' +
                            '<input class="compare-range" type="range" min="0" max="100" value="50" aria-label="Compare original and compressed image">' +
                        '</div>' +
                    '</div>' +
                '</div>';

            card.querySelector(".result-download").addEventListener("click", function () {
                var link = document.createElement("a");
                link.href = item.downloadUrl;
                link.download = getCompressedFilename(item, item.compressedFile);
                link.click();
            });
            card.querySelector(".result-toggle").addEventListener("click", function () {
                var drawer = card.querySelector(".result-preview-drawer");
                var isOpen = !drawer.hidden;
                drawer.hidden = isOpen;
                this.textContent = isOpen ? "Full Preview" : "Hide Preview";
                this.setAttribute("aria-expanded", String(!isOpen));
            });

            initComparisonSlider(card);
            fragment.appendChild(card);
        });
        resultsEl.appendChild(fragment);

        updateDownloadAllVisibility();
    }

    function initComparisonSlider(card) {
        var compareRoot = card.querySelector(".result-compare");
        var range = card.querySelector(".compare-range");

        if (!compareRoot || !range) return;

        function updatePosition() {
            compareRoot.style.setProperty("--compare-position", range.value + "%");
        }

        range.addEventListener("input", updatePosition);
        range.addEventListener("change", updatePosition);
        updatePosition();
    }

    function updateTargetDisplay() {
        var normalizedTargetKb = getTargetKb();
        targetSizeInput.value = String(normalizedTargetKb);
        updateTargetAssist();
    }

    function addFiles(fileList) {
        var nextFiles = sanitizeFiles(fileList);
        if (nextFiles.length === 0) {
            syncSummary();
            return;
        }

        state.files = state.files.concat(nextFiles);
        state.files.forEach(function (item) {
            item.compressedFile = null;
            item.downloadUrl = "";
        });
        state.currentStep = "preview";
        statusText.textContent = state.files.length + (state.files.length === 1 ? " image ready for compression." : " images ready for compression.") + " Target size applies to each image.";
        if (inlineAlert) inlineAlert.clear();
        resetResults();
        syncSummary();
    }

    function getCompressedFilename(item, blob) {
        var name = item.name || "image";
        var extMatch = name.match(/\.([a-z0-9]+)$/i);
        var ext = extMatch ? extMatch[1].toLowerCase() : "";
        if (blob && typeof blob.type === "string") {
            if (blob.type === "image/jpeg") ext = "jpg";
            if (blob.type === "image/png") ext = "png";
            if (blob.type === "image/webp") ext = "webp";
        }
        var base = extMatch ? name.slice(0, -extMatch[0].length) : name;
        return base + " siracompressor" + (ext ? "." + ext : "");
    }

    async function downloadAllAsZip() {
        if (!state.zipArchive || state.isProcessing) return;

        downloadAllBtn.disabled = true;
        statusText.innerHTML = '<span class="spinner" aria-hidden="true"></span>Building ZIP download...';

        try {
            var zipBlob = await state.zipArchive.generateAsync({ type: "blob" });
            var zipUrl = URL.createObjectURL(zipBlob);
            var link = document.createElement("a");
            link.href = zipUrl;
            link.download = "compressed-images-" + state.zipTargetKb + "kb.zip";
            link.click();
            setTimeout(function () {
                URL.revokeObjectURL(zipUrl);
            }, 2000);
            statusText.textContent = "ZIP download is ready.";
        } catch (error) {
            console.error("ZIP generation failed", error);
            notify("error", "Could not generate the ZIP archive.");
            statusText.textContent = "ZIP export failed.";
        } finally {
            downloadAllBtn.disabled = false;
            updateDownloadAllVisibility();
        }
    }

    async function compressAll() {
        if (state.files.length === 0 || state.isProcessing) return;
        if (typeof JSZip !== "function") {
            notify("error", "ZIP library failed to load.");
            return;
        }

        state.isProcessing = true;
        state.currentStep = "preview";
        compressBtn.disabled = true;
        compressBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Compressing...';
        resultsEl.innerHTML = "";
        revokeResultUrls();
        state.zipArchive = null;
        if (inlineAlert) inlineAlert.clear();

        var targetKb = getTargetKb();
        var clarityBoost = highClarityToggle && highClarityToggle.checked ? 1.15 : 1;
        var targetBytes = targetKb * 1024 * clarityBoost;
        var toleranceBytes = getToleranceBytes(targetBytes);
        var zip = new JSZip();
        var completed = 0;

        state.zipTargetKb = targetKb;
        state.files.forEach(function (item) {
            item.compressedFile = null;
            item.downloadUrl = "";
        });

        statusText.innerHTML = '<span class="spinner" aria-hidden="true"></span>Processing 0/' + state.files.length + ' images...';
        resultsInfo.textContent = "Compression in progress for " + state.files.length + " images.";
        setProgress(0, state.files.length);
        updateLayoutMode();
        updateDownloadAllVisibility();

        for (var index = 0; index < state.files.length; index += 1) {
            var item = state.files[index];

            try {
                // Process files sequentially to avoid freezing the page on larger batches.
                var compressedResult = await compressImageToTarget(item.file, targetBytes, {
                    toleranceBytes: toleranceBytes
                });
                var compressed = compressedResult.file;

                item.compressedFile = compressed;
                item.originalWidth = compressedResult.originalWidth;
                item.originalHeight = compressedResult.originalHeight;
                item.compressedWidth = compressedResult.compressedWidth;
                item.compressedHeight = compressedResult.compressedHeight;
                item.downloadUrl = URL.createObjectURL(compressed);
                state.resultUrls.push(item.downloadUrl);
                zip.file(getCompressedFilename(item, compressed), compressed);
                completed += 1;
                setProgress(index + 1, state.files.length);
                renderPreviewRail();
                statusText.textContent = "Processing " + (index + 1) + "/" + state.files.length + " images... " + completed + " complete.";
            } catch (error) {
                console.error("Compression failed for", item.name, error);
                notify("error", "Could not compress " + item.name + " close to " + targetKb + " KB.");
                setProgress(index + 1, state.files.length);
                renderPreviewRail();
                statusText.textContent = "Processing " + (index + 1) + "/" + state.files.length + " images... " + completed + " complete.";
            }
        }

        state.isProcessing = false;
        compressBtn.innerHTML = defaultCompressLabel;
        state.zipArchive = completed === state.files.length ? zip : null;
        if (completed > 0) {
            state.currentStep = "result";
        }
        statusText.textContent = completed === state.files.length
            ? "Compression complete. " + completed + "/" + state.files.length + " images ready."
            : "Compression finished with " + completed + "/" + state.files.length + " images ready.";
        renderResults();
        syncSummary();
        if (completed === state.files.length) {
            notify("info", "All images are ready to download.");
        }
    }

    function bindDropZone() {
        uploadBtn.addEventListener("click", openPicker);
        dropZone.addEventListener("click", function (event) {
            if (event.target.closest("button")) return;
            if (state.currentStep === "upload" && !state.isProcessing) {
                openPicker();
            }
        });
        dropZone.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                if (state.currentStep === "upload" && !state.isProcessing) {
                    openPicker();
                }
            }
        });

        ["dragenter", "dragover"].forEach(function (eventName) {
            dropZone.addEventListener(eventName, function (event) {
                event.preventDefault();
                dropZone.classList.add("dragging");
            });
        });

        ["dragleave", "dragend", "drop"].forEach(function (eventName) {
            dropZone.addEventListener(eventName, function (event) {
                event.preventDefault();
                dropZone.classList.remove("dragging");
            });
        });

        dropZone.addEventListener("drop", function (event) {
            if (state.isProcessing) return;
            addFiles(event.dataTransfer.files);
        });
    }

    imageInput.addEventListener("change", function (event) {
        addFiles(event.target.files);
    });
    clearBtn.addEventListener("click", clearAll);
    compressBtn.addEventListener("click", compressAll);
    downloadAllBtn.addEventListener("click", downloadAllAsZip);
    resultsTryAnotherBtn.addEventListener("click", clearAll);
    targetSizeInput.addEventListener("input", updateTargetDisplay);
    Array.prototype.forEach.call(presetButtons, function (button) {
        button.addEventListener("click", function () {
            targetSizeInput.value = button.getAttribute("data-size");
            updateTargetDisplay();
            targetSizeInput.focus();
        });
    });

    function loadImageElement(file) {
        return new Promise(function (resolve, reject) {
            var image = new Image();
            var objectUrl = URL.createObjectURL(file);

            function cleanup() {
                URL.revokeObjectURL(objectUrl);
            }

            image.onload = function () {
                cleanup();
                resolve(image);
            };
            image.onerror = function () {
                cleanup();
                reject(new Error("Image decode failed."));
            };
            image.src = objectUrl;
        });
    }

    function canvasToBlob(canvas, mimeType, quality) {
        return new Promise(function (resolve, reject) {
            canvas.toBlob(function (blob) {
                if (blob) {
                    resolve(blob);
                    return;
                }
                reject(new Error("Canvas export failed."));
            }, mimeType, quality);
        });
    }

    async function compressImageToTarget(file, targetBytes, options) {
        var targetKb = Math.max(1, Math.round(targetBytes / 1024));
        var result = await smartCompressPWA(file, targetKb);
        return {
            file: new File([result.blob], getCompressedFilename({ name: file.name }, { type: "image/jpeg" }), {
                type: "image/jpeg",
                lastModified: Date.now()
            }),
            originalWidth: result.width,
            originalHeight: result.height,
            compressedWidth: result.width,
            compressedHeight: result.height
        };
    }

    function fitWithin(w, h, maxW) {
        if (w <= maxW) return { w: w, h: h };
        var scale = maxW / w;
        return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
    }

    async function smartCompressPWA(file, targetKb) {
        var image = await loadImageElement(file);
        var supportsWebp = await detectWebpSupport();
        var mimeType = supportsWebp ? "image/webp" : "image/jpeg";
        var targetBytes = Math.max(1024, targetKb * 1024);

        // Stage 1: Smart-Scale Strategy
        var srcW = image.naturalWidth || image.width;
        var srcH = image.naturalHeight || image.height;
        var maxW = 1920;
        if (targetKb < 300) maxW = 1600;
        if (targetKb < 100) maxW = 1200;
        // if target too small for resolution, force downscale
        if (targetKb < (srcW * srcH) / 10000) {
            maxW = Math.min(maxW, 1600);
        }
        var dims = fitWithin(srcW, srcH, maxW);
        var currentW = dims.w;
        var currentH = dims.h;

        var canvas = createCanvas(currentW, currentH);
        var ctx = canvas.getContext("2d", { colorSpace: "srgb", willReadFrequently: true });
        if (!ctx) throw new Error("Canvas context unavailable.");

        function redraw() {
            canvas.width = currentW;
            canvas.height = currentH;
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.filter = "saturate(1.10) contrast(1.02) brightness(1.01) blur(0px)";
            ctx.clearRect(0, 0, currentW, currentH);
            ctx.drawImage(image, 0, 0, currentW, currentH);
            ctx.filter = "none";
            applySharpen(ctx, currentW, currentH);
        }

        redraw();

        async function encode(q) {
            if (typeof canvas.convertToBlob === "function") {
                return canvas.convertToBlob({ type: mimeType, quality: q });
            }
            return canvasToBlob(canvas, mimeType, q);
        }

        // Stage 3: High-Precision Binary Search Loop
        var q = 0.95;
        var bestBlob = null;
        var bestDiff = Infinity;

        for (var i = 0; i < 8; i += 1) {
            var blob = await encode(q);
            var diff = blob.size - targetBytes;

            if (diff <= 0 && Math.abs(diff) < bestDiff) {
                bestBlob = blob;
                bestDiff = Math.abs(diff);
            }

            if (diff > 0) {
                q = Math.max(0.1, q - 0.05);
                if (q <= 0.6) {
                    currentW = Math.max(64, Math.round(currentW * 0.9));
                    currentH = Math.max(64, Math.round(currentH * 0.9));
                    redraw();
                    q = 0.8;
                }
            } else {
                q = Math.min(0.95, q + 0.03);
            }
        }

        if (!bestBlob) {
            bestBlob = await encode(q);
        }

        return { blob: bestBlob, width: currentW, height: currentH };
    }

    function createCanvas(w, h) {
        if (typeof OffscreenCanvas === "function") {
            return new OffscreenCanvas(w, h);
        }
        var c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        return c;
    }

    function applySharpen(ctx, width, height) {
        var imageData = ctx.getImageData(0, 0, width, height);
        var data = imageData.data;
        var w = width;
        var h = height;
        var kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];
        var output = new Uint8ClampedArray(data);
        for (var y = 1; y < h - 1; y++) {
            for (var x = 1; x < w - 1; x++) {
                for (var c = 0; c < 3; c++) {
                    var i = (y * w + x) * 4 + c;
                    var sum =
                        data[i - 4 - w * 4] * kernel[0] +
                        data[i - w * 4] * kernel[1] +
                        data[i + 4 - w * 4] * kernel[2] +
                        data[i - 4] * kernel[3] +
                        data[i] * kernel[4] +
                        data[i + 4] * kernel[5] +
                        data[i - 4 + w * 4] * kernel[6] +
                        data[i + w * 4] * kernel[7] +
                        data[i + 4 + w * 4] * kernel[8];
                    output[i] = Math.min(255, Math.max(0, sum));
                }
                var aIndex = (y * w + x) * 4 + 3;
                output[aIndex] = data[aIndex];
            }
        }
        imageData.data.set(output);
        ctx.putImageData(imageData, 0, 0);
    }

    function clamp255(v) {
        return v < 0 ? 0 : (v > 255 ? 255 : v);
    }

    async function detectWebpSupport() {
        if (typeof document === "undefined") return true; // assume yes in worker
        var canvas = document.createElement("canvas");
        if (!canvas.getContext) return false;
        return canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
    }

    var landingContext = applyLandingContext(detectLandingContext());

    bindDropZone();
    updateTargetDisplay();
    syncSummary();

    if (window.SiRaShared) {
        window.SiRaShared.initTheme();
        window.SiRaShared.initUserMenu();
        window.SiRaShared.initAuthBridge();
        window.SiRaShared.registerServiceWorker();
        window.SiRaShared.initInstallPrompt({ notify: function (message) { notify("info", message); } });
    }
})();
