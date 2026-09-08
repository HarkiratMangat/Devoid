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

  /* Max-channel distance -- the same test server/render.py's _ledger uses to
     classify a pixel against a reference colour (tol=20 there when nothing
     better is measured). Reused rather than invented: same repo, same shape
     of comparison, same unmeasured default. Anti-aliased edges land inside
     this tolerance; a differently-coloured neighbour does not. */
  var DEFAULT_TOLERANCE = 20;

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
