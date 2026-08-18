/* Camera follows the player and centers rooms smaller than the viewport. */
(function () {
  "use strict";

  class Camera {
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this.x = 0;
      this.y = 0;
    }

    update(target, room) {
      const clamp = window.HyoUtils ? window.HyoUtils.clamp : (v, min, max) => Math.max(min, Math.min(max, v));
      const mapW = room.size.width;
      const mapH = room.size.height;

      if (mapW <= this.width) this.x = -(this.width - mapW) / 2;
      else this.x = clamp(target.x + target.width / 2 - this.width / 2, 0, mapW - this.width);

      if (mapH <= this.height) this.y = -(this.height - mapH) / 2;
      else this.y = clamp(target.y + target.height / 2 - this.height / 2, 0, mapH - this.height);
    }
  }

  window.Camera = Camera;
})();
