# -*- coding: utf-8 -*-
"""
HeirWise Chat v1.0 — 기존 파일 패치 (2026-09-28)
보안등급: 내부용 | 제작: HeirWise_Syn Dae Sik (申大湜)

무엇을 고치는가 (두 파일, 각 1곳씩 삽입 — 기존 줄은 지우지 않음)
  1) heirwise-common.js
     · 헤더 주석에 data-chat="off" 옵션 추가
     · injectChatLauncher(): 전 페이지 우하단 「물어보기」 떠 있는 버튼 (chat.html 자신·data-chat="off" 페이지 제외)
       - 우하단인 이유: 좌하단은 하위 페이지의 「길잡이로 돌아가기」(#hw-lobby-return)가 차지함.
         시즌 카드(우하단, 10.02 종료)가 떠 있는 동안은 카드가 위를 덮고, 카드를 닫으면 보임 — 4일간 감수
       - GA4: chat_launcher_view / chat_launcher_click
     · boot() 에 try { injectChatLauncher(); } 한 줄 추가
  2) privacy.html
     · §1 표: 「물어보기(챗봇)」 행 추가 (자동 수집 행 바로 위)
     · §3 표: Google LLC (Gemini API) 행 추가 (GA4 행 바로 위)
     · §4 파기 목록: 챗봇 대화 1년 자동 삭제 항목 추가

실행 (저장소 루트에서, Git Bash 또는 PowerShell)
    python tools/patch_chat_v1_2026-09-28.py             # 적용
    python tools/patch_chat_v1_2026-09-28.py --check     # 적용 여부만 확인 (수정 없음)
멱등: 이미 적용된 파일은 건너뜁니다. 원본은 *.bak-20260928 로 남깁니다.
"""
import io, os, sys, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHECK = "--check" in sys.argv
TAG = ".bak-20260928"

def read(p):  return io.open(p, "r", encoding="utf-8").read()
def write(p, s):
    if not os.path.exists(p + TAG): shutil.copyfile(p, p + TAG)
    io.open(p, "w", encoding="utf-8", newline="\n").write(s)

def insert_once(text, anchor, addition, before=True, marker=None):
    """anchor 가 정확히 1곳이어야 함. marker 가 이미 있으면 건너뜀."""
    if (marker or addition.strip()[:60]) in text: return text, "skip(already)"
    n = text.count(anchor)
    if n != 1: return text, "FAIL(anchor x%d)" % n
    new = text.replace(anchor, (addition + anchor) if before else (anchor + addition))
    return new, "ok"

# ─────────────────────────────── 1) heirwise-common.js
JS = os.path.join(ROOT, "heirwise-common.js")
js = read(JS)
results = []

js, r = insert_once(js,
    ' *   data-season="off"    시즌 띠·카드를 넣지 않음 (SEASON.href 페이지 자신에도 넣지 않음)\n',
    ' *   data-chat="off"      우하단 「물어보기」 챗봇 런처를 넣지 않음 (chat.html 자신에도 넣지 않음)\n',
    before=False, marker='data-chat="off"')
results.append(("common.js 헤더 옵션", r))

LAUNCHER = r'''
  /* ============================================================
     ⑦ 챗봇 런처 (2026-09-28) — 우하단 「물어보기」 떠 있는 버튼
     · 좌하단은 #hw-lobby-return 자리. 시즌 카드(10.02 종료)가 뜬 동안은 카드 아래(z 53<55)
     · 끄기: <body data-chat="off"> · chat.html 자신에는 넣지 않음
     · GA4: chat_launcher_view / chat_launcher_click (src=launcher 로 chat.html 에 전달)
     ============================================================ */
  function injectChatLauncher() {
    if (!d.body || d.body.getAttribute("data-chat") === "off") return;
    if (/\/chat(\.html?)?$/i.test(location.pathname)) return;
    if ($("hw-chat-launcher")) return;
    var st = d.createElement("style");
    st.id = "hw-chat-launcher-style";
    st.textContent = [
      "#hw-chat-launcher{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:53;",
      "display:inline-flex;align-items:center;gap:8px;min-height:52px;padding:0 18px 0 14px;border-radius:999px;",
      "background:#0C5C48;color:#fff;font:inherit;font-size:16px;font-weight:800;text-decoration:none;",
      "box-shadow:0 6px 20px rgba(0,0,0,.22);border:2px solid #0C5C48;line-height:1}",
      "#hw-chat-launcher:hover{background:#094536;border-color:#094536}",
      "#hw-chat-launcher:focus-visible{outline:3px solid #FFC64D;outline-offset:2px}",
      "#hw-chat-launcher .ic{width:22px;height:22px;display:inline-block}",
      "html[data-theme='dark'] #hw-chat-launcher{background:#54CFA8;border-color:#54CFA8;color:#14161B}",
      "@media (prefers-color-scheme:dark){:root:not([data-theme='light']) #hw-chat-launcher{background:#54CFA8;border-color:#54CFA8;color:#14161B}}",
      "@media (max-width:480px){#hw-chat-launcher{padding:0 14px 0 12px;font-size:15px}}",
      "@media (max-height:480px),print{#hw-chat-launcher{display:none}}"
    ].join("");
    d.head.appendChild(st);
    var a = d.createElement("a");
    a.id = "hw-chat-launcher";
    a.href = "/chat.html?src=launcher";
    a.setAttribute("aria-label", "이름 없이 물어보기 — 상황 정리 안내 열기");
    a.innerHTML = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg><span>물어보기</span>';
    a.addEventListener("click", function () { hwTrack("chat_launcher_click", {}); });
    d.body.appendChild(a);
    hwTrack("chat_launcher_view", {}, true);
  }
'''
js, r = insert_once(js,
    "  /* ============================================================\n     ⑥ 실행\n",
    LAUNCHER, before=True, marker="function injectChatLauncher")
