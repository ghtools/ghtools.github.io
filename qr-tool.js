/* =========================================================
   ResumQR — QR Tool Logic
   Uses window.QRCode from the 'qrcode' npm package (jsdelivr CDN),
   which exposes: QRCode.toCanvas, QRCode.toDataURL, QRCode.toString
   ========================================================= */
(() => {
  'use strict';

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
  let debounceTimer = null;
  let lastGoodText = '';

  /* ---------- Toasts ---------- */
  function toast(message, type) {
    if (!els.toastStack) return;
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : '');
    t.setAttribute('role', type === 'error' ? 'alert' : 'status');
    t.textContent = message; // textContent only — no HTML injection risk
    els.toastStack.appendChild(t);
    setTimeout(() => {
      t.classList.add('leaving');
      setTimeout(() => t.remove(), 220);
    }, 2600);
  }

  /* ---------- Button loading/success helper ---------- */
  function setLoading(btn, isLoading) {
    if (!btn) return;
    btn.classList.toggle('is-loading', isLoading);
    btn.disabled = isLoading;
  }
  function flashSuccess(btn, label) {
    if (!btn) return;
    const original = btn.textContent;
    btn.classList.add('is-success');
    btn.textContent = label || 'Done ✓';
    setTimeout(() => {
      btn.classList.remove('is-success');
      btn.textContent = original;
    }, 1500);
  }

  /* ---------- Validation ---------- */
  function currentText() {
    return (els.text.value || '').trim();
  }
  function validate() {
    const text = currentText();
    const valid = text.length > 0;
    els.text.classList.toggle('invalid', !valid);
    els.error.classList.toggle('show', !valid);
    [els.btnPng, els.btnPngMobile, els.btnSvg, els.btnCopyImg, els.btnCopyText, els.btnShare].forEach(b => {
      if (b) b.disabled = !valid;
    });
    return valid;
  }

  /* ---------- Character counter ---------- */
  function updateCharCount() {
    const len = els.text.value.length;
    els.charCount.textContent = `${len} / 2000`;
    els.charCount.classList.toggle('warn', len > 1600 && len <= 1900);
    els.charCount.classList.toggle('over', len > 1900);
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
    if (typeof QRCode === 'undefined') {
      toast("Couldn't load the QR engine — check your connection and reload.", 'error');
      return;
    }

    const text = currentText();
    const size = parseInt(els.size.value, 10);
    const opts = {
      width: size,
      margin: parseInt(els.margin.value, 10),
      errorCorrectionLevel: els.ecl.value,
      color: { dark: els.fg.value, light: els.bg.value }
    };

    els.wrap.classList.add('loading');
    QRCode.toCanvas(els.canvas, text, opts, (err) => {
      els.wrap.classList.remove('loading');
      if (err) {
        toast('Could not generate a code for this input. Try shorter text or a lower error-correction level.', 'error');
        return;
      }
      lastGoodText = text;
      saveSettings();
    });
  }

  function debouncedRender() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(render, 120);
  }

  /* ---------- Autosave / restore ---------- */
  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        text: els.text.value,
        size: els.size.value,
        fg: els.fg.value,
        bg: els.bg.value,
        ecl: els.ecl.value,
        margin: els.margin.value
      }));
    } catch (e) { /* storage unavailable — safe to ignore */ }
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
    } catch (e) {
      els.text.value = 'https://resumqr.com';
    }
  }

  /* ---------- Filename helper ---------- */
  function timestampName(ext) {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `qrcode.${ext}`; // fixed name as required; browsers auto-number duplicates
  }

  function triggerDownload(href, filename) {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /* ---------- Download PNG ---------- */
  function downloadPng(btn) {
    if (!validate()) { toast('Type something first.', 'error'); return; }
    setLoading(btn, true);
    try {
      const url = els.canvas.toDataURL('image/png');
      triggerDownload(url, timestampName('png'));
      flashSuccess(btn, 'Downloaded ✓');
      toast('PNG downloaded.', 'success');
    } catch (e) {
      toast('Download failed. Try a smaller size or reload the page.', 'error');
    } finally {
      setLoading(btn, false);
    }
  }

  /* ---------- Download SVG ---------- */
  function downloadSvg() {
    if (!validate()) { toast('Type something first.', 'error'); return; }
    setLoading(els.btnSvg, true);
    const opts = {
      margin: parseInt(els.margin.value, 10),
      errorCorrectionLevel: els.ecl.value,
      color: { dark: els.fg.value, light: els.bg.value }
    };
    QRCode.toString(currentText(), { ...opts, type: 'svg' }, (err, svgString) => {
      setLoading(els.btnSvg, false);
      if (err) { toast('Could not generate SVG for this input.', 'error'); return; }
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, 'qrcode.svg');
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      flashSuccess(els.btnSvg, 'Downloaded ✓');
      toast('SVG downloaded.', 'success');
    });
  }

  /* ---------- Copy image to clipboard ---------- */
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
      toast('Copying images isn\u2019t supported in this browser — try Download PNG instead.', 'error');
    } finally {
      setLoading(els.btnCopyImg, false);
    }
  }

  /* ---------- Copy text ---------- */
  async function copyText() {
    if (!validate()) { toast('Type something first.', 'error'); return; }
    try {
      await navigator.clipboard.writeText(currentText());
      flashSuccess(els.btnCopyText, 'Copied ✓');
      toast('Text copied to clipboard.', 'success');
    } catch (e) {
      toast('Could not copy — select and copy the text manually.', 'error');
    }
  }

  /* ---------- Share ---------- */
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
      } else {
        throw new Error('unsupported');
      }
    } catch (e) {
      if (e && e.name === 'AbortError') { setLoading(els.btnShare, false); return; }
      toast('Sharing isn\u2019t supported here — downloading instead.', 'error');
      downloadPng(els.btnShare);
    } finally {
      setLoading(els.btnShare, false);
    }
  }

  /* ---------- Clear ---------- */
  function clearAll() {
    els.text.value = '';
    updateCharCount();
    validate();
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
  els.margin.addEventListener('input', () => {
    els.marginValue.textContent = els.margin.value;
    debouncedRender();
  });

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
  render();
})();
