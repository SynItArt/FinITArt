  /* ── 길잡이 돌아가기 (2026-09-28) ─────────────────────────────
   * 홈(/) 이외의 모든 페이지 하단 왼쪽에 "길잡이로 돌아가기" 버튼을 띄우고,
   * 현재 페이지가 어느 문(door)에 속하는지 기록해 홈 길잡이에 "보고 오셨어요"로 표시한다.
   * 저장: localStorage hw_lobby_seen (문 id 배열). 홈의 #lobby 스크립트와 같은 키.
   */
  var LOBBY_DOORS = [
    [/^\/(inheritdebt|natural-death)\.html$/, "deadline"],
    [/^\/lifemap\//, "lifemap"],
    [/^\/case\//, "situations"],
    [/^\/(calculator|car-accident|industrial-accident|fire-accident|disability-trust|insurance-two-faces)\.html$|^\/(retirement|gift|tools)\//, "tools"],
    [/^\/ceo-diagnosis\.html$|^\/ceo\//, "ceo"],
    [/^\/(book|consult|booking|about)\.html$|^\/network\//, "room"]
  ];
  function lobbyDoorFor(path) {
    for (var i = 0; i < LOBBY_DOORS.length; i++) { if (LOBBY_DOORS[i][0].test(path)) return LOBBY_DOORS[i][1]; }
    return null;
  }
  function injectLobbyReturn() {
    var path = normPath(location.pathname);
    if (path === "/" || path === "/index.html") return;
    var door = lobbyDoorFor(path);
    if (door) {
      try {
        var s = JSON.parse(localStorage.getItem("hw_lobby_seen") || "[]");
        if (s.indexOf(door) < 0) { s.push(door); localStorage.setItem("hw_lobby_seen", JSON.stringify(s)); }
      } catch (e) {}
    }
    if (d.getElementById("hw-lobby-return")) return;
    var st = d.createElement("style");
    st.textContent =
      "#hw-lobby-return{position:fixed;left:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:50;display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:0 18px 0 14px;border-radius:999px;background:#152033;color:#F5F7FA;border:1px solid #E9C46A;font:700 16px/1 'Pretendard','Malgun Gothic','Apple SD Gothic Neo',sans-serif;text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,.35)}" +
      "#hw-lobby-return:hover{background:#1C2A42;color:#F5F7FA}" +
      "#hw-lobby-return:focus-visible{outline:3px solid #E9C46A;outline-offset:3px}" +
      "#hw-lobby-return svg{width:20px;height:20px;flex:none}" +
      "@media print{#hw-lobby-return{display:none}}";
    d.head.appendChild(st);
    var a = d.createElement("a");
    a.id = "hw-lobby-return"; a.href = "/#lobby";
    a.setAttribute("aria-label", "홈 길잡이로 돌아가기");
    a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#E9C46A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg><span>길잡이로 돌아가기</span>';
    a.addEventListener("click", function () { hwTrack("lobby_return", { door: door || "none" }); });
    d.body.appendChild(a);
  }
