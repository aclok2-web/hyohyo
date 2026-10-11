/* NPC wrapper and interaction behavior. */
(function () {
  "use strict";

  class NPC {
    constructor(data) {
      Object.assign(this, data);
      this.width = this.width || 32;
      this.height = this.height || 42;
      if (this.sprite) {
        this.image = new Image();
        this.image.src = this.sprite;
      }
      this.images = {};
      this.previousX = this.x;
      this.previousY = this.y;
      this.direction = this.direction || "down";
      this.moving = false;
    }

    update() {
      const dx = this.x - this.previousX;
      const dy = this.y - this.previousY;
      if (Math.abs(dx) > Math.abs(dy)) this.direction = dx < 0 ? "left" : "right";
      else if (dy !== 0) this.direction = dy < 0 ? "up" : "down";
      if (window.HYO_WALK) window.HYO_WALK.step(this, Math.hypot(dx, dy));
      this.previousX = this.x;
      this.previousY = this.y;
    }

    interact(game) {
      game.dialog.show(this.name, this.dialogs || ["..."], () => {
        if (this.reward) game.grantReward(this.reward, this.name);
        if (this.miniGame) game.startMiniGame(this.miniGame);
      });
    }

    getSpriteForGame(game) {
      if (this.spriteByCharacter && game && game.playerCharacter) {
        return this.spriteByCharacter[game.playerCharacter] || this.sprite;
      }
      return this.sprite;
    }

    getImage(src) {
      if (!src) return null;
      if (!this.images[src]) {
        const image = new Image();
        image.src = src;
        this.images[src] = image;
      }
      return this.images[src];
    }

    draw(ctx, camera, game) {
      const x = Math.round(this.x - camera.x);
      const y = Math.round(this.y - camera.y);
      const image = this.getImage(this.getSpriteForGame(game)) || this.image;
      const scale = game && game.npcScale ? game.npcScale : (window.HYO_CONSTANTS?.CHARACTER_SCALE || 2);
      if (window.HYO_WALK && window.HYO_WALK.draw(ctx, this.getSpriteForGame(game), this,
        x - ((this.displayWidth || 36) * scale - this.width) / 2,
        y + this.height, (this.displayWidth || 36) * scale, (this.displayHeight || 48) * scale)) return;
      if (image && image.complete && image.naturalWidth) {
        const frameWidth = this.spriteWidth || 36;
        const frameHeight = this.spriteHeight || 48;
        const displayWidth = (this.displayWidth || frameWidth) * scale;
        const displayHeight = (this.displayHeight || frameHeight) * scale;
        const frame = this.spriteFrame ?? 1;
        const row = this.spriteRow ?? 0;
        const drawX = Math.round(x - (displayWidth - this.width) / 2);
        const drawY = Math.round(y + this.height - displayHeight);
        ctx.drawImage(
          image,
          frame * frameWidth,
          row * frameHeight,
          frameWidth,
          frameHeight,
          drawX,
          drawY,
          displayWidth,
          displayHeight
        );
        return;
      }
      ctx.fillStyle = "#f0bc8f";
      ctx.fillRect(x + 7, y - this.height * (scale - 1), 18 * scale, 15 * scale);
      ctx.fillStyle = "#7f3f98";
      ctx.fillRect(x + 3, y + 15 - this.height * (scale - 1), 26 * scale, 25 * scale);
      ctx.fillStyle = "#2f2440";
      ctx.fillRect(x + 4, y + 38 - this.height * (scale - 1), 9 * scale, 8 * scale);
      ctx.fillRect(x + 19 * scale, y + 38 - this.height * (scale - 1), 9 * scale, 8 * scale);
    }
  }

  window.NPC = NPC;
})();
