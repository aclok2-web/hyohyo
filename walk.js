/* Shared distance-driven walking. Original assets remain as fallbacks. */
(function () {
  "use strict";
  const root = "assets/characters/";
  const entries = [
    ["boy", "boy/hyo_boy_walk.png"], ["girl", "girl/hyo_girl_walk.png"],
    ["child_boy", "npc/child_boy_walk.png"], ["child_girl", "npc/child_girl_walk.png"],
    ["teen_boy", "npc/teen_boy_walk.png"], ["teen_girl", "npc/teen_girl_walk.png"],
    ["mom", "npc/mom_walk.png"], ["father", "npc/father_walk.png"],
    ["grandmother", "npc/grandmother_walk.png"],
    ["parent_male", "parent_male_transparent.png"], ["parent_female", "parent_female_transparent.png"],
  ];
  const sprites = {}, aliases = {};
  entries.forEach(([id, oldPath]) => {
    const image = new Image();
    image.src = `${root}walking/${id}-walk-v2.png`;
    sprites[id] = image;
    aliases[root + oldPath] = id;
  });
  const rows = { down: 0, up: 1, right: 2, left: 3 };
  const sequence = [1, 2, 3, 2];
  window.HYO_WALK = {
    entries, sprites,
    step(actor, distance) {
      actor.moving = distance > 0.001;
      if (actor.moving) {
        actor.walkDistance = ((actor.walkDistance || 0) + distance) % 72;
        if (actor.walkDistance < 0.000001 || 72 - actor.walkDistance < 0.000001) actor.walkDistance = 0;
        actor.walkPhase = actor.walkDistance / 72;
        actor.frame = Math.floor(actor.walkPhase * 4 + 0.00000001) % 4;
      } else {
        actor.walkDistance = 0;
        actor.walkPhase = 0;
        actor.frame = 0;
      }
    },
    draw(ctx, idOrPath, actor, x, footY, width, height) {
      const image = sprites[aliases[idOrPath] || idOrPath];
      if (!image || !image.complete || !image.naturalWidth) return false;
      const column = actor.moving ? sequence[(actor.frame || 0) % 4] : 0;
      const row = rows[actor.direction] ?? 0;
      const bob = actor.moving ? -Math.abs(Math.sin((actor.walkPhase || 0) * Math.PI * 2)) * 1.5 : 0;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, column * 72, row * 96, 72, 96,
        Math.round(x), Math.round(footY - height + bob), width, height);
      ctx.restore();
      return true;
    },
  };
})();
