// report.js — Shared submission report modal and PDF export.
// Requires: walkthrough-data.js (FORM_SECTIONS, ALL_QUESTION_IDS, QUESTION_TEXT_MAP)
// Requires for PDF: jsPDF CDN (window.jspdf)

var _currentReport = null;

// ---- Utilities (shared across pages) ----

function formatDate(iso) {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function shortId(id) {
  return id ? id.split('-').pop() : '\u2014';
}

// Derive inspection type from submission id prefix or explicit field.
function inspectionType(s) {
  if (s.inspectionType) return s.inspectionType;
  const id = s.id || '';
  if (id.startsWith('OA-'))  return 'Operations Assessment';
  if (id.startsWith('FSE-')) return 'FSE';
  return 'Walkthrough';
}

// Calculate score from answers.
function calcScore(s) {
  const yes   = ALL_QUESTION_IDS.filter(q => s.answers && s.answers[q] === 'Yes').length;
  const no    = ALL_QUESTION_IDS.filter(q => s.answers && s.answers[q] === 'No').length;
  const total = yes + no;
  return { yes, no, total, pct: total > 0 ? Math.round(yes / total * 100) : null };
}

function scoreColor(pct) {
  if (pct === null) return 'var(--text-light,#6b7280)';
  return pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626';
}

function scoreLabel(pct) {
  if (pct === null) return '\u2014';
  return pct >= 80 ? 'Passing' : pct >= 60 ? 'Needs Work' : 'At Risk';
}

// ---- Image helpers ----

// Fetch an image URL as a base64 dataUrl for PDF embedding.
// Falls back gracefully so a failed image never breaks the PDF.
async function _fetchAsDataUrl(src) {
  if (!src) return null;
  if (src.startsWith('data:')) return src;
  try {
    const resp = await fetch(src);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const blob = await resp.blob();
    return await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload  = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('[PDF] Could not fetch image for PDF:', e.message);
    return null;
  }
}

// Refresh signed URLs for a single submission right before displaying it.
// Returns an enriched copy of s (never mutates the original).
async function _refreshSignedUrls(s) {
  if (!s.images || typeof _enrichWithSignedUrls === 'undefined') return s;
  try {
    const enriched = await _enrichWithSignedUrls([s]);
    return enriched[0] || s;
  } catch (e) {
    console.warn('[Report] Could not refresh signed URLs:', e.message);
    return s;
  }
}

// ---- Modal ----

async function openReportModal(s) {
  if (!s) return;

  // Show modal immediately with a loading indicator, then populate once URLs are ready.
  const overlay = document.getElementById('subOverlay');
  const body    = document.getElementById('subModalBody');
  document.getElementById('subModalTitle').textContent = 'Loading\u2026';
  document.getElementById('subModalSub').textContent   = '';
  if (body)    body.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-light,#6b7280)">Loading report\u2026</div>';
  if (overlay) overlay.classList.add('open');
  document.getElementById('subModal').scrollTop = 0;

  // Refresh signed URLs so images are guaranteed fresh.
  s = await _refreshSignedUrls(s);
  _currentReport = s;

  const sc = calcScore(s);
  document.getElementById('subModalTitle').textContent =
    'Store ' + (s.storeNumber || '\u2014') + ' \u2014 ' + inspectionType(s) + ' Report';
  document.getElementById('subModalSub').textContent = formatDate(s.dateSubmitted);

  let html = '';

  // Score bar
  const color = scoreColor(sc.pct);
  html += '<div class="sub-score-bar">' +
    '<div class="sub-score-numbers">' +
    '<span class="sub-score-pct" style="color:' + color + '">' +
      (sc.pct !== null ? sc.pct + '%' : '\u2014') + '</span>' +
    '<span style="font-size:.82rem;color:var(--text-light,#6b7280)">' +
      sc.yes + ' yes \u00b7 ' + sc.no + ' no \u00b7 ' + scoreLabel(sc.pct) +
    '</span></div>' +
    '<div class="sub-score-track"><div class="sub-score-fill" ' +
      'style="width:' + (sc.pct || 0) + '%;background:' + color + '"></div></div>' +
    '</div>';

  // Meta grid
  html += '<div class="sub-meta-grid">' +
    '<div class="sub-meta-item"><span class="sub-meta-label">Prepared By</span><span>' + (s.preparedBy || '\u2014') + '</span></div>' +
    '<div class="sub-meta-item"><span class="sub-meta-label">Submitted By</span><span>' + (s.username || '\u2014') + '</span></div>' +
    '<div class="sub-meta-item"><span class="sub-meta-label">Date Submitted</span><span>' + formatDate(s.dateSubmitted) + '</span></div>' +
    '<div class="sub-meta-item"><span class="sub-meta-label">Conducted On</span><span>' + (s.conductedOn ? s.conductedOn.replace('T', '\u00a0') : '\u2014') + '</span></div>' +
    '</div>';

  // Section-by-section questions with inline images
  FORM_SECTIONS.forEach(function (sec) {
    html += '<div class="sub-section"><div class="sub-section-hdr">' +
      '<div class="sub-section-dot" style="background:' + sec.color + '"></div>' + sec.title +
      '</div>';
    sec.questions.forEach(function (q) {
      const ans  = s.answers ? s.answers[q.id] : null;
      const note = s.questionNotes ? s.questionNotes[q.id] : null;
      const imgs = (s.images && s.images[q.id]) || [];
      const bc   = ans === 'Yes' ? 'yes' : ans === 'No' ? 'no' : 'na';
      html += '<div class="sub-q-row">' +
        '<div class="sub-q-main">' +
          '<div class="sub-q-text">' + q.text + '</div>' +
          (note ? '<div class="sub-q-note">\u270f\ufe0f ' + note + '</div>' : '') +
          _renderThumbs(imgs) +
        '</div>' +
        '<span class="sub-badge ' + bc + '">' + (ans || '\u2014') + '</span>' +
        '</div>';
    });
    html += '</div>';
  });

  // Noteworthy
  if (s.answers && s.answers['noteworthy']) {
    const nw = s.answers['noteworthy'];
    html += '<div class="sub-section"><div class="sub-section-hdr">' +
      '<div class="sub-section-dot" style="background:#6366f1"></div>Noteworthy</div>' +
      '<div class="sub-q-row"><div class="sub-q-main"><div class="sub-q-text">Does this store have something noteworthy to share?</div></div>' +
      '<span class="sub-badge ' + (nw === 'Yes' ? 'yes' : 'no') + '">' + nw + '</span></div></div>';
  }

  // Notes
  if (s.notes) {
    html += '<div class="sub-notes-section"><div class="sub-notes-label">Additional Notes</div>' +
      '<div class="sub-notes-text">' +
      s.notes.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
      '</div></div>';
  }

  if (body) body.innerHTML = html;
  document.getElementById('subModal').scrollTop = 0;
}

// Render image thumbnails — no crossorigin attribute so images load regardless of CORS policy.
function _renderThumbs(imgs) {
  if (!imgs || !imgs.length) return '';
  let out = '<div class="sub-img-row">';
  imgs.forEach(function (img) {
    const src = img.url || img.dataUrl || '';
    if (!src) return;
    out += '<img src="' + src + '" class="sub-img-thumb" ' +
      'onclick="window.open(this.src,\'_blank\')" alt="evidence photo" loading="lazy">';
  });
  return out + '</div>';
}

function closeReportModal() {
  document.getElementById('subOverlay').classList.remove('open');
}

// ---- PDF ----

async function downloadReportPDF() {
  if (!_currentReport) return;
  const btn = document.getElementById('subPdfBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Preparing\u2026'; }
  // Re-fetch fresh signed URLs so all images are valid at export time.
  let s = await _refreshSignedUrls(_currentReport);
  await _buildPDF(s, btn);
}

async function _buildPDF(s, btn) {
  if (!btn) btn = document.getElementById('subPdfBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Building\u2026'; }

  try {
    if (!window.jspdf) throw new Error('jsPDF not loaded');
    const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

    const PW = 595.28, PH = 841.89, ML = 45, MB = 45;
    const CW = PW - ML * 2;
    let y = 0;

    function newPage() { doc.addPage(); y = 50; }
    function check(need) { if (y + need > PH - MB) newPage(); }

    function txt(text, size, bold, r, g, b, maxW) {
      doc.setFontSize(size);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setTextColor(r ?? 0, g ?? 0, b ?? 0);
      const lines = doc.splitTextToSize(String(text ?? ''), maxW ?? CW);
      check(lines.length * size * 1.35);
      doc.text(lines, ML, y);
      y += lines.length * size * 1.35;
    }

    // Header band — taller with room for title + date subtitle
    doc.setFillColor(26, 63, 160);
    doc.rect(0, 0, PW, 78, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(255, 255, 255);
    doc.text('JMC ' + inspectionType(s) + ' Report', ML, 44);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(160, 190, 240);
    doc.text('Submitted ' + formatDate(s.dateSubmitted), ML, 62);
    y = 104;

    // Store number — prominent headline
    txt('Store ' + (s.storeNumber || '\u2014'), 22, true, 15, 23, 42);
    y += 14;

    // Thin rule below store title
    doc.setDrawColor(218, 222, 232); doc.setLineWidth(0.5);
    doc.line(ML, y, ML + CW, y);
    y += 22;

    // Meta grid — 4 items, 2 columns, no Submission ID
    const meta = [
      ['Prepared By',    s.preparedBy  || '\u2014'],
      ['Submitted By',   s.username    || '\u2014'],
      ['Date Submitted', formatDate(s.dateSubmitted)],
      ['Conducted On',   s.conductedOn ? s.conductedOn.replace('T', ' ') : '\u2014']
    ];
    doc.setFontSize(8);
    meta.forEach(function ([label, value], i) {
      const col = i % 2, row = Math.floor(i / 2);
      const x = ML + col * (CW / 2 + 10), yy = y + row * 34;
      check(34);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(118, 128, 150);
      doc.text(label.toUpperCase(), x, yy);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 25, 42);
      doc.text(value, x, yy + 15);
    });
    y += Math.ceil(meta.length / 2) * 34 + 22;

    // Thin rule above score
    doc.setDrawColor(218, 222, 232); doc.setLineWidth(0.5);
    doc.line(ML, y, ML + CW, y);
    y += 16;

    // Score band
    const sc  = calcScore(s);
    const sc3 = sc.pct >= 80 ? [22, 163, 74] : sc.pct >= 60 ? [217, 119, 6] : [220, 38, 38];
    check(38);
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(ML, y, CW, 32, 4, 4, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
    doc.setTextColor(sc3[0], sc3[1], sc3[2]);
    doc.text(sc.pct !== null ? sc.pct + '%' : '\u2014', ML + 12, y + 22);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(sc.yes + ' Yes  \u00b7  ' + sc.no + ' No  \u00b7  ' + scoreLabel(sc.pct), ML + 58, y + 22);
    y += 50;

    // Sections
    for (const sec of FORM_SECTIONS) {
      check(32); y += 12;
      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 100, 100);
      doc.text(sec.title.toUpperCase(), ML, y);
      doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.5);
      doc.line(ML + doc.getTextWidth(sec.title.toUpperCase()) + 6, y - 1, ML + CW, y - 1);
      y += 10;

      for (const q of sec.questions) {
        const a    = s.answers ? (s.answers[q.id] || '\u2014') : '\u2014';
        const note = s.questionNotes ? s.questionNotes[q.id] : null;
        const ac   = a === 'Yes' ? [22, 163, 74] : a === 'No' ? [220, 38, 38] : [150, 150, 150];
        const qLines = doc.splitTextToSize(q.text, CW - 52);
        check(qLines.length * 11.5 + (note ? 14 : 0) + 5);
        doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(25, 25, 25);
        doc.text(qLines, ML, y);
        const bW = 28, bH = 13, bX = ML + CW - bW, bY = y - 10.5;
        doc.setFillColor(ac[0], ac[1], ac[2]);
        doc.roundedRect(bX, bY, bW, bH, 3, 3, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
        doc.text(a, bX + bW / 2, bY + 9, { align: 'center' });
        y += qLines.length * 11.5;
        if (note) {
          doc.setFontSize(7.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(120, 120, 120);
          const nLines = doc.splitTextToSize('\u21b3 ' + note, CW - 8);
          doc.text(nLines, ML + 4, y);
          y += nLines.length * 10;
        }
        y += 3;
      }
    }

    // Noteworthy
    if (s.answers?.noteworthy) {
      const nw  = s.answers.noteworthy;
      const nwC = nw === 'Yes' ? [22, 163, 74] : [220, 38, 38];
      check(28); y += 6;
      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 100, 100);
      doc.text('NOTEWORTHY', ML, y); y += 8;
      doc.setFont('helvetica', 'normal'); doc.setTextColor(25, 25, 25);
      doc.text('Does this store have something noteworthy to share?', ML, y);
      doc.setFillColor(nwC[0], nwC[1], nwC[2]);
      doc.roundedRect(ML + CW - 28, y - 10.5, 28, 13, 3, 3, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
      doc.text(nw, ML + CW - 14, y - 1.5, { align: 'center' }); y += 14;
    }

    // Notes
    if (s.notes?.trim()) {
      check(40); y += 10;
      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 100, 100);
      doc.text('ADDITIONAL NOTES', ML, y); y += 10;
      const nLines = doc.splitTextToSize(s.notes.trim(), CW);
      check(nLines.length * 12 + 5);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(25, 25, 25);
      doc.text(nLines, ML, y); y += nLines.length * 12;
    }

    // Photos — fetch all images concurrently then embed
    const imgEntries = Object.entries(s.images || {}).filter(([, imgs]) => imgs?.length);
    if (imgEntries.length > 0) {
      // Pre-fetch all image data before writing to PDF
      if (btn) btn.textContent = 'Loading photos\u2026';
      const fetchJobs = [];
      imgEntries.forEach(([qid, imgs]) => {
        imgs.forEach(img => {
          const src = img.url || img.dataUrl || '';
          fetchJobs.push(
            _fetchAsDataUrl(src).then(dataUrl => ({ qid, img, dataUrl }))
          );
        });
      });
      const fetched = await Promise.all(fetchJobs);

      // Group by qid preserving order
      const byQid = {};
      fetched.forEach(({ qid, img, dataUrl }) => {
        if (!byQid[qid]) byQid[qid] = [];
        if (dataUrl) byQid[qid].push({ img, dataUrl });
      });

      const hasAnyPhoto = Object.values(byQid).some(arr => arr.length > 0);
      if (hasAnyPhoto) {
        newPage();
        doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 100, 100);
        doc.text('PHOTOS', ML, y); y += 14;
        const imgW = (CW - 10) / 2, imgH = imgW * 0.75;

        for (const [qid, items] of Object.entries(byQid)) {
          if (!items.length) continue;
          const qText  = QUESTION_TEXT_MAP[qid] || qid;
          const qLines = doc.splitTextToSize(qText, CW);
          check(20);
          doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(40, 40, 40);
          doc.text(qLines, ML, y); y += qLines.length * 11 + 4;

          let col = 0;
          for (const { dataUrl } of items) {
            try {
              check(imgH + 8);
              doc.addImage(dataUrl, 'JPEG', ML + col * (imgW + 10), y, imgW, imgH);
              col++;
              if (col >= 2) { col = 0; y += imgH + 8; }
            } catch (e) { console.warn('[PDF] addImage failed:', e.message); }
          }
          if (col > 0) y += imgH + 8;
          y += 6;
        }
      }
    }

    // Footer page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(180, 180, 180);
      doc.text('JMC Domino\'s \u2014 Confidential', ML, PH - 22);
      doc.text('Page ' + i + ' of ' + pageCount, PW - ML, PH - 22, { align: 'right' });
    }

    const today = new Date().toISOString().slice(0, 10);
    doc.save('JMC_Store' + (s.storeNumber || '') + '_' + inspectionType(s).replace(/\s+/g, '') + '_' + today + '.pdf');

  } catch (e) {
    console.error('[PDF] Generation failed:', e);
    alert('PDF generation failed: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '\u2193 Download PDF'; }
  }
}

// ---- Modal init (runs on every page that loads this script) ----

document.addEventListener('DOMContentLoaded', function () {
  const closeBtn = document.getElementById('subModalClose');
  const overlay  = document.getElementById('subOverlay');
  if (closeBtn) closeBtn.addEventListener('click', closeReportModal);
  if (overlay)  overlay.addEventListener('click', function (e) {
    if (e.target === this) closeReportModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay?.classList.contains('open')) closeReportModal();
  });
});
