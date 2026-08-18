/* Pokemon-style bottom dialog box. */
(function () {
  "use strict";

  class DialogSystem {
    constructor() {
      this.box = document.getElementById("dialogBox");
      this.speaker = document.getElementById("speaker");
      this.text = document.getElementById("dialogText");
      this.next = document.getElementById("next");
      this.lines = [];
      this.index = 0;
      this.onClose = null;
      this.active = false;
      this.hide();
    }

    show(name, lines, onClose) {
      this.lines = Array.isArray(lines) ? lines : [String(lines || "")];
      this.index = 0;
      this.onClose = onClose || null;
      this.active = true;
      this.box.style.display = "block";
      this.speaker.textContent = name || "시스템";
      this.render();
    }

    render() {
      this.text.textContent = this.lines[this.index] || "";
      this.next.textContent = this.index < this.lines.length - 1 ? "ENTER 다음" : "ENTER 닫기";
    }

    advance() {
      if (!this.active) return false;
      if (this.index < this.lines.length - 1) {
        this.index += 1;
        this.render();
        return true;
      }
      this.hide();
      if (this.onClose) this.onClose();
      return true;
    }

    hide() {
      this.active = false;
      if (this.box) this.box.style.display = "none";
    }
  }

  window.DialogSystem = DialogSystem;
})();
