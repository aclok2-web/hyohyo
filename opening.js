/* Play the supplied prologue before character selection, once per tab. */
(function () {
  "use strict";
  const overlay = document.getElementById("openingOverlay");
  const game = document.getElementById("game");
  const key = "hyo_opening_seen_20261011";
  let frame;
  function complete() {
    try { sessionStorage.setItem(key, "1"); } catch (_) {}
    if (frame) { frame.remove(); frame = null; }
    overlay.hidden = true;
    game.inert = false;
    document.body.classList.remove("opening-active");
    document.querySelector("[data-character]")?.focus();
  }
  function show() {
    if (frame) return;
    game.inert = true;
    overlay.hidden = false;
    document.body.classList.add("opening-active");
    frame = document.createElement("iframe");
    frame.id = "openingFrame";
    frame.title = "효 방탈출 오프닝 — 아무도 없는 집";
    frame.allow = "autoplay; fullscreen";
    frame.src = "hyo-opening.html?v=20261011";
    overlay.appendChild(frame);
    frame.addEventListener("load", () => frame?.focus());
  }
  window.addEventListener("message", (event) => {
    if (frame && event.source === frame.contentWindow && event.origin === location.origin && event.data?.type === "HYO_OPENING_COMPLETE") complete();
  });
  document.getElementById("openingReplayBtn")?.addEventListener("click", show);
  let seen = false;
  try { seen = sessionStorage.getItem(key) === "1"; } catch (_) {}
  if (seen) complete(); else show();
})();
