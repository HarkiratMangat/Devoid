(function (global) {
  'use strict';

  /* Turn the region mark from a bounding box into the disputed pixels. The
     dispute is defined BY COLOUR (colourGroups groups by outline_color), so
     the correct mark is "the pixels inside the bbox that match that colour",
     not the rectangle around them. */

  function hexToRgb(hex) {
    var s = String(hex || '').replace(/^#/, '');
    var n = parseInt(s, 16) || 0;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  /* Max-channel distance. Measured against the corpus's one real
     ambiguous-protection case (megaphone.src.gif, region 002864, bbox
     94,56,164,145): the true navy pixels cluster tightly at distance 17-19
     (1,117 of 6,230 bbox px), then a hard gap -- the next value is 21, and
     values climb gradually (a real anti-aliasing gradient) up to 39 before
     jumping to an unrelated colour cluster at 46+. 30 sits in that gap: it
     sweeps in the AA tail (1,133 px, +16 over a bare exact-cluster cutoff)
     without reaching the next colour. ⚠️ This is ONE asset -- the corpus has
     no second real case to check this against; re-measure before trusting
     it on a differently-coloured region. */
  var DEFAULT_TOLERANCE = 30;

  function pixelMatchesHex(r, g, b, hex, tolerance) {
    var t = typeof tolerance === 'number' ? tolerance : DEFAULT_TOLERANCE;
    var ref = hexToRgb(hex);
    var dr = Math.abs(r - ref.r), dg = Math.abs(g - ref.g), db = Math.abs(b - ref.b);
    return Math.max(dr, dg, db) <= t;
  }

  /* A CSS mask, not a tint: only the alpha channel is used by mask-image
     (mask-mode defaults to match-source, which is alpha for a raster image),
     so RGB here is irrelevant and the existing hatch/fill supplies the look.
     `source` is anything drawImage accepts, already showing this region's
     home frame at SOURCE resolution. `bbox` is [x0,y0,x1,y1] in that same
     source-pixel space -- the engine's own coordinates, unconverted. */
  function regionMaskDataURL(doc, source, bbox, hex, tolerance) {
    var x0 = bbox[0], y0 = bbox[1], w = bbox[2] - bbox[0], h = bbox[3] - bbox[1];
    if (!(w > 0) || !(h > 0)) return null;
    var c = doc.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    ctx.drawImage(source, x0, y0, w, h, 0, 0, w, h);
    var img;
    try { img = ctx.getImageData(0, 0, w, h); }
    catch (e) { return null; }               // a tainted canvas: degrade to no mask
    var data = img.data;
    for (var i = 0; i < data.length; i += 4) {
      var match = pixelMatchesHex(data[i], data[i + 1], data[i + 2], hex, tolerance);
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = match ? 255 : 0;
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  var api = {
    hexToRgb: hexToRgb,
    pixelMatchesHex: pixelMatchesHex,
    regionMaskDataURL: regionMaskDataURL,
    DEFAULT_TOLERANCE: DEFAULT_TOLERANCE,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) { global.Devoid = global.Devoid || {}; global.Devoid.regionMask = api; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
