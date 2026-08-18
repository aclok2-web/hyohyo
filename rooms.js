/* Room database. JSON-like data only; rendering and behavior live elsewhere. */
(function () {
  "use strict";

  const T = 48;
  const roomSize = { width: 24 * T, height: 15 * T };

  function wallFrame() {
    return [
      { x: 0, y: 0, width: roomSize.width, height: T },
      { x: 0, y: roomSize.height - T, width: roomSize.width, height: T },
      { x: 0, y: 0, width: T, height: roomSize.height },
      { x: roomSize.width - T, y: 0, width: T, height: roomSize.height },
    ];
  }

  function object(id, name, x, y, width, height, type, dialogs, options) {
    return Object.assign(
      { id, name, x, y, width, height, type, dialogs, solid: true },
      options || {}
    );
  }

  window.ROOMS = {
    livingroom: {
      id: "livingroom",
      name: "기억의 거실",
      color: "#171116",
      floor: "#2d2726",
      spawn: { x: 170, y: 410 },
      size: roomSize,
      walls: wallFrame(),
      doors: [
        { id: "door_to_kitchen", name: "부엌 문", x: 1078, y: 300, width: 42, height: 110, to: "kitchen", spawn: { x: 95, y: 330 }, locked: false },
      ],
      npcs: [
        { id: "memory_child", name: "어린 나", x: 640, y: 365, width: 32, height: 42, spriteByCharacter: { boy: "assets/characters/npc/child_boy_walk.png", girl: "assets/characters/npc/child_girl_walk.png" }, spriteWidth: 36, spriteHeight: 48, displayWidth: 36, displayHeight: 48, dialogs: ["여기서 가족과 웃던 장면을 기억해?", "TV와 사진 속에 숨은 효 글자를 찾아봐."] },
      ],
      objects: [
        object("living_tv", "TV", 210, 92, 260, 198, "tv", ["화면 안 가족 영상이 빠르게 지나간다.", "효를 모두 찾으면 거실 어딘가에 쪽지가 나타날 것 같다."], { image: "assets/objects/living_tv.png", miniGame: "livingroom" }),
        object("family_photo_living", "가족사진", 520, 96, 150, 135, "photo", ["사진 속 웃음이 잠시 멈춘다.", "가족과 함께한 시간이 가장 소중한 추억이라는 말이 떠오른다."], { image: "assets/objects/living_family_photo.png", reward: { code: "2", item: "거실 사진 조각" } }),
        object("proverb_note", "속담 쪽지", 365, 365, 58, 64, "note", ["문장 조각이 적혀 있다.", "'부모의 마음은 끝이 없다'라는 속담이 완성된다."], { image: "assets/objects/living_note.png", hiddenUntilCompleted: "livingroom:hyo_find_complete", reward: { code: "3", item: "속담 쪽지" } }),
      ],
    },

    kitchen: {
      id: "kitchen",
      name: "부엌",
      color: "#1c1210",
      floor: "#34251e",
      spawn: { x: 95, y: 330 },
      size: roomSize,
      walls: wallFrame(),
      doors: [
        { id: "door_to_living", name: "거실 문", x: 32, y: 300, width: 42, height: 110, to: "livingroom", spawn: { x: 1000, y: 330 } },
        { id: "door_to_teen", name: "사춘기의 방 문", x: 1078, y: 230, width: 42, height: 120, to: "teen", spawn: { x: 95, y: 300 } },
      ],
      npcs: [
        { id: "mom", name: "엄마", x: 690, y: 330, width: 32, height: 42, sprite: "assets/characters/npc/mom_walk.png", spriteWidth: 36, spriteHeight: 48, displayWidth: 36, displayHeight: 48, dialogs: ["밥은 먹었니?", "잔소리처럼 들려도 사실은 네가 걱정돼서 하는 말이야."], miniGame: "kitchen", hiddenWhenCompleted: "kitchen:mom_nagging_complete" },
      ],
      objects: [
        object("fridge", "냉장고", 714, 118, 83, 154, "fridge", ["냉장고 문에 메모가 붙어 있다.", "'챙겨 먹어'라는 말은 사랑의 다른 이름이었다."], { image: "assets/objects/kitchen_fridge.png", reward: { code: "5", item: "냉장고 메모" } }),
        object("table", "식탁", 376, 331, 188, 115, "table", ["따뜻한 밥 냄새가 남아 있다.", "함께 먹는 밥상이 마음의 지도를 조금 채운다."], { image: "assets/objects/kitchen_table.png" }),
      ],
    },

    teen: {
      id: "teen",
      name: "사춘기의 방",
      color: "#171324",
      floor: "#2b2638",
      spawn: { x: 95, y: 300 },
      size: roomSize,
      walls: wallFrame(),
      doors: [
        { id: "door_to_kitchen", name: "부엌 문", x: 32, y: 240, width: 42, height: 120, to: "kitchen", spawn: { x: 1000, y: 290 } },
        { id: "door_to_hall", name: "복도 문", x: 1078, y: 240, width: 42, height: 120, to: "hall", spawn: { x: 95, y: 290 } },
      ],
      npcs: [
        { id: "past_self", name: "과거의 나", x: 585, y: 350, width: 32, height: 42, spriteByCharacter: { boy: "assets/characters/npc/teen_boy_walk.png", girl: "assets/characters/npc/teen_girl_walk.png" }, spriteWidth: 36, spriteHeight: 48, displayWidth: 36, displayHeight: 48, dialogs: ["그때는 모두가 나를 몰라준다고 생각했어.", "하지만 가족도 처음 겪는 마음 앞에서 서툴렀던 거야."], reward: { code: "6", item: "과거의 이해" }, miniGame: "teen" },
      ],
      objects: [
        object("mirror", "거울", 675, 82, 125, 145, "mirror", ["거울 속 표정이 흔들린다.", "방황하던 나를 탓하기보다 이해해 보기로 했다."], { image: "assets/objects/teen_mirror.png" }),
        object("desk", "책상", 145, 112, 188, 115, "desk", ["낙서가 가득한 공책이 있다.", "닫혀 있던 마음의 문장이 천천히 풀린다."], { image: "assets/objects/kitchen_table.png" }),
      ],
    },

    hall: {
      id: "hall",
      name: "복도",
      color: "#101923",
      floor: "#242d35",
      spawn: { x: 95, y: 290 },
      size: roomSize,
      walls: wallFrame(),
      doors: [
        { id: "door_to_teen", name: "사춘기의 방 문", x: 32, y: 240, width: 42, height: 120, to: "teen", spawn: { x: 1000, y: 290 } },
        { id: "door_to_yard", name: "마당 문", x: 1078, y: 240, width: 42, height: 120, to: "yard", spawn: { x: 95, y: 290 } },
      ],
      npcs: [
        { id: "father", name: "아버지", x: 365, y: 310, width: 32, height: 42, sprite: "assets/characters/npc/father_walk.png", spriteWidth: 36, spriteHeight: 48, displayWidth: 36, displayHeight: 48, dialogs: ["말은 적었지만 늘 네 뒤에서 무거운 것을 들고 있었단다.", "복도를 함께 걸으며 이야기를 나눠 보자."], reward: { code: "7", item: "아버지의 공구함" }, miniGame: "hall", hiddenWhenCompleted: "hall:father_game_complete" },
      ],
      objects: [
        object("shoe_box_hall", "낡은 상자", 764, 350, 150, 150, "box", ["오래된 짐 안에 가족을 지켜온 손길이 남아 있다."], { image: "assets/objects/cardboard_box_clean.png" }),
      ],
    },

    yard: {
      id: "yard",
      name: "마당",
      color: "#101b13",
      floor: "#253322",
      spawn: { x: 95, y: 290 },
      size: roomSize,
      walls: wallFrame(),
      doors: [
        { id: "door_to_hall", name: "복도 문", x: 32, y: 240, width: 42, height: 120, to: "hall", spawn: { x: 1000, y: 290 } },
        { id: "door_to_entrance", name: "현관 문", x: 1078, y: 240, width: 42, height: 120, to: "entrance", spawn: { x: 95, y: 290 } },
      ],
      npcs: [
        { id: "grandmother", name: "할머니", x: 650, y: 335, width: 32, height: 42, sprite: "assets/characters/npc/grandmother_walk.png", spriteWidth: 36, spriteHeight: 48, displayWidth: 36, displayHeight: 48, dialogs: ["우리 강아지 배많이 고프지???"], reward: { code: "8", item: "할머니의 보따리" }, miniGame: "grandmother_cooking" },
      ],
      objects: [
        object("yard_boxes", "마당 짐", 395, 355, 150, 150, "box", ["마당 짐이 무거워 보인다. 장바구니 역도에 도전해 보자!"], { image: "assets/objects/cardboard_box_clean.png", reward: { code: "9", item: "마당의 감사" }, miniGame: "grandmother_basket" }),
      ],
    },

    entrance: {
      id: "entrance",
      name: "현관",
      color: "#171411",
      floor: "#302a23",
      spawn: { x: 95, y: 290 },
      size: roomSize,
      walls: wallFrame(),
      doors: [
        { id: "door_to_yard", name: "마당 문", x: 32, y: 240, width: 42, height: 120, to: "yard", spawn: { x: 1000, y: 290 } },
      ],
      npcs: [],
      objects: [
        object("family_photo_final", "가족사진", 205, 78, 190, 128, "photo", ["가족사진을 따라 그려 마지막 추억을 완성해 보자."], { image: "assets/objects/entrance_family_photo_transparent.png", reward: { code: "10", item: "마지막 사진 조각" }, miniGame: "entrance_family_photo" }),
        object("shoe_rack", "신발장", 700, 70, 210, 165, "rack", ["나란히 놓인 신발들이 함께 걸어온 시간을 보여 준다."], { image: "assets/entrance/shoe_cabinet_closed.png" }),
        object("front_door", "현관문", 1040, 250, 75, 130, "door", ["10개의 비밀번호 글자가 모두 모이면 이 문이 열린다."], { image: "assets/entrance/front_door.png", ending: true }),
      ],
    },
  };
})();
