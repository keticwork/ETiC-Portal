/* ============================================================
   docProtect — steganography.js
   Least Significant Bit (LSB) steganography on the red channel.
   Used to invisibly embed the watermark text in JPG/PNG images.
   ============================================================ */

/**
 * Encodes `text` into the LSB of the red channel of each pixel.
 * Modifies `imageData` in-place.
 *
 * @param {ImageData} imageData  — canvas ImageData (RGBA flat array)
 * @param {string}    text       — text to hide
 * @returns {ImageData}          — the same object, modified
 * @throws {Error}               — if the message is too long for the image
 */
function hideData(imageData, text) {
  var data    = imageData.data;
  var message = text + '\x00'; // null byte terminates the message

  // Build a binary string from UTF-8 char codes
  var bits = '';
  for (var i = 0; i < message.length; i++) {
    var code = message.charCodeAt(i);
    // Handle basic BMP codepoints (U+0000 – U+FFFF)
    bits += (code > 255 ? 63 : code).toString(2).padStart(8, '0'); // '?' for non-ASCII
  }

  // Each pixel supplies 1 bit (red channel LSB); 4 bytes per pixel
  var maxBits = Math.floor(data.length / 4);
  if (bits.length > maxBits) {
    throw new Error(
      'Message trop long (' + bits.length + ' bits) pour cette image (' + maxBits + ' pixels).'
    );
  }

  for (var b = 0; b < bits.length; b++) {
    var idx    = b * 4; // red channel of pixel b
    data[idx]  = (data[idx] & 0xFE) | (bits[b] === '1' ? 1 : 0);
  }

  return imageData;
}

/**
 * Decodes text previously hidden with `hideData`.
 * Reads LSB of red channel until a null byte is encountered.
 *
 * @param {ImageData} imageData
 * @returns {string}
 */
function readData(imageData) {
  var data   = imageData.data;
  var bits   = '';
  var result = '';
  var pixels = Math.floor(data.length / 4);

  for (var i = 0; i < pixels; i++) {
    bits += (data[i * 4] & 1).toString();

    if (bits.length === 8) {
      var code = parseInt(bits, 2);
      if (code === 0) break; // null terminator reached
      result += String.fromCharCode(code);
      bits = '';
    }
  }

  return result;
}
