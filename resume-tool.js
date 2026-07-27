/* =========================================================
   ResumQR — Resume Tool Logic
   All user text is inserted via textContent (never innerHTML)
   to prevent XSS. PDF export uses html2pdf.js on the real preview DOM.
   ========================================================= */
(() => {
  'use strict';

  const STORAGE_KEY = 'resumqr-resume-data';
  const toastStack = document.getElementById('toast-stack');

  function toast(message, type) {
    if (!toastStack) return;
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : '');
    t.setAttribute('role', type === 'error' ? 'alert' : 'status');
    t.textContent = message;
    toastStack.appendChild(t);
    setTimeout(() => { t.classList.add('leaving'); setTimeout(() => t.remove(), 220); }, 2600);
  }
  function setLoading(btn, isLoading) {
    if (!btn) return;
    btn.classList.toggle('is-loading', isLoading);
    btn.disabled = isLoading;
  }
  function flashSuccess(btn, label) {
    if (!btn) return;
    const original = btn.innerHTML;
    btn.classList.add('is-success');
    const prevText = btn.textContent;
    btn.textContent = label || 'Done ✓';
    setTimeout(() => { btn.classList.remove('is-success'); btn.innerHTML = original; }, 1600);
  }

  const f = id => document.getElementById(id);
  const expList = f('exp-list');
  const eduList = f('edu-list');
  const doc = f('resume-preview-doc');

  /* ---------- Build an experience/education block safely (no innerHTML+user data) ---------- */
  function buildFieldRow(labelText, className) {
    const wrap = document.createElement('div');
    const label = document.createElement('label');
    label.className = 'field-label';
    label.textContent = labelText;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'field ' + className;
    wrap.appendChild(label);
    wrap.appendChild(input);
    return { wrap, input };
  }

  function expBlock(role, company, dates, desc) {
    const div = document.createElement('div');
    div.className = 'entry-block';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '✕ remove';
    removeBtn.addEventListener('click', () => { div.remove(); renderPreview(); saveData(); });
    div.appendChild(removeBtn);

    const row = document.createElement('div');
    row.className = 'field-row-2';
    const r1 = buildFieldRow('Role', 'exp-role'); r1.input.value = role;
    const r2 = buildFieldRow('Company', 'exp-company'); r2.input.value = company;
    row.appendChild(r1.wrap); row.appendChild(r2.wrap);
    div.appendChild(row);

    const datesRow = buildFieldRow('Dates', 'exp-dates'); datesRow.input.value = dates;
    div.appendChild(datesRow.wrap);

    const descLabel = document.createElement('label');
    descLabel.className = 'field-label'; descLabel.textContent = 'Description';
    const descArea = document.createElement('textarea');
    descArea.className = 'field exp-desc'; descArea.value = desc;
    div.appendChild(descLabel); div.appendChild(descArea);

    div.querySelectorAll('input,textarea').forEach(el => el.addEventListener('input', () => { renderPreview(); saveData(); }));
    expList.appendChild(div);
  }

  function eduBlock(school, degree, dates) {
    const div = document.createElement('div');
    div.className = 'entry-block';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '✕ remove';
    removeBtn.addEventListener('click', () => { div.remove(); renderPreview(); saveData(); });
    div.appendChild(removeBtn);

    const row = document.createElement('div');
    row.className = 'field-row-2';
    const r1 = buildFieldRow('School', 'edu-school'); r1.input.value = school;
    const r2 = buildFieldRow('Degree', 'edu-degree'); r2.input.value = degree;
    row.appendChild(r1.wrap); row.appendChild(r2.wrap);
    div.appendChild(row);

    const datesRow = buildFieldRow('Dates', 'edu-dates'); datesRow.input.value = dates;
    div.appendChild(datesRow.wrap);

    div.querySelectorAll('input').forEach(el => el.addEventListener('input', () => { renderPreview(); saveData(); }));
    eduList.appendChild(div);
  }

  f('add-exp').addEventListener('click', () => { expBlock('Role', 'Company', '2023 — Present', 'What you did and the impact it had.'); renderPreview(); saveData(); });
  f('add-edu').addEventListener('click', () => { eduBlock('University', 'Degree', '2018 — 2022'); renderPreview(); saveData(); });

  /* ---------- Validation ---------- */
  function validateEmail(v) { return v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function validate() {
    let ok = true;
    const name = f('f-name').value.trim();
    const nameErr = f('f-name-error');
    if (!name) { f('f-name').classList.add('invalid'); nameErr.classList.add('show'); ok = false; }
    else { f('f-name').classList.remove('invalid'); nameErr.classList.remove('show'); }

    const email = f('f-email').value.trim();
    const emailErr = f('f-email-error');
    if (!validateEmail(email)) { f('f-email').classList.add('invalid'); emailErr.classList.add('show'); ok = false; }
    else { f('f-email').classList.remove('invalid'); emailErr.classList.remove('show'); }

    return ok;
  }

  /* ---------- Character counter ---------- */
  function updateSummaryCount() {
    const len = f('f-summary').value.length;
    f('summary-count').textContent = `${len} / 400`;
  }

  /* ---------- Render preview (all via textContent — XSS-safe) ---------- */
  function renderPreview() {
    f('p-name').textContent = f('f-name').value || 'Your Name';
    const contactParts = [f('f-title').value, f('f-location').value, f('f-email').value, f('f-phone').value].filter(Boolean);
    f('p-contact').textContent = contactParts.join('  ·  ');
    f('p-summary').textContent = f('f-summary').value;
    updateSummaryCount();

    const expOut = f('p-exp');
    expOut.innerHTML = '';
    document.querySelectorAll('#exp-list .entry-block').forEach(block => {
      const role = block.querySelector('.exp-role').value;
      const company = block.querySelector('.exp-company').value;
      const dates = block.querySelector('.exp-dates').value;
      const desc = block.querySelector('.exp-desc').value;

      const item = document.createElement('div');
      item.className = 'r-item';
      const top = document.createElement('div');
      top.className = 'r-item-top';
      const left = document.createElement('span'); left.textContent = `${role} — ${company}`;
      const right = document.createElement('span'); right.textContent = dates;
      top.appendChild(left); top.appendChild(right);
      const p = document.createElement('p'); p.textContent = desc;
      item.appendChild(top); item.appendChild(p);
      expOut.appendChild(item);
    });

    const eduOut = f('p-edu');
    eduOut.innerHTML = '';
    document.querySelectorAll('#edu-list .entry-block').forEach(block => {
      const school = block.querySelector('.edu-school').value;
      const degree = block.querySelector('.edu-degree').value;
      const dates = block.querySelector('.edu-dates').value;

      const item = document.createElement('div');
      item.className = 'r-item';
      const top = document.createElement('div');
      top.className = 'r-item-top';
      const left = document.createElement('span'); left.textContent = `${degree} — ${school}`;
      const right = document.createElement('span'); right.textContent = dates;
      top.appendChild(left); top.appendChild(right);
      item.appendChild(top);
      eduOut.appendChild(item);
    });

    f('p-skills').textContent = f('f-skills').value;
  }

  /* ---------- Style controls ---------- */
  document.querySelectorAll('.template-pick').forEach(pick => {
    pick.addEventListener('click', () => {
      document.querySelectorAll('.template-pick').forEach(p => p.classList.remove('selected'));
      pick.classList.add('selected');
      doc.classList.remove('template-modern', 'template-classic');
      doc.classList.add('template-' + pick.dataset.template);
      saveData();
    });
  });
  document.querySelectorAll('.accent-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('.accent-dot').forEach(d => d.classList.remove('selected'));
      dot.classList.add('selected');
      doc.style.setProperty('--accent', dot.dataset.color);
      saveData();
    });
  });
  f('f-font').addEventListener('change', () => {
    doc.classList.remove('font-serif', 'font-sans');
    doc.classList.add('font-' + f('f-font').value);
    saveData();
  });

  /* ---------- Photo upload ---------- */
  f('f-photo').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Please choose an image file.', 'error'); return; }
    if (file.size > 4 * 1024 * 1024) { toast('Image is too large — please use a file under 4MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const preview = f('photo-preview');
      preview.innerHTML = '';
      const img = document.createElement('img');
      img.src = dataUrl; img.alt = '';
      preview.appendChild(img);
      const pPhoto = f('p-photo');
      pPhoto.src = dataUrl;
      pPhoto.style.display = 'block';
      saveData();
    };
    reader.readAsDataURL(file);
  });

  /* ---------- Zoom ---------- */
  let zoom = 100;
  const zoomInner = f('zoom-inner');
  function applyZoom() {
    zoomInner.style.transform = `scale(${zoom / 100})`;
    f('zoom-value').textContent = zoom + '%';
  }
  f('zoom-in').addEventListener('click', () => { zoom = Math.min(130, zoom + 10); applyZoom(); });
  f('zoom-out').addEventListener('click', () => { zoom = Math.max(70, zoom - 10); applyZoom(); });

  /* ---------- Autosave / restore ---------- */
  function saveData() {
    try {
      const data = {
        name: f('f-name').value, title: f('f-title').value, email: f('f-email').value,
        phone: f('f-phone').value, location: f('f-location').value, summary: f('f-summary').value,
        skills: f('f-skills').value, font: f('f-font').value,
        template: doc.classList.contains('template-classic') ? 'classic' : 'modern',
        accent: doc.style.getPropertyValue('--accent') || '#4F46E5',
        photo: f('p-photo').style.display === 'block' ? f('p-photo').src : null,
        exp: Array.from(document.querySelectorAll('#exp-list .entry-block')).map(b => ({
          role: b.querySelector('.exp-role').value, company: b.querySelector('.exp-company').value,
          dates: b.querySelector('.exp-dates').value, desc: b.querySelector('.exp-desc').value
        })),
        edu: Array.from(document.querySelectorAll('#edu-list .entry-block')).map(b => ({
          school: b.querySelector('.edu-school').value, degree: b.querySelector('.edu-degree').value,
          dates: b.querySelector('.edu-dates').value
        }))
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* storage unavailable — safe to ignore */ }
  }

  function restoreData() {
    let data = null;
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) data = JSON.parse(raw); } catch (e) {}

    if (!data) {
      expBlock('Senior Product Designer', 'Nova Labs', '2022 — Present', 'Led design for the core onboarding flow, increasing activation by 18%.');
      eduBlock('King Saud University', 'B.Sc. Design', '2016 — 2020');
      renderPreview();
      return;
    }

    f('f-name').value = data.name ?? '';
    f('f-title').value = data.title ?? '';
    f('f-email').value = data.email ?? '';
    f('f-phone').value = data.phone ?? '';
    f('f-location').value = data.location ?? '';
    f('f-summary').value = data.summary ?? '';
    f('f-skills').value = data.skills ?? '';
    if (data.font) { f('f-font').value = data.font; doc.classList.remove('font-serif','font-sans'); doc.classList.add('font-' + data.font); }
    if (data.template) {
      doc.classList.remove('template-modern','template-classic');
      doc.classList.add('template-' + data.template);
      document.querySelectorAll('.template-pick').forEach(p => p.classList.toggle('selected', p.dataset.template === data.template));
    }
    if (data.accent) {
      doc.style.setProperty('--accent', data.accent);
      document.querySelectorAll('.accent-dot').forEach(d => d.classList.toggle('selected', d.dataset.color.toLowerCase() === data.accent.toLowerCase()));
    }
    if (data.photo) {
      const preview = f('photo-preview'); preview.innerHTML = '';
      const img = document.createElement('img'); img.src = data.photo; img.alt = '';
      preview.appendChild(img);
      const pPhoto = f('p-photo'); pPhoto.src = data.photo; pPhoto.style.display = 'block';
    }

    (data.exp && data.exp.length ? data.exp : [{role:'Senior Product Designer',company:'Nova Labs',dates:'2022 — Present',desc:'Led design for the core onboarding flow, increasing activation by 18%.'}])
      .forEach(x => expBlock(x.role, x.company, x.dates, x.desc));
    (data.edu && data.edu.length ? data.edu : [{school:'King Saud University',degree:'B.Sc. Design',dates:'2016 — 2020'}])
      .forEach(x => eduBlock(x.school, x.degree, x.dates));

    renderPreview();
  }

  /* ---------- PDF export (html2pdf loaded lazily, with retries) ---------- */
  const HTML2PDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  let html2pdfLoadPromise = null;
  function ensureHtml2Pdf() {
    if (typeof html2pdf !== 'undefined') return Promise.resolve();
    if (!html2pdfLoadPromise) html2pdfLoadPromise = window.loadScriptWithRetry(HTML2PDF_URL, 4, 1200);
    return html2pdfLoadPromise;
  }

  function slugify(str) {
    return (str || 'resume').toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-') || 'resume';
  }

  async function downloadPdf(btn) {
    if (!validate()) { toast('Please fix the highlighted fields first.', 'error'); return; }
    setLoading(btn, true);
    try {
      await ensureHtml2Pdf();
    } catch (e) {
      toast('Network seems unstable — could not load the PDF engine. Try again.', 'error');
      setLoading(btn, false);
      return;
    }

    const filename = `resume-${slugify(f('f-name').value)}.pdf`;
    const prevZoom = zoomInner.style.transform;
    zoomInner.style.transform = 'none'; // ensure PDF captures at true scale

    const opts = {
      margin: [10, 10, 10, 10],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      await html2pdf().set(opts).from(doc).save();
      flashSuccess(btn, 'Downloaded ✓');
      toast('Resume PDF downloaded.', 'success');
    } catch (e) {
      toast('PDF generation failed. Try again, or use a smaller photo.', 'error');
    } finally {
      zoomInner.style.transform = prevZoom;
      setLoading(btn, false);
    }
  }

  f('btn-download-pdf').addEventListener('click', () => downloadPdf(f('btn-download-pdf')));
  f('btn-download-pdf-mobile').addEventListener('click', () => downloadPdf(f('btn-download-pdf-mobile')));

  /* ---------- Wire up live preview + autosave on every input ---------- */
  ['f-name','f-title','f-email','f-phone','f-location','f-summary','f-skills'].forEach(id => {
    f(id).addEventListener('input', () => { renderPreview(); validate(); saveData(); });
  });

  f('resume-form').addEventListener('submit', e => e.preventDefault());

  /* ---------- Init ---------- */
  restoreData();
  applyZoom();
  validate();
})();
