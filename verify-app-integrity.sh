#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

failures=0

pass() { printf '[PASS] %s\n' "$1"; }
fail() { printf '[FAIL] %s\n' "$1"; failures=$((failures + 1)); }

require_file() {
  local path="$1"
  if [[ -f "$path" ]]; then
    pass "File exists: $path"
  else
    fail "Missing file: $path"
  fi
}

check_required_ids() {
  local html="$1"; shift
  local id
  for id in "$@"; do
    if rg -q "id=\"$id\"" "$html"; then
      pass "$html has id=\"$id\""
    else
      fail "$html missing id=\"$id\""
    fi
  done
}

check_js_html_id_bindings() {
  local js="$1"
  local html="$2"
  local missing=0
  while IFS= read -r id; do
    [[ -z "$id" ]] && continue
    if ! rg -q "id=\"$id\"" "$html"; then
      printf '  - Missing id in %s: %s\n' "$html" "$id"
      missing=1
    fi
  done < <(
    rg -o 'getElementById\(\"[^\"]+\"\)' "$js" \
      | sed -E 's/getElementById\(\"([^\"]+)\"\)/\1/' \
      | sort -u
  )

  if [[ "$missing" -eq 0 ]]; then
    pass "All getElementById bindings in $js exist in $html"
  else
    fail "Broken getElementById bindings between $js and $html"
  fi
}

