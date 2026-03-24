/* ============================================================
   docProtect — watermark.js
   Applies a diagonal repeating watermark to JPG, PNG and PDF.
   Requires: pdf.js (pdfjsLib) and pdf-lib (PDFLib) from CDN.
   ============================================================ */

/**
 * Entry point.
 * @param {File} file
 * @param {{ destinataire: string, objet: string, date: string }} config
 * @returns {Promise<Blob>}
 */
async function applyWatermark(file, config) {
  var text = buildText(config);
  if (file.type === 'application/pdf') {
    return _watermarkPDF(file, text);
  }
  return _watermarkImage(file, text);
}

/* ---- Text builder ---- */

function buildText(config) {
  var parts = [config.destinataire];
  if (config.objet) parts.push(config.objet);
  if (config.date)  parts.push(_isoToDisplay(config.date));
  return parts.join(' \u2014 ');
}

function _isoToDisplay(iso) {
  var p = iso.split('-');
  return p[2] + '/' + p[1] + '/' + p[0];
}

/* ============================================================
   Image watermark (JPG / PNG)
   ============================================================ */

function _watermarkImage(file, text) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    var url = URL.createObjectURL(file);

    img.onload = function () {
      URL.revokeObjectURL(url);

      var canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      var ctx = canvas.getContext('2d');

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Overlay watermark
      _drawWatermark(ctx, canvas.width, canvas.height, text);

      // Steganography — encode watermark text in LSB (silent fail)
      try {
        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        hideData(imageData, text);
        ctx.putImageData(imageData, 0, 0);
      } catch (_) { /* steganography is optional */ }

      canvas.toBlob(function (blob) {
        if (blob) resolve(blob);
        else      reject(new Error('canvas.toBlob() returned null'));
      }, 'image/jpeg', 0.92);
    };

    img.onerror = function () {
      URL.revokeObjectURL(url);
      reject(new Error('Impossible de charger l\'image : ' + file.name));
    };

    img.src = url;
  });
}

/* ============================================================
   PDF watermark
   Renders each page to canvas via pdf.js, draws watermark,
   then repackages as a PDF via pdf-lib.
   ============================================================ */

async function _watermarkPDF(file, text) {
  var arrayBuffer = await file.arrayBuffer();

  // Load source PDF with pdf.js
  var loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  var pdfDoc = await loadingTask.promise;

  // Create output PDF with pdf-lib
  var outPdf = await PDFLib.PDFDocument.create();

  for (var pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    var page     = await pdfDoc.getPage(pageNum);
    var viewport = page.getViewport({ scale: 1.5 });

    var canvas  = document.createElement('canvas');
    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    var ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

    // Apply watermark on top
    _drawWatermark(ctx, canvas.width, canvas.height, text);

    // Convert to JPEG bytes
    var jpegBytes = _dataURLtoBytes(canvas.toDataURL('image/jpeg', 0.92));

    // Embed into output PDF
    var embImg  = await outPdf.embedJpg(jpegBytes);
    var outPage = outPdf.addPage([canvas.width, canvas.height]);
    outPage.drawImage(embImg, {
      x: 0,
      y: 0,
      width:  canvas.width,
      height: canvas.height,
    });
  }

  var pdfBytes = await outPdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/* ============================================================
   Core drawing — 3 diagonal watermark groups (25 / 50 / 75 %)
   Each group : separator line — text — separator line
   ============================================================ */

/**
 * Draws 3 watermark groups at 25%, 50% and 75% of canvas height.
 * Each group is rotated -30° and contains:
 *   — a horizontal rule the width of the text
 *   — the watermark text in bold 32px
 *   — a horizontal rule the width of the text
 * Vertical spacing between elements: 28px.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {string} text
 */
function _drawWatermark(ctx, width, height, text) {
  ctx.font         = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.globalAlpha  = 0.25;
  ctx.fillStyle    = '#8b0000';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  var textW   = ctx.measureText(text).width;
  var ruleH   = 2;   // épaisseur du trait horizontal (px)
  var spacing = 28;  // espacement vertical entre les éléments

  [0.25, 0.50, 0.75].forEach(function (frac) {
    ctx.save();
    ctx.translate(width / 2, height * frac);
    ctx.rotate(-Math.PI / 6);   // -30°

    // Ligne du dessus
    ctx.fillRect(-textW / 2, -spacing - ruleH / 2, textW, ruleH);
    // Texte centré
    ctx.fillText(text, 0, 0);
    // Ligne du dessous
    ctx.fillRect(-textW / 2, spacing - ruleH / 2, textW, ruleH);

    ctx.restore();
  });
}

/* ---- Utility ---- */

function _dataURLtoBytes(dataURL) {
  var base64 = dataURL.replace(/^data:[^;]+;base64,/, '');
  var binary = atob(base64);
  var bytes  = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
