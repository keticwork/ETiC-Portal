/* ============================================================
   docProtect — pdfExport.js
   Merges all watermarked blobs (images + PDFs) into one A4 PDF
   and triggers a browser download.
   Requires: pdf-lib (PDFLib) from CDN.
   ============================================================ */

/**
 * @param {{ blob: Blob, type: string }[]} items
 *   Each item is a processed blob with its MIME type.
 *   type is 'image/jpeg' for watermarked images,
 *   or 'application/pdf' for watermarked PDFs.
 *
 * @param {{ destinataire: string, objet: string, date: string }} config
 *   Used to build the output filename.
 *
 * @returns {Promise<void>}
 */
async function exportAllAsPDF(items, config) {
  var A4_W   = 595.28;  // pt
  var A4_H   = 841.89;  // pt
  var MARGIN = 24;      // pt

  var outPdf = await PDFLib.PDFDocument.create();

  for (var i = 0; i < items.length; i++) {
    var item  = items[i];
    var bytes = new Uint8Array(await item.blob.arrayBuffer());

    if (item.type === 'application/pdf') {
      // Copy pages from the already-watermarked PDF directly
      try {
        var srcPdf    = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
        var indices   = srcPdf.getPageIndices();
        var copied    = await outPdf.copyPages(srcPdf, indices);
        copied.forEach(function (p) { outPdf.addPage(p); });
      } catch (err) {
        console.warn('Impossible de copier le PDF ' + i + ' :', err);
      }
    } else {
      // Embed image on a centred A4 page
      var page = outPdf.addPage([A4_W, A4_H]);
      var img;

      try {
        img = item.type === 'image/png'
          ? await outPdf.embedPng(bytes)
          : await outPdf.embedJpg(bytes);
      } catch (embedErr) {
        // Fallback: try JPEG in case MIME type is wrong
        try {
          img = await outPdf.embedJpg(bytes);
        } catch (_) {
          console.warn('Impossible d\'intégrer l\'image ' + i + ' :', embedErr);
          continue;
        }
      }

      var maxW = A4_W - MARGIN * 2;
      var maxH = A4_H - MARGIN * 2;
      var dims = img.scaleToFit(maxW, maxH);

      page.drawImage(img, {
        x:      (A4_W - dims.width)  / 2,
        y:      (A4_H - dims.height) / 2,
        width:  dims.width,
        height: dims.height,
      });
    }
  }

  // Save and trigger download
  var pdfBytes = await outPdf.save();
  var blob     = new Blob([pdfBytes], { type: 'application/pdf' });
  var url      = URL.createObjectURL(blob);

  var filename = _buildFilename(config);

  var a = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Revoke after a short delay to allow the download to begin
  setTimeout(function () { URL.revokeObjectURL(url); }, 8000);
}

/* ---- Filename builder ---- */

function _buildFilename(config) {
  // Date: YYYYMMDD from ISO date
  var dateStr = config.date
    ? config.date.replace(/-/g, '')
    : _todayStr();

  // Destinataire: strip non-alphanumeric characters (keep accented chars)
  var dest = (config.destinataire || 'document')
    .replace(/\s+/g, '_')
    .replace(/[^\w\u00C0-\u024F_-]/g, '');

  return 'docProtect_' + dateStr + '_' + dest + '.pdf';
}

function _todayStr() {
  var d  = new Date();
  var y  = d.getFullYear();
  var m  = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return '' + y + m + dd;
}
