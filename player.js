/* Player movement and sprite animation. */
(function () {
  "use strict";

  const C = window.HYO_CONSTANTS || {};
  const CHARACTER_SPRITES = {
    boy: "assets/characters/boy/hyo_boy_walk.png",
    girl: "assets/characters/girl/hyo_girl_walk.png",
  };
  const SPRITE_WIDTH = 36;
  const SPRITE_HEIGHT = 48;
  const DISPLAY_WIDTH = 36;
  const DISPLAY_HEIGHT = 48;
  const FRAME_SEQUENCE = [0, 1, 2, 1];
  const DIRECTION_ROW = {
    down: 0,
    up: 1,
    left: 3,
    right: 2,
  };

  const sprites = {};
  Object.keys(CHARACTER_SPRITES).forEach((key) => {
    const image = new Image();
    image.src = CHARACTER_SPRITES[key];
    sprites[key] = image;
  });
  const parentSprites = {};
  ["boy", "girl"].forEach((key) => {
    const image = new Image();
    image.src = key === "girl" ? "assets/characters/parent_female.png" : "assets/characters/parent_male.png";
    parentSprites[key] = image;
  });

  class Player {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.width = C.PLAYER_WIDTH || 28;
      this.height = C.PLAYER_HEIGHT || 38;
      this.speed = C.PLAYER_SPEED || 2.4;
      this.direction = "down";
      this.frame = 0;
      this.frameTimer = 0;
      this.moving = false;
      this.darknessLevel = Player.darknessLevel || 0;
      this.character = Player.defaultCharacter || "boy";
      this.aged = false;
    }

    get rect() {
      return { x: this.x, y: this.y, width: this.width, height: this.height };
    }

    setPosition(x, y) {
      this.x = x;
      this.y = y;
    }

    setCharacter(character) {
      this.character = CHARACTER_SPRITES[character] ? character : "boy";
    }

    setAged(enabled) {
      this.aged = Boolean(enabled);
    }

    getFacingRect(distance) {
      const d = distance || 40;
      const rect = this.rect;
      if (this.direction === "up") return { x: rect.x, y: rect.y - d, width: rect.width, height: d };
      if (this.direction === "down") return { x: rect.x, y: rect.y + rect.height, width: rect.width, height: d };
      if (this.direction === "left") return { x: rect.x - d, y: rect.y, width: d, height: rect.height };
      return { x: rect.x + rect.width, y: rect.y, width: d, height: rect.height };
    }

    update(input, room) {
      let dx = 0;
      let dy = 0;
      if (input.left) dx = -this.speed;
      else if (input.right) dx = this.speed;
      else if (input.up) dy = -this.speed;
      else if (input.down) dy = this.speed;

      this.moving = dx !== 0 || dy !== 0;
      if (dx < 0) this.direction = "left";
      if (dx > 0) this.direction = "right";
      if (dy < 0) this.direction = "up";
      if (dy > 0) this.direction = "down";

      if (dx !== 0) this.tryMove(dx, 0, room);
      if (dy !== 0) this.tryMove(0, dy, room);

      if (this.moving) {
        this.frameTimer += 1;
        if (this.frameTimer > 10) {
          this.frame = (this.frame + 1) % 4;
          this.frameTimer = 0;
        }
      } else {
        this.frame = 0;
      }
    }

    tryMove(dx, dy, room) {
      const next = { x: this.x + dx, y: this.y + dy, width: this.width, height: this.height };
      if (!window.Collision || window.Collision.canMove(next, room)) {
        this.x += dx;
        this.y += dy;
      }
    }

    draw(ctx, camera) {
      const sx = Math.round(this.x - camera.x);
      const sy = Math.round(this.y - camera.y);
      const bob = this.moving && this.frame % 2 === 1 ? -2 : 0;
      const drawX = Math.round(sx + this.width / 2 - DISPLAY_WIDTH / 2);
      const drawY = Math.round(sy + this.height - DISPLAY_HEIGHT + bob);
      const row = DIRECTION_ROW[this.direction] || 0;
      const frame = FRAME_SEQUENCE[this.frame % FRAME_SEQUENCE.length];
      const level = Math.max(0, Math.min(2, this.darknessLevel || Player.darknessLevel || 0));
      const sprite = sprites[this.character] || sprites.boy;

      if (this.aged) {
        const parent = parentSprites[this.character] || parentSprites.boy;
        const sourceSize = 627;
        const sourceX = this.direction === "up" || this.direction === "right" ? sourceSize : 0;
        const sourceY = this.direction === "left" || this.direction === "right" ? sourceSize : 0;
        const width = 72;
        const height = 92;
        const agedX = Math.round(sx + this.width / 2 - width / 2);
        const agedY = Math.round(sy + this.height - height + bob);
        ctx.save();
        if (parent.complete && parent.naturalWidth) ctx.drawImage(parent, sourceX, sourceY, sourceSize, sourceSize, agedX, agedY, width, height);
        else this.drawFallback(ctx, agedX + 18, agedY + 40);
        ctx.restore();
        return;
      }

      ctx.save();
      ctx.filter = level === 2 ? "brightness(0.55) saturate(0.72)" : level === 1 ? "brightness(0.78) saturate(0.85)" : "none";
      if (sprite.complete && sprite.naturalWidth > 0) {
        ctx.drawImage(
          sprite,
          frame * SPRITE_WIDTH,
          row * SPRITE_HEIGHT,
          SPRITE_WIDTH,
          SPRITE_HEIGHT,
          drawX,
          drawY,
          DISPLAY_WIDTH,
          DISPLAY_HEIGHT
        );
      } else {
        this.drawFallback(ctx, drawX, drawY);
      }
      ctx.filter = "none";
      this.drawDarkness(ctx, drawX, drawY);
      ctx.restore();
    }

    drawFallback(ctx, x, y) {
      const isGirl = this.character === "girl";
      ctx.fillStyle = "#d7b09a";
      ctx.fillRect(x + 9, y + 10, 18, 15);
      ctx.fillStyle = "#e8dfcf";
      ctx.fillRect(x + 8, y + 22, 20, 16);
      ctx.fillStyle = "#161515";
      ctx.fillRect(x + (isGirl ? 8 : 11), y + 22, isGirl ? 20 : 14, isGirl ? 22 : 17);
      ctx.fillStyle = "#151414";
      ctx.fillRect(x + 10, y + 36, 16, 7);
      ctx.fillStyle = "#5a3722";
      ctx.fillRect(x + 8, y + 44, 9, 3);
      ctx.fillRect(x + 20, y + 44, 9, 3);
      ctx.fillStyle = isGirl ? "#b98445" : "#241814";
      ctx.fillRect(x + 8, y + 3, 21, 12);
      if (isGirl) {
        ctx.fillStyle = "#111015";
        ctx.fillRect(x + 9, y + 4, 7, 5);
        ctx.fillRect(x + 22, y + 4, 7, 5);
      }
      ctx.fillStyle = "#2a211f";
      ctx.fillRect(x + 13, y + 16, 3, 3);
      ctx.fillRect(x + 22, y + 16, 3, 3);
    }

    drawDarkness(ctx, x, y) {
      const level = Math.max(0, Math.min(2, this.darknessLevel || Player.darknessLevel || 0));
      if (!level) return;

      ctx.save();
      ctx.globalAlpha = level === 1 ? 0.38 : 0.72;
      ctx.fillStyle = level === 1 ? "rgba(22,18,22,0.72)" : "rgba(45,20,65,0.72)";
      ctx.beginPath();
      ctx.ellipse(x + DISPLAY_WIDTH / 2, y + 18, 16, level === 1 ? 7 : 12, 0, 0, Math.PI * 2);
      ctx.fill();

      if (level === 2) {
        ctx.fillStyle = "#b06cff";
        const eyeX = this.direction === "left" ? x + 12 : this.direction === "right" ? x + 24 : x + 22;
        ctx.beginPath();
        ctx.arc(eyeX, y + 16, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.42;
        for (let i = 0; i < 4; i++) {
          const drift = Math.sin((this.frame + i) * 1.7) * 4;
          ctx.beginPath();
          ctx.ellipse(x + 6 + i * 8 + drift, y + 30 - i * 5, 4, 10, -0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.globalAlpha = 0.24;
        ctx.fillStyle = "#1a131a";
        ctx.beginPath();
        ctx.ellipse(x + 8, y + 35, 4, 8, -0.35, 0, Math.PI * 2);
        ctx.ellipse(x + 28, y + 34, 4, 8, 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  Player.darknessLevel = 0;
  Player.defaultCharacter = "boy";

  Player.setDefaultCharacter = function (character) {
    Player.defaultCharacter = CHARACTER_SPRITES[character] ? character : "boy";
    return Player.defaultCharacter;
  };

  window.setDarknessLevel = function (level) {
    const value = Math.max(0, Math.min(2, Number(level) || 0));
    Player.darknessLevel = value;
    if (window.hyoEscapeGame && window.hyoEscapeGame.player) {
      window.hyoEscapeGame.player.darknessLevel = value;
    }
    return value;
  };

  window.HYO_CHARACTERS = {
    boy: {
      id: "boy",
      label: "남자 주인공",
      speaker: "소년",
      sprite: CHARACTER_SPRITES.boy,
    },
    girl: {
      id: "girl",
      label: "여자 주인공",
      speaker: "소녀",
      sprite: CHARACTER_SPRITES.girl,
    },
  };

  window.Player = Player;
})();
