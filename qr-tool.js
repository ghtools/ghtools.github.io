/* =========================================================
   ResumQR — QR Tool Logic (v2, resilient)
   Loads the small 'qrcode-generator' library (kazuhikoarase) with
   automatic retries, then draws the QR modules onto our own canvas —
   this gives full control over color/size/margin and needs only a
   tiny (~6KB) external dependency instead of a larger bundle.
   ========================================================= */
(() => {
  'use strict';

  const QR_LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.2/qrcode.min.js';

  const els = {
    text: document.getElementById('qr-text'),
    error: document.getElementById('qr-text-error'),
    charCount: document.getElementById('char-count'),
    size: document.getElementById('qr-size'),
    fg: document.getElementById('qr-fg'),
    bg: document.getElementById('qr-bg'),
    ecl: document.getElementById('qr-ecl'),
    margin: document.getElementById('qr-margin'),
    marginValue: document.getElementById('qr-margin-value'),
    canvas: document.getElementById('qr-canvas'),
    wrap: document.getElementById('preview-wrap'),
    btnPng: document.getElementById('btn-download-png'),
    btnPngMobile: document.getElementById('btn-download-png-mobile'),
    btnSvg: document.getElementById('btn-download-svg'),
    btnCopyImg: document.getElementById('btn-copy-image'),
    btnCopyText: document.getElementById('btn-copy-text'),
    btnShare: document.getElementById('btn-share'),
    btnClear: document.getElementById('btn-clear'),
    btnClearMobile: document.getElementById('btn-clear-mobile'),
    toastStack: document.getElementById('toast-stack'),
  };

  const STORAGE_KEY = 'resumqr-qr-settings';
  const allButtons = [els.btnPng, els.btnPngMobile, els.btnSvg, els.btnCopyImg, els.btnCopyText, els.btnShare];
  let debounceTimer = null;
  let libReady = false;

  /* ---------- Toasts (deduped so retyping doesn't spam) ---------- */
  let lastToastMsg = '';
  let lastToastAt = 0;
  function toast(message, type) {
    const now = Date.now();
    if (message === lastToastMsg && now - lastToastAt < 2000) return;
    lastToastMsg = message; lastToastAt = now;
    if (!els.toastStack) return;
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : '');
    t.setAttribute('role', type === 'error' ? 'alert' : 'status');
    t.textContent = message;
    els.toastStack.appendChild(t);
    setTimeout(() => { t.classList.add('leaving'); setTimeout(() => t.remove(), 220); }, 2800);
  }

  function setLoading(btn, isLoading) { if (btn) { btn.classList.toggle('is-loading', isLoading); btn.disabled = isLoading; } }
  function flashSuccess(btn, label) {
    if (!btn) return;
    const original = btn.innerHTML;
    btn.classList.add('is-success');
    btn.textContent = label || 'Done ✓';
    setTimeout(() => { btn.classList.remove('is-success'); btn.innerHTML = original; }, 1500);
  }

  /* ---------- Load the tiny QR engine with retries ---------- */
  function setButtonsEnabled(enabled) {
    allButtons.forEach(b => { if (b) b.disabled = !enabled; });
  }

  function initLibrary() {
    els.wrap.classList.add('loading');
    setButtonsEnabled(false);
    window.loadScriptWithRetry(QR_LIB_URL, 4, 1000).then(() => {
      libReady = true;
      els.wrap.classList.remove('loading');
      render();
    }).catch(() => {
      els.wrap.classList.remove('loading');
      renderLoadError();
    });
  }

  function renderLoadError() {
    setButtonsEnabled(false);
    els.wrap.innerHTML = '';
    const msg = document.createElement('div');
    msg.style.textAlign = 'center';
    msg.style.padding = '10px';
    const p = document.createElement('p');
    p.className = 'qr-placeholder';
    p.style.marginBottom = '14px';
    p.textContent = "Couldn't load the QR engine on this connection.";
    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'btn btn-primary btn-sm';
    retryBtn.textContent = 'Retry now';
    retryBtn.addEventListener('click', initLibrary);
    msg.appendChild(p);
    msg.appendChild(retryBtn);
    els.wrap.appendChild(msg);
    toast('Network seems unstable — tap Retry, or try WiFi.', 'error');
  }

  /* ---------- Validation ---------- */
  function currentText() { return (els.text.value || '').trim(); }
  function validate() {
    const valid = currentText().length > 0;
    els.text.classList.toggle('invalid', !valid);
    els.error.classList.toggle('show', !valid);
    if (libReady) setButtonsEnabled(valid);
    return valid;
  }
  function updateCharCount() {
    const len = els.text.value.length;
    els.charCount.textContent = `${len} / 2000`;
    els.charCount.classList.toggle('warn', len > 1600 && len <= 1900);
    els.charCount.classList.toggle('over', len > 1900);
  }

  /* ---------- Build the qrcode-generator instance for current settings ---------- */
  function buildQr() {
    // typeNumber 0 = auto-detect the smallest size that fits the data
    const qr = qrcode(0, els.ecl.value);
    qr.addData(currentText());
    qr.make();
    return qr;
  }

  /* ---------- Draw to our own canvas (full control over color/size/margin) ---------- */
  function drawCanvas(qr) {
    const size = parseInt(els.size.value, 10);
    const marginModules = parseInt(els.margin.value, 10);
    const count = qr.getModuleCount();
    const totalModules = count + marginModules * 2;
    const cell = size / totalModules;

    els.canvas.width = size;
    els.canvas.height = size;
    const ctx = els.canvas.getContext('2d');
    ctx.fillStyle = els.bg.value;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = els.fg.value;
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          const x = (c + marginModules) * cell;
          const y = (r + marginModules) * cell;
          ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(cell), Math.ceil(cell));
        }
      }
    }
  }

  /* ---------- Build an SVG string manually (no library dependency) ---------- */
  function buildSvg(qr) {
    const marginModules = parseInt(els.margin.value, 10);
    const count = qr.getModuleCount();
    const total = count + marginModules * 2;
    let rects = '';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          rects += `<rect x="${c + marginModules}" y="${r + marginModules}" width="1" height="1"/>`;
        }
      }
    }
    const fg = els.fg.value, bg = els.bg.value;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
      `<rect width="${total}" height="${total}" fill="${bg}"/>` +
      `<g fill="${fg}">${rects}</g></svg>`;
  }

  /* ---------- Core render ---------- */
  function render() {
    updateCharCount();
    const valid = validate();
    if (!valid) {
      const ctx = els.canvas.getContext('2d');
      ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
      return;
    }
    if (!libReady) return; // will render once the library finishes loading
    try {
      const qr = buildQr();
      drawCanvas(qr);
      saveSettings();
    } catch (e) {
      toast('Could not generate a code for this input — try shorter text.', 'error');
    }
  }
  function debouncedRender() { clearTimeout(debounceTimer); debounceTimer = setTimeout(render, 120); }

  /* ---------- Autosave / restore ---------- */
  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        text: els.text.value, size: els.size.value, fg: els.fg.value,
        bg: els.bg.value, ecl: els.ecl.value, margin: els.margin.value
      }));
    } catch (e) {}
  }
  function restoreSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { els.text.value = 'https://resumqr.com'; return; }
      const s = JSON.parse(raw);
      els.text.value = s.text ?? 'https://resumqr.com';
      if (s.size) els.size.value = s.size;
      if (s.fg) els.fg.value = s.fg;
      if (s.bg) els.bg.value = s.bg;
      if (s.ecl) els.ecl.value = s.ecl;
      if (s.margin) { els.margin.value = s.margin; els.marginValue.textContent = s.margin; }
    } catch (e) { els.text.value = 'https://resumqr.com'; }
  }

  function triggerDownload(href, filename) {
    const a = document.createElement('a');
    a.href = href; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- Actions ---------- */
  function downloadPng(btn) {
    if (!validate()) { toast('Type something first.', 'error'); return; }
    setLoading(btn, true);
    try {
      triggerDownload(els.canvas.toDataURL('image/png'), 'qrcode.png');
      flashSuccess(btn, 'Downloaded ✓');
      toast('PNG downloaded.', 'success');
    } catch (e) {
      toast('Download failed — try reloading the page.', 'error');
    } finally { setLoading(btn, false); }
  }

  function downloadSvg() {
    if (!validate()) { toast('Type something first.', 'error'); return; }
    setLoading(els.btnSvg, true);
    try {
      const qr = buildQr();
      const svgString = buildSvg(qr);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, 'qrcode.svg');
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      flashSuccess(els.btnSvg, 'Downloaded ✓');
      toast('SVG downloaded.', 'success');
    } catch (e) {
      toast('Could not generate SVG for this input.', 'error');
    } finally { setLoading(els.btnSvg, false); }
  }

  async function copyImage() {
    if (!validate()) { toast('Type something first.', 'error'); return; }
    setLoading(els.btnCopyImg, true);
    try {
      if (!navigator.clipboard || !window.ClipboardItem) throw new Error('unsupported');
      const blob = await new Promise(resolve => els.canvas.toBlob(resolve, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      flashSuccess(els.btnCopyImg, 'Copied ✓');
      toast('Image copied to clipboard.', 'success');
    } catch (e) {
      toast('Copying images isn\u2019t supported in this browser — try Download PNG.', 'error');
    } finally { setLoading(els.btnCopyImg, false); }
  }

  async function copyText() {
    if (!validate()) { toast('Type something first.', 'error'); return; }
    try {
      await navigator.clipboard.writeText(currentText());
      flashSuccess(els.btnCopyText, 'Copied ✓');
      toast('Text copied to clipboard.', 'success');
    } catch (e) { toast('Could not copy — select and copy manually.', 'error'); }
  }

  async function share() {
    if (!validate()) { toast('Type something first.', 'error'); return; }
    setLoading(els.btnShare, true);
    try {
      const blob = await new Promise(resolve => els.canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], 'qrcode.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'QR Code', text: currentText() });
        toast('Shared.', 'success');
      } else if (navigator.share) {
        await navigator.share({ title: 'QR Code', text: currentText() });
        toast('Shared.', 'success');
      } else { throw new Error('unsupported'); }
    } catch (e) {
      if (e && e.name === 'AbortError') { setLoading(els.btnShare, false); return; }
      toast('Sharing isn\u2019t supported here — downloading instead.', 'error');
      downloadPng(els.btnShare);
    } finally { setLoading(els.btnShare, false); }
  }

  function clearAll() {
    els.text.value = '';
    updateCharCount(); validate();
    const ctx = els.canvas.getContext('2d');
    ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    els.text.focus();
    toast('Cleared.');
  }

  /* ---------- Wire up events ---------- */
  els.text.addEventListener('input', debouncedRender);
  els.size.addEventListener('change', render);
  els.fg.addEventListener('input', debouncedRender);
  els.bg.addEventListener('input', debouncedRender);
  els.ecl.addEventListener('change', render);
  els.margin.addEventListener('input', () => { els.marginValue.textContent = els.margin.value; debouncedRender(); });

  els.btnPng?.addEventListener('click', () => downloadPng(els.btnPng));
  els.btnPngMobile?.addEventListener('click', () => downloadPng(els.btnPngMobile));
  els.btnSvg?.addEventListener('click', downloadSvg);
  els.btnCopyImg?.addEventListener('click', copyImage);
  els.btnCopyText?.addEventListener('click', copyText);
  els.btnShare?.addEventListener('click', share);
  els.btnClear?.addEventListener('click', clearAll);
  els.btnClearMobile?.addEventListener('click', clearAll);
  els.text.form?.addEventListener('submit', e => e.preventDefault());

  /* ---------- Init ---------- */
  restoreSettings();
  updateCharCount();
  initLibrary();
})();
