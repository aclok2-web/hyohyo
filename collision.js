/* Collision helpers for walls, doors, NPCs and interactive objects. */
(function () {
  "use strict";

  function overlap(a, b) {
    const helper = window.HyoUtils;
    if (helper && helper.rectsOverlap) return helper.rectsOverlap(a, b);
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  class Collision {
    static hitsAny(rect, colliders) {
      return (colliders || []).some((collider) => overlap(rect, collider));
    }

    static getSolidObjects(room) {
      const npcs = (room.npcs || []).map((npc) => Object.assign({ kind: "npc" }, npc));
      const objects = (room.objects || []).filter((object) => object.solid !== false);
      return npcs.concat(objects);
    }

    static canMove(rect, room) {
      if (!room) return false;
      const inside = rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= room.size.width && rect.y + rect.height <= room.size.height;
      return inside && !this.hitsAny(rect, (room.walls || []).concat(this.getSolidObjects(room)));
    }

    static doorAt(rect, room) {
      return (room.doors || []).find((door) => overlap(rect, door)) || null;
    }

    static nearestInteractable(player, room, maxDistance) {
      const reach = maxDistance || 44;
      const facing = player.getFacingRect(reach);
      const candidates = []
        .concat((room.npcs || []).map((item) => Object.assign({ kind: "npc" }, item)))
        .concat((room.objects || []).filter((item) => item.interactive !== false).map((item) => Object.assign({ kind: "object" }, item)))
        .concat((room.doors || []).map((item) => Object.assign({ kind: "door" }, item)));
      return candidates.find((item) => overlap(facing, item)) || null;
    }
  }

  window.Collision = Collision;
})();
