/* Tiny WebAudio manager. It gracefully stays silent if audio is unavailable. */
(function () {
  "use strict";

  class AudioManager {
    constructor() {
      this.context = null;
      this.enabled = true;
    }

    ensure() {
      if (!this.enabled || this.context) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.context = new AudioContext();
    }

    beep(frequency, duration, type) {
      this.ensure();
      if (!this.context) return;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = type || "sine";
      osc.frequency.value = frequency || 440;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(this.context.destination);
      osc.start();
      osc.stop(this.context.currentTime + (duration || 0.08));
    }

    interact() {
      this.beep(520, 0.07, "triangle");
    }

    reward() {
      this.beep(720, 0.12, "sine");
    }
  }

  window.AudioManager = AudioManager;
})();
