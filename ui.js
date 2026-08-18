/* Optional UI facade. main.js has fallbacks, so this file can be loaded later. */
(function () {
  "use strict";

  class GameUI {
    constructor() {
      this.roomName = document.getElementById("roomName");
      this.keys = document.getElementById("keys");
      this.message = document.getElementById("systemMessage");
      this.mission = document.getElementById("missionPopup");
      this.missionText = document.getElementById("missionText");
      this.itemList = document.getElementById("itemList");
    }

    setRoom(name) {
      if (this.roomName) this.roomName.textContent = name;
    }

    setProgress(codes, total) {
      if (this.keys) this.keys.textContent = `${codes.length}/${total} ` + "●".repeat(codes.length) + "○".repeat(Math.max(0, total - codes.length));
    }

    setInventory(items) {
      if (!this.itemList) return;
      this.itemList.innerHTML = "";
      items.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        this.itemList.appendChild(li);
      });
    }

    toast(text) {
      if (!this.message) return;
      this.message.textContent = text;
      this.message.classList.add("show");
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => this.message.classList.remove("show"), 1800);
    }

    missionPopup(text) {
      if (!this.mission || !this.missionText) return;
      this.missionText.textContent = text;
      this.mission.classList.add("show");
      clearTimeout(this.missionTimer);
      this.missionTimer = setTimeout(() => this.mission.classList.remove("show"), 2400);
    }
  }

  window.GameUI = GameUI;
})();