if r.startswith("FAIL"):
    # 섹션 제목이 바뀐 경우: boot() 정의 앞에 삽입
    js, r = insert_once(js, "  function boot() {\n", LAUNCHER, before=True, marker="function injectChatLauncher")
results.append(("common.js 런처 함수", r))

js, r = insert_once(js,
    "    try { injectLobbyReturn(); } catch (e) { if (HW_CONFIG.DEBUG) console.error(e); }\n",
    "    try { injectChatLauncher(); } catch (e) { if (HW_CONFIG.DEBUG) console.error(e); }\n",
    before=False, marker="try { injectChatLauncher(); }")
results.append(("common.js boot() 호출", r))

if not CHECK and not any(x[1].startswith("FAIL") for x in results[-3:]) and js != read(JS):
    write(JS, js)

# ─────────────────────────────── 2) privacy.html
PV = os.path.join(ROOT, "privacy.html")
pv = read(PV)

ROW1 = ('      <tr><td data-th="어디서">물어보기(챗봇)</td>'
        '<td data-th="받는 항목">대화 내용, 고르신 상황 유형, 세션 번호(무작위)<br>'
        '연락처를 남기신 경우: 이름, 전화번호, 통화 희망 시간, 대화 요약</td>'
        '<td data-th="목적">상황 정리·안내, 상담 연락</td>'
        '<td data-th="보유 기간">대화 내용은 마지막 대화일부터 1년 · 연락처를 남기신 경우 상담 기록과 함께 3년</td></tr>\n')
pv, r = insert_once(pv,
    '      <tr><td data-th="어디서">자동 수집</td>',
    ROW1, before=True, marker='data-th="어디서">물어보기(챗봇)</td>')
results.append(("privacy §1 챗봇 행", r))

ROW3 = ('      <tr><td data-th="받는 곳">Google LLC<br>(Gemini API)</td>'
        '<td data-th="하는 일">물어보기(챗봇) 답변 생성 — 대화 내용을 보내 정리·안내 문장을 받아옵니다. 연락처는 보내지 않습니다</td>'
        '<td data-th="이전 국가">미국 등 Google 데이터센터 소재국</td>'
        '<td data-th="항목·시기·방법">대화 내용과 고르신 상황 유형을, 메시지를 보내시는 때에, 암호화 통신(HTTPS)으로 전송</td>'
        '<td data-th="보유 기간">1항 「물어보기(챗봇)」와 같음 (Google 측 처리 기간은 API 약관에 따름)</td></tr>\n')
pv, r = insert_once(pv,
    '      <tr><td data-th="받는 곳">Google LLC<br>(Google Analytics 4)</td>',
    ROW3, before=True, marker='Google LLC<br>(Gemini API)')
results.append(("privacy §3 Gemini 행", r))

LI4 = ('      <li>물어보기(챗봇) 대화 내용은 마지막 대화일부터 1년이 되면 자동으로 지웁니다. 연락처를 남기지 않은 대화에는 이름·전화번호가 들어 있지 않습니다.</li>\n')
pv, r = insert_once(pv,
    '      <li>협업 네트워크 연결 요청의 이름·전화·이메일·상황 요약은 연결 종료 후 1년이 되면 자동으로 지웁니다.',
    LI4, before=True, marker='물어보기(챗봇) 대화 내용은 마지막 대화일부터')
results.append(("privacy §4 파기 항목", r))

if not CHECK and not any(x[1].startswith("FAIL") for x in results[-3:]) and pv != read(PV):
    write(PV, pv)

# ─────────────────────────────── 결과
print("모드:", "확인만" if CHECK else "적용")
for name, r in results: print("  %-22s %s" % (name, r))
bad = [x for x in results if x[1].startswith("FAIL")]
if bad:
    print("\n⚠ 앵커를 찾지 못한 항목이 있어 해당 파일은 수정하지 않았습니다. 파일이 바뀌었는지 확인해 주세요.")
    sys.exit(1)
print("\n다음: chat.html CHAT_ENDPOINT 교체 → git add -A && git commit → push(본부장님 Git Bash)")
