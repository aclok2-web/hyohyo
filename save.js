/* LocalStorage save/load with forgiving fallbacks. */
(function () {
  "use strict";

  class SaveManager {
    constructor(key) {
      this.key = key || "hyo_escape_save_v1";
    }

    save(game) {
      const data = {
        roomId: game.currentRoomId,
        player: { x: game.player.x, y: game.player.y },
        playerCharacter: game.playerCharacter || "boy",
        codes: game.codes,
        inventory: game.inventory,
        completed: game.completed,
        epilogueMode: Boolean(game.epilogueMode),
        epilogueCompleted: Array.from(game.epilogueCompleted || []),
        savedAt: Date.now(),
      };
      try {
        localStorage.setItem(this.key, JSON.stringify(data));
        return true;
      } catch (error) {
        console.warn("Save failed", error);
        return false;
      }
    }

    load() {
      try {
        const raw = localStorage.getItem(this.key);
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        console.warn("Load failed", error);
        return null;
      }
    }

    clear() {
      try {
        localStorage.removeItem(this.key);
      } catch (error) {
        console.warn("Clear failed", error);
      }
    }
  }

  window.SaveManager = SaveManager;
})();
