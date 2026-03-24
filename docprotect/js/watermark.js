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
   Core drawing — diagonal tiled watermark
   ============================================================ */

/**
 * Draws a diagonal repeating watermark over a canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {string} text
 */
function _drawWatermark(ctx, width, height, text) {
  ctx.save();

  // Font size scales with image width; clamped between 16px and 44px
  var fontSize = Math.max(16, Math.min(Math.floor(width / 22), 44));
  ctx.font = 'bold ' + fontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  var textWidth = ctx.measureText(text).width;
  var xSpacing  = textWidth + Math.round(fontSize * 2.5);
  var ySpacing  = Math.round(fontSize * 4);

  ctx.globalAlpha  = 0.35;
  ctx.fillStyle    = '#8b0000';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';

  // Rotate around the canvas centre
  var angle    = -Math.PI / 6;   // -30 degrees
  var diagonal = Math.ceil(Math.sqrt(width * width + height * height));

  ctx.translate(width / 2, height / 2);
  ctx.rotate(angle);

  // Tile over the full rotated area
  for (var y = -diagonal; y <= diagonal; y += ySpacing) {
    for (var x = -diagonal; x <= diagonal; x += xSpacing) {
      ctx.fillText(text, x, y);
    }
  }

  ctx.restore();
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
