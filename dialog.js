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
      this.box.setAttribute("role", "button");
      this.box.setAttribute("aria-label", "대화 계속하기");
      this.box.addEventListener("click", (event) => {
        if (!this.active) return;
        event.preventDefault();
        this.advance();
      });
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
      this.next.textContent = this.index < this.lines.length - 1 ? "화면을 눌러 다음" : "화면을 눌러 닫기";
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
