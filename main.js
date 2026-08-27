/* Main game loop and orchestration. */
(function () {
  "use strict";

  // 뒷이야기의 움직이는 부모 캐릭터는 체크무늬를 제거한 투명 시트를 사용한다.
  if (window.Player) {
    const originalPlayerDraw = window.Player.prototype.draw;
    const agedSheets = {};
    ["boy", "girl"].forEach((key) => {
      const image = new Image();
      image.src = key === "girl" ? "assets/characters/parent_female_transparent.png" : "assets/characters/parent_male_transparent.png";
      agedSheets[key] = image;
    });
    window.Player.prototype.draw = function (ctx, camera) {
      if (!this.aged) return originalPlayerDraw.call(this, ctx, camera);
      const sx = Math.round(this.x - camera.x), sy = Math.round(this.y - camera.y);
      const bob = this.moving && this.frame % 2 === 1 ? -2 : 0;
      const size = 627;
      const sourceX = this.direction === "up" || this.direction === "right" ? size : 0;
      const sourceY = this.direction === "left" || this.direction === "right" ? size : 0;
      const width = 72, height = 92;
      const drawX = Math.round(sx + this.width / 2 - width / 2);
      const drawY = Math.round(sy + this.height - height + bob);
      const image = agedSheets[this.character] || agedSheets.boy;
      if (image.complete && image.naturalWidth) ctx.drawImage(image, sourceX, sourceY, size, size, drawX, drawY, width, height);
      else originalPlayerDraw.call(this, ctx, camera);
    };
  }

  const DEFAULT_CONSTANTS = {
    GAME_WIDTH: 960,
    GAME_HEIGHT: 540,
    TILE_SIZE: 48,
    INTERACTION_DISTANCE: 42,
    PASSWORD_TOTAL: 10,
    SAVE_KEY: "hyo_escape_save_v1",
  };

  function constants() {
    return Object.assign({}, DEFAULT_CONSTANTS, window.HYO_CONSTANTS || {});
  }

  class HyoEscapeGame {
    constructor() {
      this.canvas = document.getElementById("gameCanvas");
      this.ctx = this.canvas.getContext("2d");
      this.constants = constants();
      this.input = { up: false, down: false, left: false, right: false };
      this.currentRoomId = "livingroom";
      this.currentRoom = window.ROOMS[this.currentRoomId];
      this.player = new window.Player(this.currentRoom.spawn.x, this.currentRoom.spawn.y);
      this.camera = new window.Camera(this.canvas.width, this.canvas.height);
      this.dialog = new window.DialogSystem();
      this.saveManager = new window.SaveManager(this.constants.SAVE_KEY);
      this.audio = window.AudioManager ? new window.AudioManager() : null;
      this.horrorBgm = new Audio("assets/audio/horror_after_call.mp3?v=2");
      this.horrorBgm.preload = "auto";
      this.horrorBgm.loop = true;
      this.horrorBgm.volume = .34;
      this.epilogueBgm = new Audio("assets/audio/horror_after_call.mp3?v=2");
      this.epilogueBgm.preload = "auto";
      this.epilogueBgm.loop = true;
      this.epilogueBgm.volume = .38;
      this.codes = [];
      this.inventory = [];
      this.completed = {};
      this.playerCharacter = "boy";
      this.paused = false;
      this.started = false;
      this.lastAutoSave = 0;
      this.npcs = [];
      this.hasSaveData = false;
      this.characterOptions = ["boy", "girl"];
      this.selectedCharacterIndex = 0;
      this.epilogueMode = false;
      this.epilogueCompleted = new Set();
      this.pendingFatherApology = false;
      this.fatherApologyShown = false;
      this.epilogueOrder = ["entrance", "yard", "hall", "teen", "kitchen", "livingroom"];
      this.epilogueStories = {
        entrance: ["또 늦게 들어왔다고 화내실 거죠? 집에 오기 싫었어요.", "기다림이 걱정이었다는 것을 모른 채, 그 마음을 간섭이라고 밀어냈었구나."],
        yard: ["왜 이런 일까지 제가 해야 해요? 귀찮게 하지 마세요.", "함께 짐을 들자는 작은 부탁에도 차갑게 답했던 말이 부모님께 상처가 되었겠구나."],
        hall: ["지금 바쁜데 왜 계속 말을 걸어요? 나중에요.", "잠깐의 대화를 미루는 동안 부모님은 복도에서 여러 번 발걸음을 돌리셨겠구나."],
        teen: ["제 방문 좀 마음대로 열지 마세요! 아무도 내 마음을 몰라요.", "나를 걱정해 다가온 마음을 침범이라 여기고 문부터 닫아버렸구나."],
        kitchen: ["또 밥 먹으라는 말이에요? 알아서 할게요.", "밥은 먹었니라는 평범한 한마디에 담긴 사랑을 잔소리라고만 생각했구나."],
        livingroom: ["다른 부모님은 다 해주는데 왜 우리 집만 안 돼요?", "비교하는 말 뒤에 가려진 부모님의 노력과 사정을 이제야 바라보게 된다."],
      };

      this.dom = {
        roomName: document.getElementById("roomName"),
        keys: document.getElementById("keys"),
        help: document.getElementById("help"),
        title: document.getElementById("titleScreen"),
        start: document.getElementById("startBtn"),
        pause: document.getElementById("pauseMenu"),
        resume: document.getElementById("resumeBtn"),
        save: document.getElementById("saveBtn"),
        exit: document.getElementById("exitBtn"),
        inventory: document.getElementById("inventory"),
        itemList: document.getElementById("itemList"),
        message: document.getElementById("systemMessage"),
        mission: document.getElementById("missionPopup"),
        missionText: document.getElementById("missionText"),
        ending: document.getElementById("endingScreen"),
        epilogue: document.getElementById("epilogueBtn"),
        endingRestart: document.getElementById("endingRestartBtn"),
        fade: document.getElementById("fade"),
        characterSelect: document.getElementById("characterSelect"),
        characterCards: Array.from(document.querySelectorAll("[data-character]")),
        characterHint: document.getElementById("characterHint"),
        momCallSequence: document.getElementById("momCallSequence"),
        momMissingText: document.getElementById("momMissingText"),
        momCallScreen: document.getElementById("momCallScreen"),
        momCallImage: document.getElementById("momCallImage"),
      };
      if (this.dom.momCallSequence && this.dom.momCallSequence.parentElement !== document.body) {
        document.body.appendChild(this.dom.momCallSequence);
      }

      this.assets = this.loadAssets();
      this.bindEvents();
      this.bindMobileControls();
      this.bindMiniGameEvents();
      this.loadGame();
      this.syncMiniGameCompletion();
      this.applyCharacter(this.playerCharacter);
      this.setupTitleScreen();
      this.enterRoom(this.currentRoomId, this.player.x, this.player.y, false);
      this.updateUI();
      requestAnimationFrame((time) => this.loop(time));
    }

    loadAssets() {
      const names = ["player", "tiles", "npc", "objects"];
      const assets = {};
      names.forEach((name) => {
        const img = new Image();
        img.src = `assets/${name}.png`;
        assets[name] = img;
      });
      return assets;
    }

    bindEvents() {
      window.addEventListener("keydown", (event) => this.onKey(event, true));
      window.addEventListener("keyup", (event) => this.onKey(event, false));
      window.addEventListener("pointerdown", () => this.syncBackgroundMusic(), { capture: true });
      this.dom.start.addEventListener("click", () => {
        if (this.playerCharacter) requestMobileFullscreen();
        this.start();
      });
      this.dom.resume.addEventListener("click", () => {
        requestMobileFullscreen();
        this.togglePause(false);
      });
      this.dom.save.addEventListener("click", () => {
        this.saveGame();
        this.toast("저장되었습니다.");
      });
      this.dom.exit.addEventListener("click", () => {
        this.restartFromBeginning();
      });
      if (this.dom.epilogue) this.dom.epilogue.addEventListener("click", () => this.startEpilogue());
      if (this.dom.endingRestart) this.dom.endingRestart.addEventListener("click", () => this.restartFromBeginning());
      this.dom.characterCards.forEach((button) => {
        button.addEventListener("click", () => this.selectCharacter(button.dataset.character));
      });
      if (this.dom.momCallScreen) this.dom.momCallScreen.addEventListener("click", () => this.answerMomCall());
    }

    bindMiniGameEvents() {
      window.addEventListener("message", (event) => {
        if (event.origin !== window.location.origin && event.origin !== "null") return;
        if (!event.data) return;
        if (event.data.type === "hyo-find-complete") {
          this.completeHyoFindGame();
        }
        if (event.data.type === "nagging-quiz-complete") {
          this.completeNaggingQuiz();
        }
        if (event.data.type === "mom-find-complete") {
          this.completeNaggingQuiz();
        }
        if (event.data.type === "father-game-complete") {
          this.completeFatherGame();
        }
        if (event.data.type === "close-mini-game" || /-complete$/.test(event.data.type)) {
          if (typeof window.closeMiniGameOverlay === "function") setTimeout(window.closeMiniGameOverlay, 1800);
        }
      });
      window.addEventListener("storage", (event) => {
        if (event.key === "hyo_find_complete" && event.newValue) this.completeHyoFindGame();
        if (event.key === "nagging_quiz_complete" && event.newValue) this.completeNaggingQuiz();
        if (event.key === "mom_find_complete" && event.newValue) this.completeNaggingQuiz();
        if (event.key === "father_game_complete" && event.newValue) this.completeFatherGame();
        if (event.newValue && /_game_complete$|_quiz_complete$|^hyo_find_complete$/.test(event.key || "")) {
          if (typeof window.closeMiniGameOverlay === "function") setTimeout(window.closeMiniGameOverlay, 1800);
        }
      });
    }

    bindMobileControls() {
      const joystick = document.getElementById("moveJoystick");
      const knob = document.getElementById("joystickKnob");
      const action = document.getElementById("mobileActionBtn");
      if (!joystick || !knob || !action) return;

      let activePointer = null;
      const reset = () => {
        this.input.up = this.input.down = this.input.left = this.input.right = false;
        knob.style.transform = "translate(-50%, -50%)";
        activePointer = null;
      };
      const move = (event) => {
        if (activePointer !== event.pointerId) return;
        event.preventDefault();
        const rect = joystick.getBoundingClientRect();
        const radius = rect.width * 0.31;
        let dx = event.clientX - (rect.left + rect.width / 2);
        let dy = event.clientY - (rect.top + rect.height / 2);
        const distance = Math.hypot(dx, dy) || 1;
        if (distance > radius) { dx = dx / distance * radius; dy = dy / distance * radius; }
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        const threshold = radius * 0.24;
        this.input.left = dx < -threshold;
        this.input.right = dx > threshold;
        this.input.up = dy < -threshold;
        this.input.down = dy > threshold;
      };
      joystick.addEventListener("pointerdown", (event) => {
        activePointer = event.pointerId;
        joystick.setPointerCapture(event.pointerId);
        move(event);
      });
      joystick.addEventListener("pointermove", move);
      joystick.addEventListener("pointerup", reset);
      joystick.addEventListener("pointercancel", reset);
      window.addEventListener("blur", reset);

      action.addEventListener("click", (event) => {
        event.preventDefault();
        if (this.dialog.active) this.dialog.advance();
        else if (this.started && !this.paused) this.interact();
      });
    }

    syncMiniGameCompletion() {
      if (localStorage.getItem("hyo_find_complete")) this.completeHyoFindGame(false);
      if (localStorage.getItem("nagging_quiz_complete")) this.completeNaggingQuiz(false);
      if (localStorage.getItem("mom_find_complete")) this.completeNaggingQuiz(false);
      if (localStorage.getItem("father_game_complete")) this.completeFatherGame(false);
    }

    clearProgressStorage() {
      this.saveManager.clear();
      ["hyo_find_complete", "nagging_quiz_complete", "mom_find_complete", "father_game_complete"].forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn("Progress clear failed", error);
        }
      });
    }

    onKey(event, pressed) {
      const key = event.key.toLowerCase();
      if (pressed) this.syncBackgroundMusic();
      if (pressed && this.dom.title.style.display !== "none" && !this.hasSaveData) {
        if (key === "arrowleft" || key === "a") {
          event.preventDefault();
          this.selectCharacterByOffset(-1);
          return;
        }
        if (key === "arrowright" || key === "d") {
          event.preventDefault();
          this.selectCharacterByOffset(1);
          return;
        }
        if (key === "enter") {
          event.preventDefault();
          this.start();
          return;
        }
      }
      const map = {
        arrowup: "up",
        w: "up",
        arrowdown: "down",
        s: "down",
        arrowleft: "left",
        a: "left",
        arrowright: "right",
        d: "right",
      };

      if (map[key]) {
        this.input[map[key]] = pressed;
        event.preventDefault();
      }

      if (!pressed) return;
      if (key === "enter" || key === "e") {
        event.preventDefault();
        if (this.dialog.active) this.dialog.advance();
        else if (this.started && !this.paused) this.interact();
      }
      if (key === "escape") this.togglePause(!this.paused);
      if (key === "i") this.dom.inventory.classList.toggle("show");
    }

    start() {
      if (!this.playerCharacter) {
        if (this.dom.characterHint) this.dom.characterHint.textContent = "먼저 주인공을 선택하세요.";
        return;
      }
      this.applyCharacter(this.playerCharacter);
      this.started = true;
      document.getElementById("game").classList.add("mobile-playing");
      this.dom.title.style.display = "none";
      this.showMission("미션을 해결하며 10개의 비밀번호 글자를 하나씩 찾아보세요.");
      if (this.pendingFatherApology) {
        this.pendingFatherApology = false;
        setTimeout(() => this.showFatherApology(), 500);
      }
    }

    selectCharacter(character) {
      if (!window.HYO_CHARACTERS || !window.HYO_CHARACTERS[character]) return;
      this.playerCharacter = character;
      this.selectedCharacterIndex = Math.max(0, this.characterOptions.indexOf(character));
      this.applyCharacter(character);
      this.renderCharacterSelection();
    }

    selectCharacterByOffset(offset) {
      const length = this.characterOptions.length;
      this.selectedCharacterIndex = (this.selectedCharacterIndex + offset + length) % length;
      this.selectCharacter(this.characterOptions[this.selectedCharacterIndex]);
    }

    applyCharacter(character) {
      const selected = window.HYO_CHARACTERS && window.HYO_CHARACTERS[character] ? character : "boy";
      this.playerCharacter = selected;
      if (this.player && typeof this.player.setCharacter === "function") this.player.setCharacter(selected);
      if (window.Player && typeof window.Player.setDefaultCharacter === "function") window.Player.setDefaultCharacter(selected);
    }

    setupTitleScreen() {
      if (this.hasSaveData) {
        this.dom.title.classList.remove("has-save");
        this.selectedCharacterIndex = Math.max(0, this.characterOptions.indexOf(this.playerCharacter || "boy"));
        this.renderCharacterSelection();
        if (this.dom.characterHint) this.dom.characterHint.textContent = `${this.characterLabel()} 저장 데이터가 있습니다. 다른 주인공을 고르면 선택한 캐릭터로 이어서 시작합니다.`;
        return;
      }
      this.dom.title.classList.remove("has-save");
      this.playerCharacter = "";
      this.renderCharacterSelection();
    }

    renderCharacterSelection() {
      this.dom.characterCards.forEach((button) => {
        const selected = button.dataset.character === this.playerCharacter;
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      this.dom.start.disabled = !this.playerCharacter;
      if (this.dom.characterHint) {
        this.dom.characterHint.textContent = this.playerCharacter
          ? `${this.characterLabel()} 선택됨. Enter 또는 시작 버튼으로 진행하세요.`
          : "캐릭터를 선택한 뒤 이야기를 시작하세요.";
      }
    }

    characterLabel() {
      return this.playerCharacter === "girl" ? "여자 주인공" : "남자 주인공";
    }

    loop(time) {
      if (this.started && !this.paused && !this.dialog.active) this.update(time);
      this.render();
      requestAnimationFrame((next) => this.loop(next));
    }

    update(time) {
      this.player.update(this.input, this.activeRoom());
      this.camera.update(this.player, this.currentRoom);

      const door = window.Collision.doorAt(this.player.rect, this.currentRoom);
      if (door) {
        if (!this.epilogueMode) this.enterRoom(door.to, door.spawn.x, door.spawn.y, true);
        else if (this.canUseEpilogueDoor(door)) this.enterRoom(door.to, door.spawn.x, door.spawn.y, true);
        else {
          this.player.setPosition(110, this.player.y);
          if (!this.epilogueDoorNotice || time - this.epilogueDoorNotice > 1200) {
            this.toast(this.epilogueCompleted.has(this.currentRoomId) ? "뒷이야기는 왼쪽 문을 따라 거실로 돌아갑니다." : "이 장소의 아이와 먼저 이야기해 보세요.");
            this.epilogueDoorNotice = time;
          }
        }
      }

      if (time - this.lastAutoSave > 10000) {
        this.saveGame();
        this.lastAutoSave = time;
      }
    }

    enterRoom(roomId, x, y, fade) {
      const room = window.ROOMS[roomId];
      if (!room) return;
      this.currentRoomId = roomId;
      this.currentRoom = room;
      this.npcs = this.visibleNpcs(room).map((npc) => new window.NPC(npc));
      this.player.setPosition(x, y);
      this.camera.update(this.player, room);
      if (fade && this.dom.fade) {
        this.dom.fade.classList.add("show");
        setTimeout(() => this.dom.fade.classList.remove("show"), 130);
      }
      this.updateUI();
      if (this.started || this.hasSaveData) this.saveGame();
    }

    interact() {
      const target = window.Collision.nearestInteractable(this.player, this.activeRoom(), this.constants.INTERACTION_DISTANCE || 42);
      if (!target) {
        this.toast("조사할 수 있는 대상 앞에서 E 또는 Enter를 눌러보세요.");
        return;
      }

      if (this.audio) this.audio.interact();

      if (target.kind === "npc") {
        if (this.epilogueMode && target.epilogueStory) {
          const lines = target.dialogs || ["..."];
          const protagonist = this.playerCharacter === "girl" ? "어머니" : "아버지";
          this.dialog.show("아이", [lines[0]], () => {
            this.dialog.show(protagonist, lines.slice(1), () => this.completeEpilogueStory(this.currentRoomId));
          });
          return;
        }
        const npc = new window.NPC(target);
        npc.interact(this);
        return;
      }

      if (target.kind === "door") {
        this.dialog.show(target.name, [`${target.name}(으)로 이동합니다.`], () => this.enterRoom(target.to, target.spawn.x, target.spawn.y, true));
        return;
      }

      if (target.ending) {
        this.tryEnding();
        return;
      }

      if (this.epilogueMode && this.currentRoomId === "livingroom" && target.id === "living_tv") {
        if (!this.epilogueCompleted.has("livingroom")) {
          this.dialog.show("TV", ["거실에 남아 있는 아이의 이야기를 먼저 들어보자."]);
          return;
        }
        this.finishEpilogue();
        return;
      }

      this.dialog.show(target.name, target.dialogs || ["살펴보았지만 특별한 것은 없다."], () => {
        if (target.reward) this.grantReward(target.reward, target.name);
        if (target.miniGame) this.startMiniGame(target.miniGame);
      });
    }

    grantReward(reward, source) {
      if (!reward) return;
      const key = `${this.currentRoomId}:${source}:${reward.code || reward.item}`;
      if (this.completed[key]) return;
      this.completed[key] = true;

      if (reward.code && !this.codes.includes(reward.code)) this.codes.push(reward.code);
      if (reward.item && !this.inventory.includes(reward.item)) this.inventory.push(reward.item);
      if (this.audio) this.audio.reward();
      const clue = this.passwordClues().find((item) => item.code === reward.code);
      this.toast(`비밀번호 글자 ${clue ? clue.letter : reward.code || ""} 획득`);
      this.updateUI();
      this.saveGame();
      if (reward.code === "4") this.startHorrorBgm();
    }

    startMiniGame(roomId) {
      if (typeof window.startMiniGame === "function") {
        const opened = window.startMiniGame(roomId);
        if (opened) this.toast(`연계 화면 열기: ${opened}`);
        else this.toast(`연계 HTML이 아직 지정되지 않았습니다: ${roomId}`);
        return;
      }
      this.toast(`미니게임 연결: startMiniGame("${roomId}")`);
    }

    completeHyoFindGame(showToast = true) {
      if (this.completed["livingroom:hyo_find_complete"]) return;
      this.completed["livingroom:hyo_find_complete"] = true;
      if (!this.codes.includes("1")) this.codes.push("1");
      if (!this.inventory.includes("TV 속 효 글자")) this.inventory.push("TV 속 효 글자");
      if (showToast) this.toast("효찾기 완료! 거실에 새 쪽지가 나타났습니다.");
      this.updateUI();
      this.saveGame();
    }

    completeNaggingQuiz(showToast = true) {
      if (this.completed["kitchen:mom_nagging_complete"]) return;
      this.completed["kitchen:mom_nagging_complete"] = true;
      if (!this.codes.includes("4")) this.codes.push("4");
      if (!this.inventory.includes("찾아낸 진짜 엄마")) this.inventory.push("찾아낸 진짜 엄마");
      if (this.currentRoomId === "kitchen") {
        this.npcs = this.visibleNpcs(this.currentRoom).map((npc) => new window.NPC(npc));
      }
      if (showToast) this.toast("엄마찾기 완료! 그런데 엄마가 갑자기 사라졌습니다.");
      this.updateUI();
      this.saveGame();
      this.startHorrorBgm();
      if (showToast) this.startMomCallSequence();
    }

    completeFatherGame(showDialog = true) {
      if (this.completed["hall:father_game_complete"]) return;
      this.completed["hall:father_game_complete"] = true;
      if (this.currentRoomId === "hall") {
        this.npcs = this.visibleNpcs(this.currentRoom).map((npc) => new window.NPC(npc));
      }
      this.saveGame();
      if (showDialog && this.started) {
        setTimeout(() => this.showFatherApology(), 2800);
      } else if (showDialog || !this.started) {
        this.pendingFatherApology = true;
      }
    }

    showFatherApology() {
      if (this.fatherApologyShown || !this.started) return;
      this.fatherApologyShown = true;
      const child = this.playerCharacter === "girl" ? "딸아" : "아들아";
      this.dialog.show("아버지", [`미안해…… ${child}.`]);
    }

    wait(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    vibrate(pattern) {
      if (navigator.vibrate) navigator.vibrate(pattern);
    }

    setMomCallRinging(ringing) {
      if (!this.dom.momCallSequence) return;
      this.dom.momCallSequence.classList.toggle("ringing", ringing);
      if (ringing) {
        this.vibrate([450, 180, 450, 180, 450]);
        clearInterval(this.momVibrationTimer);
        this.momVibrationTimer = setInterval(() => this.vibrate([450, 180, 450]), 1400);
      } else {
        clearInterval(this.momVibrationTimer);
        this.momVibrationTimer = null;
        this.vibrate(0);
      }
    }

    async startMomCallSequence() {
      if (this.momCallRunning || !this.dom.momCallSequence) return;
      this.momCallRunning = true;
      this.paused = true;
      document.body.classList.add("mom-call-active");
      this.dom.momCallImage.src = "ChatGPT Image 2026년 8월 18일 오전 10_26_40.png";
      this.dom.momMissingText.classList.remove("hide");
      this.dom.momCallSequence.classList.remove("call-connected");
      this.dom.momCallSequence.classList.add("portrait-mode");
      this.dom.momCallSequence.classList.add("show");
      this.dom.momCallSequence.setAttribute("aria-hidden", "false");
      if (screen.orientation && typeof screen.orientation.lock === "function") {
        screen.orientation.lock("portrait").catch(() => {});
      }
      await this.wait(1600);
      if (!this.momCallRunning) return;
      this.dom.momMissingText.classList.add("hide");
      this.setMomCallRinging(true);
    }

    playMomCallVoice() {
      return new Promise((resolve) => {
        const voice = new Audio("assets/audio/mom_call_voice.mp3?v=1");
        voice.preload = "auto";
        voice.volume = 1;
        voice.onended = resolve;
        voice.onerror = resolve;
        const playback = voice.play();
        if (playback && typeof playback.catch === "function") playback.catch(resolve);
      });
    }

    playScream() {
      return new Promise((resolve) => {
        const scream = new Audio("assets/audio/mom_scream.mp3?v=2");
        scream.preload = "auto";
        scream.volume = .92;
        scream.onended = resolve;
        scream.onerror = resolve;
        const playback = scream.play();
        if (playback && typeof playback.catch === "function") playback.catch(resolve);
      });
    }

    startHorrorBgm() {
      if (!this.horrorBgm || !this.codes.includes("4") || this.epilogueMode || !this.horrorBgm.paused) return;
      const playback = this.horrorBgm.play();
      if (playback && typeof playback.catch === "function") playback.catch(() => {});
    }

    stopHorrorBgm() {
      if (!this.horrorBgm) return;
      this.horrorBgm.pause();
      this.horrorBgm.currentTime = 0;
    }

    startEpilogueBgm() {
      if (!this.epilogueBgm || !this.epilogueMode || !this.epilogueBgm.paused) return;
      const playback = this.epilogueBgm.play();
      if (playback && typeof playback.catch === "function") playback.catch(() => {});
    }

    stopEpilogueBgm() {
      if (!this.epilogueBgm) return;
      this.epilogueBgm.pause();
      this.epilogueBgm.currentTime = 0;
    }

    syncBackgroundMusic() {
      if (this.epilogueMode) {
        this.stopHorrorBgm();
        this.startEpilogueBgm();
      } else if (this.codes.includes("4")) {
        this.startHorrorBgm();
      }
    }

    async answerMomCall() {
      if (!this.momCallRunning || this.momCallAnswered) return;
      if (screen.orientation && typeof screen.orientation.lock === "function") {
        screen.orientation.lock("portrait").catch(() => {});
      }
      this.momCallAnswered = true;
      this.setMomCallRinging(false);
      this.dom.momCallSequence.classList.add("call-connected");
      this.dom.momCallImage.src = "ChatGPT Image 2026년 8월 18일 오전 09_15_20.png";
      await this.wait(3000);
      await this.playMomCallVoice();
      await this.playScream();
      this.dom.momCallImage.src = "ChatGPT Image 2026년 8월 18일 오전 09_15_32.png";
      this.dom.momCallSequence.classList.add("ringing");
      this.vibrate(3000);
      await this.wait(3000);
      this.finishMomCallSequence();
    }

    finishMomCallSequence() {
      this.setMomCallRinging(false);
      this.dom.momCallSequence.classList.remove("show", "call-connected", "ringing", "portrait-mode");
      this.dom.momCallSequence.setAttribute("aria-hidden", "true");
      document.body.classList.remove("mom-call-active");
      this.momCallRunning = false;
      this.momCallAnswered = false;
      this.paused = false;
      if (screen.orientation && typeof screen.orientation.lock === "function") {
        screen.orientation.lock("landscape").catch(() => {});
      }
      this.startHorrorBgm();
    }

    isNpcVisible(npc) {
      return !npc.hiddenWhenCompleted || !this.completed[npc.hiddenWhenCompleted];
    }

    visibleNpcs(room) {
      if (this.epilogueMode) return [this.epilogueNpc(room.id)];
      return (room.npcs || []).filter((npc) => this.isNpcVisible(npc));
    }

    epilogueNpc(roomId) {
      const positions = { entrance:[525,308], yard:[650,335], hall:[365,310], teen:[585,350], kitchen:[690,330], livingroom:[640,365] };
      const position = positions[roomId] || [560,340];
      return { id:`epilogue_child_${roomId}`, name:"아이", x:position[0], y:position[1], width:32, height:42, spriteByCharacter:{boy:"assets/characters/boy/hyo_boy_walk.png",girl:"assets/characters/girl/hyo_girl_walk.png"}, spriteWidth:36, spriteHeight:48, displayWidth:36, displayHeight:48, dialogs:this.epilogueStories[roomId] || ["..."], epilogueStory:true };
    }

    canUseEpilogueDoor(door) {
      const index = this.epilogueOrder.indexOf(this.currentRoomId);
      const next = this.epilogueOrder[index + 1];
      return this.epilogueCompleted.has(this.currentRoomId) && door.to === next;
    }

    completeEpilogueStory(roomId) {
      this.epilogueCompleted.add(roomId);
      this.updateUI();
      this.saveGame();
      this.toast(roomId === "livingroom" ? "마지막 이야기를 들었습니다. TV를 확인하세요." : "이야기를 들었습니다. 왼쪽 문이 열렸습니다.");
    }

    isObjectVisible(object) {
      return !object.hiddenUntilCompleted || Boolean(this.completed[object.hiddenUntilCompleted]);
    }

    activeRoom() {
      if (!this.currentRoom) return this.currentRoom;
      const objects = (this.currentRoom.objects || [])
        .filter((object) => this.isObjectVisible(object))
        .map((object) => {
          if (!this.epilogueMode) return object;
          const isEndingTv = this.currentRoomId === "livingroom" && object.id === "living_tv";
          return Object.assign({}, object, { interactive: isEndingTv });
        });
      return Object.assign({}, this.currentRoom, {
        npcs: this.visibleNpcs(this.currentRoom),
        objects,
      });
    }

    passwordClues() {
      return [
        { code: "1", letter: "L", label: "거실 TV 효찾기" },
        { code: "2", letter: "O", label: "거실 가족사진" },
        { code: "3", letter: "V", label: "거실 속담 쪽지" },
        { code: "4", letter: "E", label: "부엌 잔소리 퀴즈" },
        { code: "5", letter: "F", label: "부엌 냉장고 메모" },
        { code: "6", letter: "A", label: "사춘기방 과거의 나" },
        { code: "7", letter: "M", label: "복도 아버지의 부탁" },
        { code: "8", letter: "I", label: "마당 할머니의 부탁" },
        { code: "9", letter: "L", label: "마당 짐" },
        { code: "10", letter: "Y", label: "현관 가족사진" },
      ];
    }

    missingPasswordClues() {
      return this.passwordClues().filter((clue) => !this.codes.includes(clue.code));
    }

    tryEnding() {
      const missing = this.missingPasswordClues();
      if (missing.length) {
        const lines = [
          `아직 비밀번호가 ${missing.length}개 부족합니다.`,
          ...missing.map((clue) => `${clue.code}번째 글자: ${clue.label}`),
        ];
        this.dialog.show("현관문", lines);
        this.toast(`비밀번호가 ${missing.length}개 더 필요합니다.`);
        return;
      }
      this.dom.ending.classList.add("show");
      this.started = false;
      this.saveGame();
    }

    saveGame() {
      if (this.saveManager.save(this)) this.hasSaveData = true;
    }

    startEpilogue() {
      this.epilogueMode = true;
      this.stopHorrorBgm();
      this.startEpilogueBgm();
      this.epilogueCompleted = new Set();
      this.started = true;
      this.paused = false;
      this.player.setAged(true);
      this.dom.ending.classList.remove("show");
      this.enterRoom("entrance", 930, 320, true);
      this.showMission("비밀번호 대신 아이의 이야기를 들으며 현관에서 거실까지 거꾸로 돌아가세요.");
      this.saveGame();
    }

    finishEpilogue() {
      this.started = false;
      const title = document.getElementById("endingTitle");
      const text = document.getElementById("endingText");
      const visual = document.getElementById("endingVisual");
      const actions = document.getElementById("endingActions");
      if (this.dom.epilogue) this.dom.epilogue.style.display = "none";
      if (actions) actions.style.display = "none";
      title.textContent = "TV 속 가족사진";
      text.textContent = "함께 웃던 가족의 시간이 화면에 비칩니다.";
      if (visual) {
        visual.classList.remove("crying-hold");
        visual.src = "assets/objects/epilogue_tv_family_photo_transparent.png";
        visual.alt = "TV에 나타난 가족사진";
        visual.classList.add("show");
      }
      this.dom.ending.classList.add("show");
      setTimeout(() => {
        title.textContent = "후회의 눈물";
        text.textContent = "사진을 바라보던 부모님의 눈에서 참았던 눈물이 흐릅니다.";
        if (visual) {
          const character = this.playerCharacter === "girl" ? "female" : "male";
          let frame = 1;
          visual.src = `assets/objects/epilogue_cry_${character}_${frame}.png?v=2`;
          visual.alt = "후회의 눈물을 흘리는 부모님";
          visual.classList.remove("crying-hold");
          clearInterval(this.cryingFrameTimer);
          this.cryingFrameTimer = setInterval(() => {
            frame += 1;
            visual.src = `assets/objects/epilogue_cry_${character}_${frame}.png?v=2`;
            if (frame === 4) {
              clearInterval(this.cryingFrameTimer);
              this.cryingFrameTimer = null;
              visual.classList.add("crying-hold");
            }
          }, 850);
        }
      }, 3500);
      setTimeout(() => {
        clearInterval(this.cryingFrameTimer);
        this.cryingFrameTimer = null;
        if (visual) visual.classList.remove("show", "crying-hold");
        title.textContent = "오늘, 효를 실천하세요.";
        text.innerHTML = "그때 조금만 더 잘해드릴걸.<br>그 한마디를 후회로 남기지 마세요.<br>효를 실천할 수 있는 가장 좋은 날은 오늘입니다.";
        if (actions) actions.style.display = "flex";
      }, 8000);
      this.saveGame();
    }

    restartFromBeginning() {
      this.stopHorrorBgm();
      this.stopEpilogueBgm();
      this.clearProgressStorage();
      this.codes = [];
      this.inventory = [];
      this.completed = {};
      this.playerCharacter = "";
      this.selectedCharacterIndex = 0;
      this.hasSaveData = false;
      this.started = false;
      document.getElementById("game").classList.remove("mobile-playing");
      this.paused = false;
      this.lastAutoSave = 0;
      this.epilogueMode = false;
      this.epilogueCompleted = new Set();
      this.pendingFatherApology = false;
      this.fatherApologyShown = false;
      this.player.setAged(false);
      if (this.dom.epilogue) this.dom.epilogue.style.display = "inline-block";
      document.getElementById("endingTitle").textContent = "마음의 문이 열렸습니다.";
      document.getElementById("endingText").textContent = "이제 부모님의 마음을 이해할 수 있을 것 같습니다.";

      this.dom.pause.classList.remove("show");
      this.dom.ending.classList.remove("show");
      this.dom.inventory.classList.remove("show");
      this.dom.mission.classList.remove("show");
      this.dom.message.classList.remove("show");

      const firstRoom = window.ROOMS.livingroom;
      this.currentRoomId = "livingroom";
      this.currentRoom = firstRoom;
      this.enterRoom("livingroom", firstRoom.spawn.x, firstRoom.spawn.y, false);
      this.setupTitleScreen();
      this.dom.title.style.display = "grid";
      this.updateUI();
      this.toast("처음부터 다시 시작합니다.");
    }

    loadGame() {
      const data = this.saveManager.load();
      if (!data || !window.ROOMS[data.roomId]) return;
      this.hasSaveData = true;
      this.currentRoomId = data.roomId;
      this.currentRoom = window.ROOMS[this.currentRoomId];
      if (data.player) this.player.setPosition(data.player.x, data.player.y);
      this.playerCharacter = data.playerCharacter === "girl" ? "girl" : "boy";
      this.codes = Array.isArray(data.codes) ? data.codes : [];
      this.inventory = Array.isArray(data.inventory) ? data.inventory : [];
      this.completed = data.completed || {};
      this.epilogueMode = Boolean(data.epilogueMode);
      this.epilogueCompleted = new Set(Array.isArray(data.epilogueCompleted) ? data.epilogueCompleted : []);
      this.player.setAged(this.epilogueMode);
    }

    togglePause(show) {
      this.paused = show;
      this.dom.pause.classList.toggle("show", show);
      if (show) this.saveGame();
    }

    updateUI() {
      this.dom.roomName.textContent = this.currentRoom.name;
      this.dom.keys.textContent = this.epilogueMode ? `이야기 ${this.epilogueCompleted.size}/6` : this.passwordClues().map((clue) => this.codes.includes(clue.code) ? clue.letter : "＿").join(" ");
      this.dom.help.textContent = this.epilogueMode ? "방향키/WASD 이동   E/Enter 아이와 대화·TV 보기   왼쪽 문으로 이동" : "방향키/WASD 이동   E/Enter 조사   I 가방   Esc 일시정지";
      this.dom.itemList.innerHTML = "";
      this.inventory.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        this.dom.itemList.appendChild(li);
      });
    }

    toast(text) {
      this.dom.message.textContent = text;
      this.dom.message.classList.add("show");
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => this.dom.message.classList.remove("show"), 1800);
    }

    showMission(text) {
      this.dom.missionText.textContent = text;
      this.dom.mission.classList.add("show");
      clearTimeout(this.missionTimer);
      this.missionTimer = setTimeout(() => this.dom.mission.classList.remove("show"), 2600);
    }

    render() {
      this.drawRoom(this.currentRoom);
      const activeRoom = this.activeRoom();
      this.drawObjects(activeRoom);
      this.npcs.forEach((npc) => npc.draw(this.ctx, this.camera, this));
      this.player.draw(this.ctx, this.camera);
      this.drawForeground(activeRoom);
    }

    drawRoom(room) {
      const ctx = this.ctx;
      ctx.fillStyle = "#070709";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.save();
      ctx.translate(-this.camera.x, -this.camera.y);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = room.floor || "#2a2425";
      ctx.fillRect(0, 0, room.size.width, room.size.height);

      const tile = this.constants.TILE_SIZE || 48;
      const theme = this.decorThemeForRoom(room.id);
      this.drawTiledDecor(theme.floor, 0, 0, room.size.width, room.size.height, tile * 2);
      this.drawTiledDecor(theme.wall, 0, tile, room.size.width, tile * 3, tile * 2);

      ctx.fillStyle = "rgba(0,0,0,0.09)";
      for (let x = 0; x <= room.size.width; x += tile * 2) {
        for (let y = tile * 4; y <= room.size.height; y += tile * 2) {
          ctx.fillRect(x, y, tile, tile);
        }
      }

      ctx.strokeStyle = "rgba(236,211,148,0.12)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= room.size.width; x += tile) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, room.size.height);
        ctx.stroke();
      }
      for (let y = 0; y <= room.size.height; y += tile) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(room.size.width, y);
        ctx.stroke();
      }

      this.drawRoomDecorations(room, tile);

      room.walls.forEach((wall) => {
        ctx.fillStyle = room.wallColor || "#2a191b";
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        ctx.fillStyle = "rgba(214,190,134,0.13)";
        ctx.fillRect(wall.x, wall.y, wall.width, 4);
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
      });

      room.doors.forEach((door) => this.drawDoor(door, theme));
      ctx.restore();
    }

    decorThemeForRoom(roomId) {
      const themes = {
        livingroom: { floor: "floor_wood", wall: "wall_flower", door: "door_brown" },
        kitchen: { floor: "floor_tile_gray", wall: "wall_white_brick", door: "door_green" },
        teen: { floor: "floor_parquet", wall: "wall_blue", door: "door_blue" },
        hall: { floor: "floor_stone", wall: "wall_green", door: "door_brown" },
        yard: { floor: "floor_clay", wall: "wall_brick", door: "door_round" },
        entrance: { floor: "floor_checker", wall: "wall_brick", door: "door_brown" },
      };
      return themes[roomId] || themes.livingroom;
    }

    decorImage(name) {
      return this.getObjectImage(`assets/decor/${name}.png`);
    }

    drawDecorImage(name, x, y, w, h) {
      const image = this.decorImage(name);
      if (!image || !image.complete || !image.naturalWidth) return false;
      this.ctx.drawImage(image, x, y, w, h);
      return true;
    }

    livingImage(name) {
      return this.getObjectImage(`assets/livingroom/${name}.png`);
    }

    drawLivingImage(name, x, y, w, h) {
      const image = this.livingImage(name);
      if (!image || !image.complete || !image.naturalWidth) return false;
      this.ctx.drawImage(image, x, y, w, h);
      return true;
    }

    kitchenImage(name) {
      return this.getObjectImage(`assets/kitchen/${name}.png`);
    }

    drawKitchenImage(name, x, y, w, h) {
      const image = this.kitchenImage(name);
      if (!image || !image.complete || !image.naturalWidth) return false;
      this.ctx.drawImage(image, x, y, w, h);
      return true;
    }

    teenImage(name) {
      return this.getObjectImage(`assets/teen/${name}.png`);
    }

    drawTeenImage(name, x, y, w, h) {
      const image = this.teenImage(name);
      if (!image || !image.complete || !image.naturalWidth) return false;
      this.ctx.drawImage(image, x, y, w, h);
      return true;
    }

    hallImage(name) {
      return this.getObjectImage(`assets/hall/${name}.png`);
    }

    drawHallImage(name, x, y, w, h) {
      const image = this.hallImage(name);
      if (!image || !image.complete || !image.naturalWidth) return false;
      this.ctx.drawImage(image, x, y, w, h);
      return true;
    }

    yardImage(name) {
      return this.getObjectImage(`assets/yard/${name}.png`);
    }

    drawYardImage(name, x, y, w, h) {
      const image = this.yardImage(name);
      if (!image || !image.complete || !image.naturalWidth) return false;
      this.ctx.drawImage(image, x, y, w, h);
      return true;
    }

    entranceImage(name) {
      return this.getObjectImage(`assets/entrance/${name}.png`);
    }

    drawEntranceImage(name, x, y, w, h) {
      const image = this.entranceImage(name);
      if (!image || !image.complete || !image.naturalWidth) return false;
      this.ctx.drawImage(image, x, y, w, h);
      return true;
    }

    drawTiledDecor(name, x, y, w, h, size) {
      const image = this.decorImage(name);
      if (!image || !image.complete || !image.naturalWidth) return false;
      const ctx = this.ctx;
      for (let ty = y; ty < y + h; ty += size) {
        for (let tx = x; tx < x + w; tx += size) {
          ctx.drawImage(image, tx, ty, Math.min(size, x + w - tx), Math.min(size, y + h - ty));
        }
      }
      return true;
    }

    drawDoor(door, theme) {
      const ctx = this.ctx;
      const w = Math.max(54, Math.min(74, door.width + 16));
      const h = Math.max(92, Math.min(124, door.height + 20));
      const x = door.x + door.width / 2 - w / 2;
      const y = door.y + door.height / 2 - h / 2;
      if (this.drawDecorImage(theme.door, x, y, w, h)) return;

      ctx.fillStyle = "#3a2116";
      ctx.fillRect(door.x, door.y, door.width, door.height);
      ctx.strokeStyle = "#9f7d45";
      ctx.strokeRect(door.x + 3, door.y + 3, door.width - 6, door.height - 6);
      ctx.fillStyle = "#d8b765";
      ctx.fillRect(door.x + door.width / 2 - 3, door.y + door.height / 2, 6, 6);
    }

    drawRoomDecorations(room, tile) {
      const ctx = this.ctx;
      const id = room.id;
      ctx.save();
      ctx.lineWidth = 3;

      if (id === "livingroom") {
        this.drawLivingImage("window_curtain", 75, 74, 255, 196) || this.drawFramedDecor("frame_landscape", 95, 82, 190, 120);
        this.drawLivingImage("clock_wall", 332, 88, 54, 76);
        this.drawLivingImage("wall_shelf", 400, 92, 230, 66);
        if (this.epilogueMode) this.drawObjectImage("assets/objects/epilogue_family_photo.png", 650, 74, 150, 120);
        else this.drawLivingImage("family_frame", 650, 74, 150, 120);
        this.drawLivingImage("lamp", 806, 150, 62, 212);
        this.drawLivingImage("rug_large", 245, 376, 420, 190) || this.drawRug(250, 390, 360, 170, "#6f3c54", "#d7b36b", "rug_red");
        this.drawLivingImage("sofa", 252, 234, 470, 166) || this.drawSoftRect(650, 335, 270, 90, "#355168", "#1c2c3b");
        this.drawLivingImage("coffee_table", 338, 400, 310, 112);
        this.drawLivingImage("tv_console", 718, 270, 360, 224);
        this.drawLivingImage("book_shelf_small", 900, 85, 210, 108);
        this.drawLivingImage("plant_group", 92, 292, 250, 74) || this.drawPlant(120, 150, "plant_round", 92, 92);
      } else if (id === "kitchen") {
        this.drawKitchenImage("backsplash", 120, 76, 450, 126) || this.drawTileBand(80, 70, 630, 95, "#50372b", "#614637");
        this.drawKitchenImage("counter_full", 95, 102, 620, 352) || this.drawCounter(120, 118, 430, 68);
        this.drawKitchenImage("fridge", 745, 98, 160, 260);
        this.drawKitchenImage("spice_shelf", 790, 82, 270, 132);
        this.drawKitchenImage("jar_shelf", 838, 205, 228, 80);
        this.drawKitchenImage("green_rug", 210, 425, 500, 112) || this.drawRug(300, 455, 310, 85, "#7d583a", "#e0c07c", "rug_round");
        this.drawKitchenImage("table_long", 270, 360, 390, 108);
        this.drawKitchenImage("prep_counter", 712, 352, 300, 80);
        this.drawKitchenImage("dish_rack", 110, 302, 170, 48);
        this.drawKitchenImage("cutting_board", 560, 318, 132, 58);
        this.drawKitchenImage("fruit_bowl", 405, 335, 120, 70);
        this.drawKitchenImage("rice_cooker", 925, 420, 82, 76);
        this.drawKitchenImage("toaster", 730, 440, 132, 88);
        this.drawKitchenImage("microwave", 850, 305, 185, 80);
      } else if (id === "teen") {
        this.drawTeenImage("poster_dream", 120, 74, 86, 104);
        this.drawTeenImage("poster_love", 220, 76, 78, 104);
        this.drawTeenImage("poster_rock", 316, 76, 76, 104);
        this.drawTeenImage("poster_sky", 410, 76, 78, 104);
        this.drawTeenImage("poster_fighting", 508, 74, 88, 108);
        this.drawTeenImage("photo_line", 90, 205, 260, 70);
        this.drawTeenImage("small_shelf", 675, 82, 245, 96);
        this.drawTeenImage("rug_pink", 405, 378, 390, 176) || this.drawRug(465, 420, 230, 120, "#454075", "#9f92d5", "rug_purple");
        this.drawTeenImage("bed", 96, 310, 310, 250) || this.drawBed(115, 405, 250, 130);
        this.drawTeenImage("desk", 610, 280, 390, 270) || this.drawDeskDecor(720, 395, 230, 95);
        this.drawTeenImage("chair", 858, 337, 92, 178);
        this.drawTeenImage("bookcase_wide", 940, 82, 170, 260) || this.drawShelf(145, 92, 190, 130, "#4d3b65", "shelf_books");
        this.drawTeenImage("mirror", 1015, 310, 120, 235);
        this.drawTeenImage("lamp", 405, 330, 58, 106);
        this.drawTeenImage("digital_clock", 475, 456, 102, 56);
        this.drawTeenImage("backpack", 210, 390, 100, 108);
        this.drawTeenImage("doll", 332, 425, 74, 76);
        this.drawTeenImage("books_stack", 702, 445, 86, 78);
        this.drawTeenImage("pencil_cup", 938, 300, 52, 96);
        this.drawTeenImage("drink", 650, 455, 46, 72);
      } else if (id === "hall") {
        this.drawHallImage("frame_landscape_big", 150, 78, 150, 116);
        this.drawHallImage("frame_flower_tall", 330, 86, 76, 108);
        this.drawHallImage("frame_oval", 440, 76, 92, 112);
        this.drawHallImage("frame_landscape_small", 575, 86, 102, 102);
        this.drawHallImage("frame_leaf_tall", 710, 84, 76, 110);
        this.drawHallImage("frame_street", 835, 86, 120, 108);
        this.drawHallImage("frame_family", 985, 78, 132, 132);
        this.drawHallImage("rug_runner", 245, 320, 670, 126) || this.drawRug(260, 315, 640, 96, "#394b5b", "#b6c3cf", "rug_blue");
        this.drawHallImage("cabinet_plant", 95, 330, 190, 222);
        this.drawHallImage("side_table", 890, 325, 150, 220);
        this.drawHallImage("umbrella_stand", 1005, 300, 92, 210) || this.drawUmbrellaStand(160, 420);
        this.drawHallImage("box_closed", 345, 435, 145, 115);
        this.drawHallImage("box_open", 735, 430, 165, 118);
      } else if (id === "yard") {
        this.drawYardImage("grass_tile", 70, 70, 230, 260);
        this.drawYardImage("grass_tile", 320, 340, 230, 260);
        this.drawYardImage("garden_bed", 130, 125, 245, 245) || this.drawGardenBed(165, 128, 290, 98);
        this.drawYardImage("tree_green", 650, 72, 190, 292) || this.drawTree(790, 130);
        this.drawYardImage("tree_flower", 875, 72, 180, 282);
        this.drawYardImage("tree_fruit", 1000, 305, 180, 282) || this.drawTree(990, 420);
        this.drawYardImage("fence_gate", 820, 505, 270, 100);
        this.drawYardImage("clothesline", 95, 500, 245, 126);
        this.drawYardImage("water_pump", 410, 470, 108, 130);
        this.drawYardImage("dog_house", 560, 468, 150, 142);
        this.drawYardImage("stone_path", 430, 330, 230, 100) || this.drawSteppingStones(420, 475, 7);
        this.drawYardImage("stones_curve", 665, 420, 245, 68);
        this.drawYardImage("flower_white", 430, 118, 86, 82);
        this.drawYardImage("flower_yellow", 520, 122, 86, 76);
        this.drawYardImage("flower_pink", 430, 205, 86, 82);
        this.drawYardImage("flower_purple", 522, 205, 86, 84);
        this.drawYardImage("barrel_flower", 1040, 115, 118, 132);
        this.drawYardImage("rock", 910, 380, 105, 78);
        this.drawYardImage("logs", 720, 505, 95, 110);
        this.drawYardImage("pots", 960, 410, 130, 130);
        this.drawYardImage("boxes", 100, 350, 265, 96);
      } else if (id === "entrance") {
        this.drawTileBand(70, 70, 1000, 150, "#3a3028", "#4b3b2d");
        this.drawEntranceImage("front_door", 955, 198, 118, 214);
        this.drawEntranceImage("rug_green", 435, 426, 285, 112) || this.drawRug(460, 430, 260, 86, "#73523b", "#d3b36b", "rug_green");
        this.drawEntranceImage("shoe_cabinet_closed", 690, 82, 240, 196);
        this.drawEntranceImage("landscape_frame", 116, 82, 92, 76);
        if (this.epilogueMode) {
          this.drawObjectImage("assets/objects/epilogue_family_photo.png", 230, 90, 86, 70);
          this.drawObjectImage("assets/objects/epilogue_family_photo.png", 346, 72, 150, 138);
        } else {
          this.drawEntranceImage("small_family_frame", 230, 90, 86, 70);
          this.drawEntranceImage("family_frame", 346, 72, 150, 138);
        }
        this.drawEntranceImage("plant_big", 116, 290, 104, 170);
        this.drawEntranceImage("plant_small", 232, 335, 72, 96);
        this.drawEntranceImage("umbrella_full", 915, 318, 94, 145) || this.drawUmbrellaStand(930, 315);
        this.drawEntranceImage("rug_brown", 110, 475, 170, 112);
        this.drawEntranceImage("rug_blue", 790, 446, 180, 112);
      }

      ctx.restore();
    }

    drawSoftRect(x, y, w, h, fill, stroke) {
      const ctx = this.ctx;
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.fillRect(x + 8, y + h - 3, w, 12);
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = stroke;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.09)";
      ctx.fillRect(x + 8, y + 8, w - 16, 10);
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      for (let px = x + 12; px < x + w - 12; px += 32) ctx.fillRect(px, y + h - 18, 16, 6);
    }

    drawRug(x, y, w, h, fill, trim, imageName) {
      if (imageName && this.drawDecorImage(imageName, x, y, w, h)) return;
      const ctx = this.ctx;
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = trim;
      ctx.lineWidth = 5;
      ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      for (let px = x + 24; px < x + w - 24; px += 32) {
        for (let py = y + 24; py < y + h - 24; py += 32) {
          ctx.fillRect(px, py, 12, 12);
        }
      }
      ctx.lineWidth = 2;
    }

    drawWindow(x, y, w, h) {
      const ctx = this.ctx;
      ctx.fillStyle = "#8fc8dc";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#f0dca7";
      ctx.lineWidth = 5;
      ctx.strokeRect(x, y, w, h);
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w / 2, y + h);
      ctx.moveTo(x, y + h / 2);
      ctx.lineTo(x + w, y + h / 2);
      ctx.stroke();
      ctx.lineWidth = 2;
    }

    drawPlant(x, y, imageName, w, h) {
      if (imageName && this.drawDecorImage(imageName, x, y, w || 84, h || 90)) return;
      const ctx = this.ctx;
      ctx.fillStyle = "#70513b";
      ctx.fillRect(x + 20, y + 44, 44, 34);
      ctx.fillStyle = "#8c674a";
      ctx.fillRect(x + 26, y + 50, 32, 8);
      ctx.fillStyle = "#4f9a50";
      this.drawPixelLeaf(x + 18, y + 22, 28, 16);
      this.drawPixelLeaf(x + 34, y + 8, 22, 34);
      this.drawPixelLeaf(x + 52, y + 24, 28, 16);
      ctx.fillStyle = "#6fbd58";
      this.drawPixelLeaf(x + 28, y + 30, 24, 14);
      this.drawPixelLeaf(x + 46, y + 34, 24, 14);
    }

    drawPixelLeaf(x, y, w, h) {
      const ctx = this.ctx;
      ctx.fillRect(x + 8, y, w - 16, h);
      ctx.fillRect(x, y + 4, w, h - 8);
    }

    drawTileBand(x, y, w, h, fill, stroke) {
      const ctx = this.ctx;
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = stroke;
      for (let tx = x; tx <= x + w; tx += 48) {
        ctx.beginPath();
        ctx.moveTo(tx, y);
        ctx.lineTo(tx, y + h);
        ctx.stroke();
      }
      for (let ty = y; ty <= y + h; ty += 48) {
        ctx.beginPath();
        ctx.moveTo(x, ty);
        ctx.lineTo(x + w, ty);
        ctx.stroke();
      }
    }

    drawCounter(x, y, w, h) {
      const ctx = this.ctx;
      this.drawSoftRect(x, y, w, h, "#7c5638", "#3a2519");
      ctx.fillStyle = "#d7bf8a";
      ctx.fillRect(x, y, w, 15);
    }

    drawSink(x, y) {
      const ctx = this.ctx;
      ctx.fillStyle = "#a8b8bd";
      ctx.fillRect(x, y, 72, 34);
      ctx.strokeStyle = "#f0f4f1";
      ctx.strokeRect(x + 8, y + 7, 56, 20);
    }

    drawStove(x, y) {
      const ctx = this.ctx;
      ctx.fillStyle = "#222";
      ctx.fillRect(x, y, 86, 36);
      ctx.strokeStyle = "#d9d9d9";
      for (let i = 0; i < 3; i++) {
        const cx = x + 12 + i * 24;
        ctx.strokeRect(cx, y + 10, 16, 16);
        ctx.fillRect(cx + 5, y + 15, 6, 6);
      }
    }

    drawShelf(x, y, w, h, fill, imageName) {
      if (imageName && this.drawDecorImage(imageName, x, y, w, h)) return;
      const ctx = this.ctx;
      this.drawSoftRect(x, y, w, h, fill, "#281d18");
      ctx.fillStyle = "rgba(255,230,160,0.5)";
      for (let sy = y + 38; sy < y + h; sy += 42) ctx.fillRect(x + 8, sy, w - 16, 6);
    }

    drawBed(x, y, w, h) {
      const ctx = this.ctx;
      this.drawSoftRect(x, y, w, h, "#5a3c3e", "#24171a");
      ctx.fillStyle = "#d7d2c6";
      ctx.fillRect(x + 16, y + 14, 88, 42);
      ctx.fillStyle = "#6e89aa";
      ctx.fillRect(x + 12, y + 58, w - 24, h - 70);
    }

    drawDeskDecor(x, y, w, h) {
      const ctx = this.ctx;
      this.drawSoftRect(x, y, w, h, "#6d472c", "#2b1a10");
      ctx.fillStyle = "#d8c88a";
      ctx.fillRect(x + 25, y + 16, 70, 46);
      ctx.fillStyle = "#333";
      ctx.fillRect(x + 118, y + 18, 68, 42);
    }

    drawPoster(x, y, w, h, fill) {
      const ctx = this.ctx;
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#d8c58a";
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillRect(x + 12, y + 12, w - 24, 18);
    }

    drawFramedDecor(imageName, x, y, w, h) {
      if (this.drawDecorImage(imageName, x, y, w, h)) return;
      this.drawWindow(x, y, w, h);
    }

    drawWallFrames(x, y, count, fill) {
      const ctx = this.ctx;
      const frames = ["frame_landscape", "frame_flower", "frame_oval", "frame_leaf"];
      for (let i = 0; i < count; i++) {
        if (this.drawDecorImage(frames[i % frames.length], x + i * 145, y - 12, 90, 82)) continue;
        ctx.fillStyle = fill;
        ctx.fillRect(x + i * 145, y, 80, 58);
        ctx.fillStyle = "#3e5362";
        ctx.fillRect(x + 8 + i * 145, y + 8, 64, 42);
      }
    }

    drawUmbrellaStand(x, y) {
      const ctx = this.ctx;
      ctx.fillStyle = "#5c463b";
      ctx.fillRect(x, y + 40, 50, 54);
      ["#d05b52", "#5687b8", "#d4b64f"].forEach((color, i) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x + 10 + i * 14, y + 44);
        ctx.lineTo(x + 18 + i * 10, y);
        ctx.stroke();
      });
      ctx.lineWidth = 2;
    }

    drawGrassPatches() {
      const ctx = this.ctx;
      ctx.fillStyle = "#477a3b";
      for (let i = 0; i < 45; i++) {
        const x = 80 + (i * 97) % 1000;
        const y = 80 + (i * 53) % 560;
        ctx.fillRect(x, y, 26, 8);
        ctx.fillRect(x + 8, y - 8, 8, 24);
      }
    }

    drawGardenBed(x, y, w, h) {
      const ctx = this.ctx;
      ctx.fillStyle = "#5a3d2e";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#68a84f";
      for (let gx = x + 20; gx < x + w - 10; gx += 34) {
        ctx.fillRect(gx, y + 16, 14, 42);
        ctx.fillRect(gx - 8, y + 28, 30, 8);
      }
    }

    drawTree(x, y) {
      const ctx = this.ctx;
      ctx.fillStyle = "#6d4b31";
      ctx.fillRect(x + 26, y + 58, 24, 62);
      ctx.fillStyle = "#3f8b45";
      ctx.fillRect(x + 6, y + 28, 72, 52);
      ctx.fillRect(x + 18, y + 8, 48, 76);
      ctx.fillRect(x - 6, y + 42, 96, 28);
      ctx.fillStyle = "#57a65a";
      ctx.fillRect(x + 2, y + 24, 36, 26);
      ctx.fillRect(x + 44, y + 18, 38, 28);
      ctx.fillRect(x + 24, y, 30, 34);
      ctx.fillStyle = "#2f6f39";
      ctx.fillRect(x + 18, y + 70, 48, 12);
    }

    drawSteppingStones(x, y, count) {
      const ctx = this.ctx;
      ctx.fillStyle = "#b7b3a1";
      for (let i = 0; i < count; i++) {
        const sx = x + i * 70;
        const sy = y + Math.sin(i) * 18;
        ctx.fillRect(sx - 22, sy - 10, 44, 20);
        ctx.fillRect(sx - 14, sy - 16, 28, 32);
        ctx.fillStyle = "#d0ccba";
        ctx.fillRect(sx - 12, sy - 8, 18, 6);
        ctx.fillStyle = "#b7b3a1";
      }
    }

    drawObjects(room) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(-this.camera.x, -this.camera.y);
      (room.objects || []).forEach((object) => {
        let drewImage = false;
        if (object.image) {
          const storyPhoto = this.epilogueMode && object.type === "photo" && (room.id === "entrance" || room.id === "livingroom");
          const image = this.getObjectImage(storyPhoto ? "assets/objects/epilogue_family_photo.png" : object.image);
          if (image && image.complete && image.naturalWidth) {
            ctx.drawImage(image, object.x, object.y, object.width, object.height);
            drewImage = true;
          }
        }
        if (!drewImage) {
          ctx.fillStyle = this.colorForObject(object.type);
          ctx.fillRect(object.x, object.y, object.width, object.height);
          ctx.fillStyle = "rgba(255,255,255,0.08)";
          ctx.fillRect(object.x + 3, object.y + 3, object.width - 6, 5);
          ctx.strokeStyle = "rgba(0,0,0,0.72)";
          ctx.strokeRect(object.x, object.y, object.width, object.height);
        }
        ctx.fillStyle = "#eadcb9";
        ctx.font = "12px Malgun Gothic, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(object.name, object.x + object.width / 2, object.y + object.height + 14);
      });
      ctx.restore();
    }

    getObjectImage(src) {
      if (!this.objectImages) this.objectImages = {};
      if (!this.objectImages[src]) {
        const image = new Image();
        image.src = src;
        this.objectImages[src] = image;
      }
      return this.objectImages[src];
    }

    drawObjectImage(src, x, y, width, height) {
      const image = this.getObjectImage(src);
      if (!image || !image.complete || !image.naturalWidth) return false;
      this.ctx.drawImage(image, x, y, width, height);
      return true;
    }

    drawForeground(room) {
      const target = window.Collision.nearestInteractable(this.player, room, this.constants.INTERACTION_DISTANCE || 42);
      if (!target || this.dialog.active || !this.started) return;
      const ctx = this.ctx;
      ctx.save();
      ctx.fillStyle = "rgba(8,7,8,0.88)";
      ctx.fillRect(this.canvas.width / 2 - 92, this.canvas.height - 78, 184, 32);
      ctx.strokeStyle = "#c6a45d";
      ctx.strokeRect(this.canvas.width / 2 - 92, this.canvas.height - 78, 184, 32);
      ctx.fillStyle = "#eadcb9";
      ctx.font = "14px Malgun Gothic, monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${target.name} 조사`, this.canvas.width / 2, this.canvas.height - 55);
      ctx.restore();
    }

    colorForObject(type) {
      return {
        tv: "#171d26",
        photo: "#8e7344",
        note: "#b8a36f",
        fridge: "#778087",
        table: "#654126",
        mirror: "#617d88",
        desk: "#5f3a25",
        box: "#60472f",
        rack: "#493a2d",
        door: "#3a2116",
      }[type] || "#5a4231";
    }
  }

  window.MINIGAME_ROUTES = Object.assign(
    {
      livingroom: "효찾기 게임.html?v=20260827-2",
      kitchen: "엄마찾기게임.html",
      teen: "효커넥트팩토리/이수아/데시벨게임.html",
      hall: "아버지퇴근길게임.html?v=20260827-2",
      yard: "minigames/yard.html",
      grandmother_cooking: "할머니요리게임.html",
      grandmother_basket: "할머니장바구니게임.html",
      entrance: "minigames/entrance.html",
      entrance_family_photo: "가족사진_따라그리기_게임.html",
    },
    window.MINIGAME_ROUTES || {}
  );

  window.startMiniGame = window.startMiniGame || function (roomId) {
    const target = window.MINIGAME_ROUTES[roomId];
    console.log(`startMiniGame("${roomId}")`);
    if (!target) return "";

    const url = new URL(target, window.location.href).href;
    let overlay = document.getElementById("miniGameOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "miniGameOverlay";
      overlay.setAttribute("aria-hidden", "true");
      overlay.innerHTML = '<button id="miniGameCloseBtn" type="button" aria-label="미니게임 닫기">← 게임으로 돌아가기</button><iframe id="miniGameFrame" title="미니게임" allow="microphone; fullscreen" allowfullscreen></iframe>';
      document.body.appendChild(overlay);
      overlay.querySelector("#miniGameCloseBtn").addEventListener("click", () => window.closeMiniGameOverlay());
    }

    const frame = overlay.querySelector("#miniGameFrame");
    frame.onload = () => {
      try {
        const path = frame.contentWindow.location.pathname;
        if (/\/index\.html$/.test(path)) window.closeMiniGameOverlay();
      } catch (error) { /* Same-origin game pages are expected. */ }
    };
    frame.src = url;
    overlay.classList.add("portrait-mode");
    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
    if (screen.orientation && typeof screen.orientation.lock === "function") {
      screen.orientation.lock("portrait").catch(() => {});
    }
    if (window.hyoEscapeGame) {
      const bgm = window.hyoEscapeGame.horrorBgm;
      overlay.dataset.resumeHorrorBgm = bgm && !bgm.paused ? "true" : "false";
      if (bgm && !bgm.paused) bgm.pause();
      window.hyoEscapeGame.paused = true;
    }
    return target;
  };

  window.closeMiniGameOverlay = function () {
    const overlay = document.getElementById("miniGameOverlay");
    if (!overlay) return;
    const frame = overlay.querySelector("#miniGameFrame");
    overlay.classList.remove("show", "portrait-mode");
    overlay.setAttribute("aria-hidden", "true");
    if (frame) frame.src = "about:blank";
    if (window.hyoEscapeGame) {
      window.hyoEscapeGame.paused = false;
      if (overlay.dataset.resumeHorrorBgm === "true" && window.hyoEscapeGame.horrorBgm) {
        window.hyoEscapeGame.horrorBgm.play().catch(() => {});
      }
    }
    if (screen.orientation && typeof screen.orientation.lock === "function") {
      screen.orientation.lock("landscape").catch(() => {});
    }
    requestMobileFullscreen();
    fitGameToViewport();
  };

  function isMobileFullscreenTarget() {
    return window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 900;
  }

  function requestMobileFullscreen() {
    if (!isMobileFullscreenTarget()) return;

    const root = document.documentElement;
    const alreadyFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    const request = root.requestFullscreen || root.webkitRequestFullscreen || root.msRequestFullscreen;

    if (!alreadyFullscreen && request) {
      try {
        const result = request.call(root, { navigationUI: "hide" });
        if (result && typeof result.then === "function") {
          result.then(() => {
            if (screen.orientation && typeof screen.orientation.lock === "function") {
              screen.orientation.lock("landscape").catch(() => {});
            }
            fitGameToViewport();
          }).catch(() => {});
        }
      } catch (error) {
        try { request.call(root); } catch (fallbackError) { /* Browser does not permit page fullscreen. */ }
      }
    }

    setTimeout(() => {
      window.scrollTo(0, 1);
      fitGameToViewport();
    }, 250);
  }

  function fitGameToViewport() {
    const game = document.getElementById("game");
    if (!game) return;
    const viewport = window.visualViewport;
    const width = viewport ? viewport.width : window.innerWidth;
    const height = viewport ? viewport.height : window.innerHeight;
    game.style.position = "fixed";
    game.style.left = "50%";
    game.style.top = "50%";
    game.style.transformOrigin = "center center";
    game.style.transform = "translate(-50%, -50%)";
    const baseWidth = game.offsetWidth || 972;
    const baseHeight = game.offsetHeight || 552;
    const scale = Math.min(1, width / baseWidth, height / baseHeight);
    game.style.transform = `translate(-50%, -50%) scale(${Math.max(0.1, scale)})`;
  }
  window.addEventListener("resize", fitGameToViewport, { passive: true });
  window.addEventListener("orientationchange", fitGameToViewport, { passive: true });
  document.addEventListener("fullscreenchange", fitGameToViewport);
  document.addEventListener("webkitfullscreenchange", fitGameToViewport);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", fitGameToViewport, { passive: true });
  fitGameToViewport();

  function loadOptionalScript(src, globalName) {
    if (globalName && window[globalName]) return Promise.resolve();
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = resolve;
      document.head.appendChild(script);
    });
  }

  window.addEventListener("DOMContentLoaded", async () => {
    await Promise.all([
      loadOptionalScript("constants.js", "HYO_CONSTANTS"),
      loadOptionalScript("utils.js", "HyoUtils"),
      loadOptionalScript("ui.js", "GameUI"),
      loadOptionalScript("audio.js", "AudioManager"),
    ]);
    window.hyoEscapeGame = new HyoEscapeGame();
  });
})();
