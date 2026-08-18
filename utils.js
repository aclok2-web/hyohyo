/* Small reusable helpers. Kept dependency-free for direct browser loading. */
(function () {
  "use strict";

  const Utils = {
    clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    },

    rectsOverlap(a, b) {
      return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
      );
    },

    distance(a, b) {
      const ax = a.x + (a.width || 0) / 2;
      const ay = a.y + (a.height || 0) / 2;
      const bx = b.x + (b.width || 0) / 2;
      const by = b.y + (b.height || 0) / 2;
      return Math.hypot(ax - bx, ay - by);
    },

    drawRoundRect(ctx, x, y, width, height, radius) {
      const r = Math.min(radius, width / 2, height / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + width, y, x + width, y + height, r);
      ctx.arcTo(x + width, y + height, x, y + height, r);
      ctx.arcTo(x, y + height, x, y, r);
      ctx.arcTo(x, y, x + width, y, r);
      ctx.closePath();
    },

    loadImage(src) {
      const image = new Image();
      image.src = src;
      return image;
    },
  };

  window.HyoUtils = Utils;
})();