check_internal_links() {
  local html="$1"
  local missing=0

  while IFS= read -r href; do
    href="${href%%\?*}"
    href="${href%%#*}"
    [[ -z "$href" ]] && continue
    if [[ "$href" =~ ^https?://|^mailto:|^tel:|^javascript: ]]; then
      continue
    fi
    if [[ ! -f "$href" ]]; then
      printf '  - Broken href in %s: %s\n' "$html" "$href"
      missing=1
    fi
  done < <(
    rg -o 'href=\"[^\"]+\"' "$html" \
      | sed -E 's/href=\"([^\"]+)\"/\1/'
  )

  if [[ "$missing" -eq 0 ]]; then
    pass "All internal links in $html resolve to existing files"
  else
    fail "Broken internal links found in $html"
  fi
}

check_required_contains() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  if rg -q "$pattern" "$file"; then
    pass "$label"
  else
    fail "$label"
  fi
}

echo "== SiRa App Integrity Check =="

for file in \
  index.html index.js shared-ui.js \
  jpg-to-pdf.html jpg-to-pdf.js \
  pdf-to-jpg.html pdf-to-jpg.js \
  merge-pdf.html merge-pdf.js \
  about.html blog.html privacy.html terms.html \
  style.css sw.js manifest.json offline.html
do
  require_file "$file"
done

echo
echo "== Core tab/page links on homepage =="
check_required_ids index.html \
  themeToggleBtn profileBox userMenu installFooterPanel installAppBtn installNotice

for href in jpg-to-pdf.html pdf-to-jpg.html merge-pdf.html about.html privacy.html terms.html blog.html; do
  if rg -q "href=\"$href\"" index.html; then
    pass "index.html links to $href"
  else
    fail "index.html missing link to $href"
  fi
done

echo
echo "== Login/auth continuity checks =="
check_required_contains index.js "AUTH_STORAGE_KEY" "index.js stores auth user cache key"
check_required_contains index.js "sira-auth-user" "index.js writes auth state to localStorage"
check_required_contains shared-ui.js "initAuthBridge" "shared-ui.js exposes auth bridge"
check_required_contains shared-ui.js "loginFromToolLink" "shared-ui.js reads tool login link"
check_required_contains jpg-to-pdf.js "initAuthBridge" "jpg-to-pdf.js initializes auth bridge"
check_required_contains pdf-to-jpg.js "initAuthBridge" "pdf-to-jpg.js initializes auth bridge"
check_required_contains merge-pdf.js "initAuthBridge" "merge-pdf.js initializes auth bridge"
check_required_ids jpg-to-pdf.html userNameDisplay userEmailDisplay loginFromToolLink logoutBtn
check_required_ids pdf-to-jpg.html userNameDisplay userEmailDisplay loginFromToolLink logoutBtn
check_required_ids merge-pdf.html userNameDisplay userEmailDisplay loginFromToolLink logoutBtn

echo
echo "== PWA checks =="
check_required_contains manifest.json "\"display\": \"standalone\"" "Manifest has standalone display"
check_required_contains manifest.json "\"start_url\":" "Manifest defines start_url"
check_required_contains manifest.json "\"scope\":" "Manifest defines scope"
check_required_contains manifest.json "\"icons\":" "Manifest defines icons"
check_required_contains sw.js "offline.html" "Service worker references offline fallback"
check_required_contains shared-ui.js "registerServiceWorker" "Shared service worker registration helper exists"
check_required_contains shared-ui.js "installHeaderBanner" "Shared install logic supports header banner"
check_required_contains index.html "rel=\"manifest\"" "index.html links manifest"
check_required_contains jpg-to-pdf.html "rel=\"manifest\"" "jpg-to-pdf.html links manifest"
check_required_contains pdf-to-jpg.html "rel=\"manifest\"" "pdf-to-jpg.html links manifest"
check_required_contains merge-pdf.html "rel=\"manifest\"" "merge-pdf.html links manifest"
check_required_ids index.html installHeaderBanner installHeaderText installHeaderAction installHeaderClose
check_required_ids jpg-to-pdf.html installHeaderBanner installHeaderText installHeaderAction installHeaderClose
check_required_ids pdf-to-jpg.html installHeaderBanner installHeaderText installHeaderAction installHeaderClose
check_required_ids merge-pdf.html installHeaderBanner installHeaderText installHeaderAction installHeaderClose

echo
echo "== SEO baseline checks =="
for page in index.html jpg-to-pdf.html pdf-to-jpg.html merge-pdf.html; do
  check_required_contains "$page" "name=\"description\"" "$page has meta description"
  check_required_contains "$page" "rel=\"canonical\"" "$page has canonical link"
  check_required_contains "$page" "property=\"og:title\"" "$page has Open Graph title"
  check_required_contains "$page" "property=\"og:description\"" "$page has Open Graph description"
  check_required_contains "$page" "property=\"og:image:alt\"" "$page has Open Graph image alt"
  check_required_contains "$page" "name=\"twitter:card\"" "$page has Twitter card"
  check_required_contains "$page" "name=\"twitter:image:alt\"" "$page has Twitter image alt"
  check_required_contains "$page" "name=\"application-name\"" "$page has application-name meta"
done

echo
echo "== JS -> HTML binding checks =="
check_js_html_id_bindings index.js index.html
check_js_html_id_bindings jpg-to-pdf.js jpg-to-pdf.html
check_js_html_id_bindings pdf-to-jpg.js pdf-to-jpg.html
check_js_html_id_bindings merge-pdf.js merge-pdf.html

echo
echo "== Required tool controls =="
check_required_ids jpg-to-pdf.html \
  imageInput dropZone uploadBtn pasteBtn convertBtn clearBtn downloadPdfBtn sharePdfBtn
check_required_ids pdf-to-jpg.html \
  pdfInput dropZone uploadBtn pasteBtn convertBtn clearBtn downloadZipBtn downloadAllBtn shareZipBtn
check_required_ids merge-pdf.html \
  pdfInput dropZone uploadBtn pasteBtn mergeBtn clearBtn downloadPdfBtn sharePdfBtn

echo
echo "== Link integrity checks =="
for page in *.html; do
  check_internal_links "$page"
done

echo
if [[ "$failures" -eq 0 ]]; then
  printf 'Integrity check complete: 0 failures.\n'
  exit 0
fi

printf 'Integrity check complete: %d failure(s).\n' "$failures"
exit 1
