/*!
 * heirwise-common.js — HeirWise 공통 스크립트 v1.0
 * 보안등급: 공유 가능 | 제작: HeirWise_Syn Dae Sik (申大湜)
 *
 * 이 파일 하나가 아래 세 가지를 전 페이지에 일괄 적용합니다.
 *   T-01  GA4 계측 (이벤트 6종)
 *   T-04  상담 폼 통일 (이메일 필드 추가 + 유입 계산기 기록)
 *   T-06  적용 법령 기준일 UI 표시 (프로젝트 규칙 5-3)
 *   시즌  명절 안내 상단 띠 + 하단 카드 (HW_CONFIG.SEASON, endAt 뒤 자동 종료)
 *
 * 각 페이지에는 </body> 바로 앞에 아래 한 줄만 넣으면 됩니다.
 *   <script src="heirwise-common.js" defer></script>
 *
 * 페이지별 옵션 (<body> 속성, 없으면 기본 동작)
 *   data-tool="노후진단"  GA4 tool 값을 파일명 대신 이 값으로 기록
 *   data-law="off"       적용 법령 기준일 칩·안내 상자를 넣지 않음
 *   data-season="off"    시즌 띠·카드를 넣지 않음 (SEASON.href 페이지 자신에도 넣지 않음)
 *
 * 설정은 아래 HW_CONFIG 한 곳만 고치면 전 페이지에 반영됩니다.
 */
(function () {
  "use strict";

  /* ============================================================
     ① 설정 — 여기만 고치십시오
     ============================================================ */
  var HW_CONFIG = {
    // GA4 측정 ID. 발급 전에는 빈 문자열로 두십시오(콘솔에만 기록됨).
    GA4_ID: "G-7KFP0RMD2Z",                    // 예: "G-XXXXXXXXXX"

    // 리드 수집 엔드포인트.
    // 2026.09.07 — 비어 있던 동안 common.js 를 쓰는 페이지(inheritdebt 등)의 리드가
    // mailto 폴백으로만 나가 유실되고 있었습니다. calculator.html 의 배포 URL 로 연결합니다.
    LEAD_ENDPOINT: "https://script.google.com/macros/s/AKfycbxCzR8dnFsUsiesSX68BFv62IALmuDp82Rr4Z9uQtUglikwyRmFZ1Mvr7qPSpZhNq2HkQ/exec",

    // 협업 네트워크 합류 신청 엔드포인트 (2026.09.18 · 부록 A-11).
    // 리드·북게이트와 **분리된 별도 웹앱**입니다 — 09.14 book-gate 교훈에 따라
    // 한쪽 배포가 다른 쪽 접수를 끊지 않도록 엔드포인트를 섞지 않습니다.
    NETWORK_ENDPOINT: "https://script.google.com/macros/s/AKfycbxMMgjuTGVML2PYeFjCwk1nJ2LOLjidPaZ16fYor1RYkIRq6dIz356-m8MG4W0qCrqj/exec",

    // 적용 법령 기준일 (프로젝트 규칙 5-3)
    LAW: {
      asOf: "2026.09.07",
      short: "상증법 법률 제21065호",
      full: [
        "상속세 및 증여세법 — 법률 제21065호 (2026. 1. 2. 시행)",
        "같은 법 시행령 — 대통령령 제36131호 (2026. 2. 27. 시행)",
        "같은 법 시행규칙 — 기획재정부령 제15호 (2026. 3. 20. 시행)"
      ],
      notice: "정확한 세액은 세무전문가 상담이 필요합니다."
    },

    CONTACT: { tel: "010-2088-5383", email: "itart@finitart.com" },

    // 시즌 안내 — 상단 띠 + 하단 카드. 시각은 한국 시간(+09:00) ISO로 적고 Date.parse로 비교합니다.
    // endAt이 지나면 아무것도 넣지 않습니다. 페이지에서 끄려면 <body data-season="off">
    SEASON: {
      id: "chuseok-2026",
      holiday: "2026-09-25T00:00:00+09:00",      // 추석 당일
      holidayStart: "2026-09-24T00:00:00+09:00", // 연휴 시작
      holidayEnd: "2026-09-26T23:59:59+09:00",   // 연휴 끝
      endAt: "2026-10-02T23:59:59+09:00",        // 자동 종료
      href: "/chuseok.html"
    },

    DEBUG: false                   // true면 발생 이벤트를 콘솔에 출력 · URL ?hw_now=ISO 로 시즌 시각 덮어쓰기
  };
  window.HW_CONFIG = HW_CONFIG;

  var $ = function (id) { return document.getElementById(id); };
  var d = document;

  /* ============================================================
     ② T-01 — GA4 계측
     이벤트 6종: calc_view / calc_start / calc_complete / lead_submit
                 axis_select / sim_reach
     모든 이벤트에 tool(계산기명)·axis(pre=증여, post=상속, both=공통, retirement=노후, accident=사고 — AXIS_LABEL) 파라미터를 붙입니다.
     ============================================================ */

  // 페이지 식별 — body[data-tool] > #lead[data-tool] > 파일명 순으로 판정
  var PAGE_AXIS = {
    "natural-death":       { tool: "자연사상속세",   axis: "post" },
    "car-accident":        { tool: "교통사고",       axis: "post" },
    "industrial-accident": { tool: "산재",           axis: "post" },
    "fire-accident":       { tool: "화재",           axis: "post" },
    "insurance-two-faces": { tool: "보험유류분",     axis: "post" },
    "disability-trust":    { tool: "장애인신탁",     axis: "pre"  },
    "gift-tax":            { tool: "증여세",         axis: "pre"  },
    "gift-10y":            { tool: "10년증여설계",   axis: "pre"  },
    "calculator":          { tool: "간이판정",       axis: "post" },
    "consult":             { tool: "상담신청",       axis: "both" },
    "index":               { tool: "홈",             axis: "both" }
  };

  // 축(axis) 허용값 — 목록에 없는 값은 "both" 로 본다. 메일 폴백의 축 표기도 여기서 가져간다
  var AXIS_LABEL = {
    pre: "사전축·증여", post: "사후축·상속", both: "공통",
    retirement: "노후", accident: "사고"
  };

  /* 주민등록번호 입력 차단 (2026-09-21) — 전화번호·날짜는 통과 */
  var HW_RRN_RE = /\b\d{6}\s*-?\s*[1-8]\d{6}\b/;
  function hwHasRRN(v) { return HW_RRN_RE.test(String(v == null ? "" : v)); }
  window.hwHasRRN = hwHasRRN;

  function normAxis(a) { return Object.prototype.hasOwnProperty.call(AXIS_LABEL, a) ? a : "both"; }

  function detectPage() {
    var b = d.body || {};
    var ds = b.dataset || {};
    if (ds.tool) return { tool: ds.tool, axis: normAxis(ds.axis) };
    var slug = (location.pathname.split("/").pop() || "index.html")
                 .replace(/\.html?$/i, "") || "index";
    var hit = PAGE_AXIS[slug];
    return hit ? { tool: hit.tool, axis: normAxis(hit.axis) } : { tool: slug, axis: "both" };
  }
  var PAGE = detectPage();

  // gtag 부트스트랩
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  if (HW_CONFIG.GA4_ID) {
    var g = d.createElement("script");
    g.async = true;
    g.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(HW_CONFIG.GA4_ID);
    d.head.appendChild(g);
    gtag("js", new Date());
    gtag("config", HW_CONFIG.GA4_ID, { send_page_view: true });
  }

  var fired = {};
  function hwTrack(name, params, once) {
    if (once) { if (fired[name]) return; fired[name] = true; }
    var payload = params || {};
    payload.tool = PAGE.tool;
    payload.axis = PAGE.axis;
    payload.page_path = location.pathname;
    if (HW_CONFIG.GA4_ID) { gtag("event", name, payload); }
    if (HW_CONFIG.DEBUG || !HW_CONFIG.GA4_ID) {
      try { console.log("[HW event]", name, payload); } catch (e) {}
    }
  }
  window.hwTrack = hwTrack;

  var calcBtn = $("calcBtn");
  // 탭형·실시간 계산기(calcBtn 없음)도 계산기로 인식합니다.
  var resultEl = d.querySelector("[data-hw-result]") || $("taxRes") || $("result");
  var isCalc = !!(calcBtn || resultEl);

  // calc_view — 계산기가 있는 페이지 진입
  if (isCalc) hwTrack("calc_view", {}, true);

  // calc_start — 계산기 안에서 첫 입력이 일어난 시점
  if (isCalc) {
    var startHandler = function () { hwTrack("calc_start", {}, true); };
    d.querySelectorAll("input, select").forEach(function (el) {
      if (el.closest("#lead, .lead, #emailSec, .email-section")) return;
      el.addEventListener("input", startHandler, { once: false });
      el.addEventListener("change", startHandler, { once: false });
    });
    d.querySelectorAll(".seg button, .modeseg button, .presets button").forEach(function (el) {
      el.addEventListener("click", startHandler);
    });
  }

  // calc_complete — 계산 버튼 클릭 (페이지 자체 계산 로직은 그대로 동작)
  if (calcBtn) {
    calcBtn.addEventListener("click", function () {
      hwTrack("calc_complete", { has_result: true });
    });
  } else if (resultEl) {
    // 실시간 계산형: 결과 영역에 값이 채워지는 순간 1회 발화
    var seen = (resultEl.textContent || "").trim();
    var mo = new MutationObserver(function () {
      var now = (resultEl.textContent || "").trim();
      if (now && now !== seen) {
        hwTrack("calc_complete", { has_result: true }, true);
        mo.disconnect();
      }
    });
    mo.observe(resultEl, { childList: true, subtree: true, characterData: true });
  }

  // axis_select — 홈의 생전/사후 2갈래 분기 클릭 (T-11에서 사용)
  d.querySelectorAll("[data-axis-select]").forEach(function (el) {
    el.addEventListener("click", function () {
      hwTrack("axis_select", { selected_axis: el.getAttribute("data-axis-select") });
    });
  });

  // sim_reach — 10년 증여 설계 시뮬레이터 결과 도달 (T-14에서 사용)
  var simEl = d.querySelector("[data-sim-result]");
  if (simEl && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { hwTrack("sim_reach", {}, true); io.disconnect(); }
      });
    }, { threshold: 0.4 });
    io.observe(simEl);
  }

  /* ============================================================
     ③ T-06 — 적용 법령 기준일 UI 표시
     header의 lawbar에 기준일 칩을 붙이고, 결과/면책 영역 위에
     근거 법령 블록을 삽입합니다.
     ============================================================ */

  function injectLawStyles() {
    if ($("hw-law-style")) return;
    var st = d.createElement("style");
    st.id = "hw-law-style";
    st.textContent = [
      ".hw-lawbase{margin-top:16px;padding:14px 16px;border:1.5px solid var(--line2,#c2cad6);",
      "border-left:5px solid var(--navy2,#2255AA);border-radius:10px;background:var(--soft,#eef3fa);",
      "font-size:13px;line-height:1.75;color:var(--ink,#1c2330)}",
      ".hw-lawbase .hw-h{font-size:13.5px;font-weight:800;color:var(--navy,#1A3C6D);",
      "margin-bottom:7px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}",
      ".hw-lawbase .hw-asof{background:var(--navy,#1A3C6D);color:#fff;font-size:11.5px;font-weight:800;",
      "padding:3px 9px;border-radius:6px;letter-spacing:.02em}",
      ".hw-lawbase ul{margin:0;padding-left:18px}",
      ".hw-lawbase li{margin:2px 0}",
      ".hw-lawbase .hw-note{margin-top:9px;font-size:12.5px;color:var(--warn,#a33a16);font-weight:700}",
      /* 리드 폼 접근성 — placeholder 대신 상시 노출 라벨 */
      "#lead .hw-lb{display:block;font-size:13px;font-weight:800;color:#fff;margin:0 0 4px}",
      "#lead .hw-lb .hw-req{color:#FFD34D;margin-left:4px}",
      "#lead input[type=text]{font-size:16px!important;padding:12px 13px!important}",
      "#lead .consent input{width:20px!important;height:20px!important}",
      "@media (prefers-color-scheme: dark){.hw-lawbase .hw-asof{background:var(--navy2,#9cc3f5);color:#0e141d}}"
    ].join("");
    d.head.appendChild(st);
  }

  function injectLawUI() {
    injectLawStyles();

    // <body data-law="off"> — 상증법과 무관한 페이지(노후 진단 등)는 법령 UI를 넣지 않음
    if (d.body && d.body.getAttribute("data-law") === "off") return;

    // (1) 헤더 lawbar에 기준일 칩 추가
    var bar = d.querySelector("header.hd .lawbar");
    if (bar && !bar.querySelector("[data-hw-asof]")) {
      var chip = d.createElement("span");
      chip.setAttribute("data-hw-asof", "1");
      chip.textContent = "적용 법령 기준일 " + HW_CONFIG.LAW.asOf;
      bar.appendChild(chip);
    }

    // (2) 근거 법령 블록 삽입 — 지정 위치 > 면책문 > 푸터 앞 > 본문 끝 순으로
    if (d.querySelector(".hw-lawbase")) return;
    var host = d.querySelector("[data-hw-lawbase]") || d.querySelector(".disc") || d.querySelector("footer");
    var mode = "before";
    if (!host) {
      host = d.querySelector(".wrap") || d.querySelector("main") || d.body;
      mode = "append";
    }
    if (host) {
      var box = d.createElement("div");
      box.className = "hw-lawbase";
      var lis = HW_CONFIG.LAW.full.map(function (t) {
        return "<li>" + t + "</li>";
      }).join("");
      box.innerHTML =
        '<div class="hw-h">적용 법령 기준일' +
        '<span class="hw-asof">' + HW_CONFIG.LAW.asOf + "</span></div>" +
        "<ul>" + lis + "</ul>" +
        '<div class="hw-note">' + HW_CONFIG.LAW.notice +
        ' &nbsp;→&nbsp; <a href="/consult.html" style="color:inherit">무료 상담 신청</a></div>';
      if (mode === "append") { box.style.margin = "18px auto"; box.style.maxWidth = "760px"; host.appendChild(box); }
      else { host.parentNode.insertBefore(box, host); }
    }
  }

  /* ============================================================
     ④ T-04 — 상담 폼 통일
     · 이메일 필드가 없는 페이지에 자동 추가
     · 유입 계산기명(tool)·축(axis)·계산결과를 payload에 기록
     · 검증·전송 로직을 이 파일 하나로 일원화 (페이지별 중복 제거)
     ============================================================ */

  function unifyLeadForm() {
    var box = $("lead");
    if (!box) return;

    var tool = box.dataset.tool || PAGE.tool;

    // (0) 상시 노출 라벨 부착 — placeholder만 있으면 입력 시작 시 항목명이 사라집니다
    function label(inputId, text, required) {
      var inp = $(inputId);
      if (!inp || d.querySelector('label[for="' + inputId + '"]')) return;
      var lb = d.createElement("label");
      lb.className = "hw-lb";
      lb.setAttribute("for", inputId);
      lb.innerHTML = text + (required ? '<span class="hw-req">필수</span>' : "");
      inp.parentNode.insertBefore(lb, inp);
      inp.setAttribute("aria-label", text);
    }

    // (1) 이메일 입력란 추가 — 기존 페이지에는 성함·연락처만 있습니다
    if (!$("ldEmail")) {
      var phone = $("ldPhone");
      var email = d.createElement("input");
      email.type = "text";
      email.id = "ldEmail";
      email.placeholder = "이메일 (결과 리포트 받을 주소)";
      email.setAttribute("autocomplete", "email");
      email.setAttribute("inputmode", "email");
      if (phone && phone.parentNode) {
        phone.parentNode.insertBefore(email, phone.nextSibling);
      } else {
        box.insertBefore(email, box.querySelector(".consent") || null);
      }
    }

    label("ldName",  "성함", true);
    label("ldPhone", "연락처", true);
    label("ldEmail", "이메일", false);
    if ($("ldName"))  $("ldName").setAttribute("autocomplete", "name");
    if ($("ldPhone")) { $("ldPhone").setAttribute("autocomplete", "tel"); $("ldPhone").setAttribute("inputmode", "tel"); }

    // (2) 동의 문구를 실제 수집 항목과 일치시킴
    var consentText = box.querySelector(".consent span");
    if (consentText) {
      consentText.textContent =
        "개인정보 수집·이용에 동의합니다. (목적: 상담 연락 및 결과 리포트 발송 / " +
        "항목: 성함·연락처·이메일·계산 입력값 / 보유: 1년 / 거부 시 상담이 제한될 수 있습니다)";
    }

    // (3) 페이지 자체 리스너를 제거하고 통합 핸들러로 교체
    var oldBtn = $("ldSend");
    if (!oldBtn) return;
    var btn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(btn, oldBtn);

    btn.addEventListener("click", function () {
      var msg = $("ldMsg");
      if (msg) msg.className = "msg";
      function fail(t) { if (msg) { msg.className = "msg err"; msg.textContent = t; } }

      var name  = (($("ldName")  || {}).value || "").trim();
      var phone = (($("ldPhone") || {}).value || "").trim();
      var mail  = (($("ldEmail") || {}).value || "").trim();
      var agree = ($("ldAgree") || {}).checked;

      if (!name) { return fail("성함을 입력해 주세요."); }
      if (!/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(phone.replace(/\s/g, ""))) {
        return fail("연락처 형식을 확인해 주세요. (예: 010-1234-5678)");
      }
      if (mail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) {
        return fail("이메일 형식을 확인해 주세요.");
      }
      if (!agree) { return fail("개인정보 수집·이용 동의가 필요합니다."); }
      if (hwHasRRN(name) || hwHasRRN(mail)) {
        return fail("주민등록번호는 적지 말아 주세요. 지우고 다시 보내 주세요.");
      }

      var payload = {
        type: "lead",
        tool: tool,                       // 유입 계산기명
        axis: PAGE.axis,                  // pre(증여) / post(상속)
        name: name, phone: phone, email: mail,
        result: window.__lastResult || "(계산 전)",
        inputs: window.__lastInputs || {},
        lawAsOf: HW_CONFIG.LAW.asOf,
        page: location.href,
        referrer: d.referrer || "",
        ts: new Date().toISOString()
      };

      hwTrack("lead_submit", { has_email: !!mail, has_result: !!window.__lastResult });

      if (HW_CONFIG.LEAD_ENDPOINT) {
        if (msg) msg.textContent = "전송 중…";
        sendViaIframe(payload, msg, btn);
      } else {
        mailFallback(payload, msg);
      }
    });
  }

  /* 숨은 iframe + form POST 전송.
     no-cors fetch 는 응답을 읽을 수 없어 실패해도 성공처럼 보입니다(Day 06 교훈).
     Apps Script 는 e.parameter.data 로 수신하고, doPost 는 payload.type 으로 라우팅합니다.
     iframe 생성 자체가 막힌 경우에만 메일 앱 폴백으로 내려갑니다. */
  function sendViaIframe(payload, msg, btn) {
    try {
      var old = d.getElementById("_hwSink");
      if (old) old.remove();

      var ifr = d.createElement("iframe");
      ifr.id = "_hwSink"; ifr.name = "_hwSink"; ifr.style.display = "none";
      d.body.appendChild(ifr);

      var f = d.createElement("form");
      f.method = "POST"; f.action = HW_CONFIG.LEAD_ENDPOINT;
      f.target = "_hwSink"; f.style.display = "none";

      var i = d.createElement("input");
      i.type = "hidden"; i.name = "data"; i.value = JSON.stringify(payload);
      f.appendChild(i); d.body.appendChild(f);

      var settled = false;
      ifr.addEventListener("load", function () {
        if (settled) return; settled = true;
        if (msg) { msg.className = "msg"; msg.textContent = "신청이 접수되었습니다. 곧 연락드리겠습니다."; }
        if (btn) btn.disabled = true;
      });

      f.submit();
      setTimeout(function () { try { f.remove(); } catch (e) {} }, 3000);

      // 응답이 끝내 오지 않으면 사용자에게 실패를 숨기지 않습니다.
      setTimeout(function () {
        if (settled) return; settled = true;
        if (msg) {
          msg.className = "msg err";
          msg.textContent = "전송 확인이 되지 않았습니다. " + HW_CONFIG.CONTACT.email +
                            " 또는 ☎ " + HW_CONFIG.CONTACT.tel + " 로 연락 주시면 바로 확인하겠습니다.";
        }
      }, 12000);
    } catch (e) {
      mailFallback(payload, msg);
    }
  }

  function mailFallback(p, msg) {
    var body =
      "[HeirWise 상담신청]\n\n" +
      "계산기: " + p.tool + " (" + (AXIS_LABEL[p.axis] || AXIS_LABEL.both) + ")\n" +
      "성함: " + p.name + "\n연락처: " + p.phone + "\n이메일: " + (p.email || "-") + "\n\n" +
      "계산결과: " + p.result + "\n\n" +
      "입력값: " + JSON.stringify(p.inputs) + "\n" +
      "적용 법령 기준일: " + p.lawAsOf + "\n" +
      "유입: " + (p.referrer || "직접") + "\n시각: " + p.ts;
    window.location.href =
      "mailto:" + HW_CONFIG.CONTACT.email +
      "?subject=" + encodeURIComponent("[상담신청] " + p.name + " · " + p.tool) +
      "&body=" + encodeURIComponent(body);
    if (msg) {
      msg.className = "msg";
      msg.textContent = "메일 앱이 열립니다. 그대로 전송해 주세요. (안 열리면 ☎ " + HW_CONFIG.CONTACT.tel + ")";
    }
  }

  /* ============================================================
     ⑤ 시즌 안내 — 상단 띠 + 하단 카드
     · 구간: pre(연휴 전, D-n) / holiday(연휴) / post(연휴 뒤 ~ endAt) / 그 뒤 null(넣지 않음)
     · D-n은 한국 시간 자정 기준 날짜 차이. 사용자 기기 시간대와 무관
     · 띠 닫기: sessionStorage hw_season_banner_closed (그 브라우저 세션 동안)
     · 카드 닫기: localStorage hw_season_card_hide_until (ISO, 7일)
     · 색: 페이지마다 CSS 변수가 달라 index.html 변수 값을 --hws-* 로 옮겨 씀.
       다크 여부는 페이지 실제 배경 밝기로 판정(다크 모드가 없는 페이지에 다크 띠가 뜨지 않게)
     ============================================================ */
  var KST_MS = 9 * 3600 * 1000, DAY_MS = 86400000;

  function seasonNow() {
    var t = Date.now();
    if (HW_CONFIG.DEBUG) {
      // 검증용 — ?hw_now=2026-09-20T10:00:00+09:00 ('+'가 공백으로 바뀐 경우도 복원)
      var m = /[?&]hw_now=([^&#]+)/.exec(location.search);
      if (m) {
        var p = Date.parse(decodeURIComponent(m[1]).replace(/ /g, "+"));
        if (!isNaN(p)) t = p;
      }
    }
    return t;
  }

  function kstDay(t) { return Math.floor((t + KST_MS) / DAY_MS); }

  function seasonPhase(S, now) {
    if (now >= Date.parse(S.endAt) + 1000) return null;       // 23:59:59 초 단위 끝까지 포함
    if (now < Date.parse(S.holidayStart)) return "pre";
    if (now < Date.parse(S.holidayEnd) + 1000) return "holiday";
    return "post";
  }

  function seasonDaysLeft(S, now) { return kstDay(Date.parse(S.holiday)) - kstDay(now); }

  var SEASON_COPY = {
    pre: {
      chip: function (n) { return "추석까지 D-" + n; }, chipHidden: false,
      bar: "가족이 모이기 전에 볼 다섯 가지",
      title: "추석 전에, 다섯 가지만 확인하세요",
      desc: "상속인·미리 받은 재산·빚과 보증·유언장·법인 대표. 우리 집에 해당하는 것부터 하나씩 보시면 됩니다."
    },
    holiday: {
      chip: function () { return "연휴"; }, chipHidden: true,
      bar: "가족이 모인 자리에서 볼 다섯 가지",
      title: "가족이 모인 자리에서, 다섯 가지만 확인하세요",
      desc: "말로 꺼내기 어려우면 이 화면을 함께 보세요. 우리 집에 해당하는 것부터 하나씩 보시면 됩니다."
    },
    post: {
      chip: function () { return "정리"; }, chipHidden: true,
      bar: "연휴에 나눈 이야기, 이렇게 정리하세요",
      title: "연휴에 나눈 이야기, 이렇게 정리하세요",
      desc: "다섯 가지에 맞춰 하나씩 짚어 보세요."
    }
  };

  function injectSeasonStyles() {
    if ($("hw-season-style")) return;
    var st = d.createElement("style");
    st.id = "hw-season-style";
    st.textContent = [
      ".hws-bar,.hws-card{--hws-bg:#FDF1D6;--hws-ink:#1B1B1B;--hws-ink2:#4A453D;--hws-edge:#8A5A00;",
      "--hws-act:#0C5C48;--hws-act-hover:#094536;--hws-act-ink:#FFFFFF;--hws-focus:#0C5C48;",
      "box-sizing:border-box;font-family:inherit;line-height:1.5;letter-spacing:normal;word-break:keep-all;overflow-wrap:anywhere;",
      "background:var(--hws-bg);color:var(--hws-ink)}",
      ".hws-bar[data-hws-scheme=dark],.hws-card[data-hws-scheme=dark]{--hws-bg:#302713;--hws-ink:#F3F0EA;--hws-ink2:#B6BDCA;",
      "--hws-edge:#FFC64D;--hws-act:#54CFA8;--hws-act-hover:#7FE0C0;--hws-act-ink:#14161B;--hws-focus:#FFC64D}",
      ".hws-bar *,.hws-card *{box-sizing:border-box}",
      /* 상단 띠 */
      ".hws-bar{border-bottom:2px solid var(--hws-edge)}",
      ".hws-bar .hws-bar-in{max-width:1120px;margin:0 auto;padding:0 4px 0 16px;display:flex;align-items:center;gap:8px;min-height:48px}",
      ".hws-bar .hws-bar-link{flex:1 1 auto;display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;min-height:48px;padding:8px 0;",
      "color:var(--hws-ink);text-decoration:none;font-size:18px;font-weight:700;line-height:1.4;border-radius:8px}",
      ".hws-bar .hws-bar-link:hover .hws-bar-txt{text-decoration:underline;text-underline-offset:4px}",
      ".hws-chip{display:inline-flex;align-items:center;min-height:32px;padding:0 12px;border:2px solid var(--hws-edge);",
      "border-radius:999px;font-size:18px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}",
      /* 닫기 버튼 (띠·카드 공통) */
      ".hws-bar .hws-x,.hws-card .hws-x{flex:none;width:44px;height:44px;min-width:44px;margin:0;padding:0;display:inline-grid;place-items:center;",
      "border:2px solid transparent;border-radius:8px;background:transparent;color:var(--hws-ink);font:inherit;font-size:22px;line-height:1;cursor:pointer;",
      "transition:border-color 150ms ease-out}",
      ".hws-bar .hws-x:hover,.hws-card .hws-x:hover{border-color:var(--hws-edge)}",
      ".hws-bar a:focus-visible,.hws-bar button:focus-visible,.hws-card a:focus-visible,.hws-card button:focus-visible{outline:3px solid var(--hws-focus);outline-offset:2px}",
      /* 하단 카드 — 모달 아님(오버레이·포커스 가두기 없음) */
      ".hws-card{position:fixed;right:24px;bottom:24px;z-index:55;width:calc(100% - 48px);max-width:380px;margin:0;",
      "border:2px solid var(--hws-edge);border-radius:16px;padding:20px;",
      "transition:opacity 150ms ease-out,transform 150ms ease-out}",
      ".hws-card[data-hws-enter]{opacity:0;transform:translateY(12px)}",
      ".hws-card .hws-x{position:absolute;top:8px;right:8px}",
      ".hws-card .hws-card-t{margin:0 48px 8px 0;font-size:22px;font-weight:800;line-height:1.35;letter-spacing:-.02em;text-wrap:balance;color:var(--hws-ink)}",
      ".hws-card .hws-card-d{margin:0 0 16px;font-size:18px;line-height:1.6;color:var(--hws-ink2);text-wrap:pretty}",
      ".hws-card .hws-card-b{display:grid;gap:8px}",
      ".hws-card .hws-btn{display:flex;align-items:center;justify-content:center;min-height:48px;padding:8px 16px;border-radius:8px;",
      "font-size:18px;font-weight:800;line-height:1.3;text-align:center;text-decoration:none;",
      "transition:background-color 150ms ease-out,border-color 150ms ease-out,transform 150ms ease-out}",
      ".hws-card .hws-btn:active{transform:scale(.97)}",
      ".hws-card .hws-btn-p{background:var(--hws-act);color:var(--hws-act-ink);border:2px solid var(--hws-act)}",
      ".hws-card .hws-btn-p:hover{background:var(--hws-act-hover);border-color:var(--hws-act-hover)}",
      ".hws-card .hws-btn-g{background:transparent;color:var(--hws-ink);border:2px solid var(--hws-ink2)}",
      ".hws-card .hws-btn-g:hover{border-color:var(--hws-ink)}",
      "@media (max-width:599.98px){.hws-card{left:0;right:0;bottom:0;width:auto;max-width:none;border-width:2px 0 0;",
      "border-radius:16px 16px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom))}",
      ".hws-card .hws-x{top:6px;right:6px}.hws-card[data-hws-enter]{transform:translateY(100%)}}",
      /* 확대(400%) 등 세로가 짧은 화면 — 떠 있는 카드가 본문을 덮지 않게 문서 흐름 안으로 */
      "@media (max-height:480px){.hws-card{position:static;width:auto;max-width:none;margin:16px;border-radius:16px;border-width:2px}}",
      "@media (prefers-reduced-motion:reduce){.hws-card,.hws-card .hws-btn,.hws-bar .hws-x,.hws-card .hws-x{transition:none}",
      ".hws-card[data-hws-enter]{transform:none}.hws-card .hws-btn:active{transform:none}}",
      "@media print{.hws-bar,.hws-card{display:none!important}}"
    ].join("");
    d.head.appendChild(st);
  }

  // 페이지 실제 배경이 어두운지 — body → html 순으로 불투명한 배경색을 찾음
  function pageIsDark() {
    var els = [d.body, d.documentElement];
    for (var i = 0; i < els.length; i++) {
      var m = /rgba?\(([^)]+)\)/.exec(getComputedStyle(els[i]).backgroundColor || "");
      if (!m) continue;
      var p = m[1].split(",").map(parseFloat);
      if (p.length === 4 && p[3] === 0) continue;
      return (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255 < 0.5;
    }
    return false;
  }

  function nextFocusableAfter(el) {
    var list = d.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex='-1'])");
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (el.contains(c)) continue;
      if (el.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING && c.getClientRects().length) return c;
    }
    return null;
  }

  function injectSeason() {
    var S = HW_CONFIG.SEASON;
    if (!S || !d.body) return;
    if (d.body.getAttribute("data-season") === "off") return;
    var norm = function (p) { return (p || "").replace(/\.html?$/i, "").replace(/\/$/, ""); };
    if (norm(location.pathname) === norm(S.href)) return;       // 안내 대상 페이지 자신에는 넣지 않음

    var now = seasonNow();
    var phase = seasonPhase(S, now);
    if (!phase) return;                                         // endAt 이후 — DOM에 아무것도 넣지 않음

    var copy = SEASON_COPY[phase];
    var chipText = copy.chip(seasonDaysLeft(S, now));
    var base = { season: S.id, phase: phase };
    function ev(name, btn) {
      var p = { season: base.season, phase: base.phase };
      if (btn) p.btn = btn;
      hwTrack(name, p);
    }

    injectSeasonStyles();
    var themed = [];
    function applyScheme() {
      var s = pageIsDark() ? "dark" : "light";
      themed.forEach(function (el) { el.setAttribute("data-hws-scheme", s); });
    }
    // 테마 전환 버튼(data-theme)·OS 설정 변경을 따라감
    new MutationObserver(applyScheme).observe(d.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      if (mq.addEventListener) mq.addEventListener("change", applyScheme);
      else if (mq.addListener) mq.addListener(applyScheme);
    }

    /* (1) 상단 띠 */
    var barClosed = false;
    try { barClosed = sessionStorage.getItem("hw_season_banner_closed") === "1"; } catch (e) {}
    if (!barClosed) {
      var bar = d.createElement("div");
      bar.className = "hws-bar";
      bar.innerHTML =
        '<div class="hws-bar-in">' +
          '<a class="hws-bar-link" href="' + S.href + '">' +
            '<span class="hws-chip"' + (copy.chipHidden ? ' aria-hidden="true"' : "") + ">" + chipText + "</span>" +
            '<span class="hws-bar-txt">' + copy.bar + ' <span aria-hidden="true">→</span></span>' +
          "</a>" +
          '<button type="button" class="hws-x" aria-label="추석 안내 닫기"><span aria-hidden="true">✕</span></button>' +
        "</div>";
      var first = d.body.firstElementChild;
      if (first && first.matches("a.skip, a.skip-link, a[href='#main']")) first = first.nextElementSibling;
      d.body.insertBefore(bar, first);
      themed.push(bar);

      bar.querySelector(".hws-bar-link").addEventListener("click", function () { ev("season_banner_click", "bar"); });
      bar.querySelector(".hws-x").addEventListener("click", function () {
        var next = nextFocusableAfter(bar);
        try { sessionStorage.setItem("hw_season_banner_closed", "1"); } catch (e) {}
        ev("season_banner_close", "x");
        bar.remove();
        if (next) next.focus({ preventScroll: true });
      });
      ev("season_banner_view");
    }

    /* (2) 하단 카드 — 스크롤 30% 또는 8초 중 먼저 오는 시점에 1회 */
    var hideUntil = NaN;
    try { hideUntil = Date.parse(localStorage.getItem("hw_season_card_hide_until") || ""); } catch (e) {}
    if (!isNaN(hideUntil) && hideUntil > now) { applyScheme(); return; }

    var shown = false, timer = 0;
    function onScroll() {
      var h = d.documentElement.scrollHeight - window.innerHeight;
      if (h > 0 && window.scrollY / h >= 0.3) showCard();
    }
    function showCard() {
      if (shown) return;
      shown = true;
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);

      var card = d.createElement("div");
      card.className = "hws-card";
      card.setAttribute("data-hws-enter", "");
      card.innerHTML =
        '<p class="hws-card-t">' + copy.title + "</p>" +
        '<p class="hws-card-d">' + copy.desc + "</p>" +
        '<div class="hws-card-b">' +
          '<a class="hws-btn hws-btn-p" data-btn="five" href="' + S.href + '">다섯 가지 보기 · 1분</a>' +
          '<a class="hws-btn hws-btn-g" data-btn="print" href="' + S.href + '#get">인쇄용 한 장 받기</a>' +
        "</div>" +
        '<button type="button" class="hws-x" aria-label="추석 안내 카드 닫기"><span aria-hidden="true">✕</span></button>';
      d.body.appendChild(card);
      themed.push(card);
      applyScheme();

      // 화면 아래에 붙은 고정 막대(예: booking.html 하단 버튼 줄)가 있으면 그 위로 띄움
      function avoidBottomBars() {
        if (getComputedStyle(card).position !== "fixed") { card.style.marginBottom = ""; return; }
        var vh = window.innerHeight, lift = 0, all = d.body.getElementsByTagName("*");
        for (var i = 0; i < all.length; i++) {
          var el = all[i];
          if (el === card || card.contains(el) || getComputedStyle(el).position !== "fixed") continue;
          var r = el.getBoundingClientRect();
          if (r.height > 0 && r.bottom >= vh - 2 && r.top > vh / 2 && r.width >= window.innerWidth / 2) lift = Math.max(lift, vh - r.top);
        }
        card.style.marginBottom = lift ? lift + "px" : "";
      }
      avoidBottomBars();
      window.addEventListener("resize", avoidBottomBars);

      requestAnimationFrame(function () { requestAnimationFrame(function () { card.removeAttribute("data-hws-enter"); }); });

      function closeCard(btn) {
        try { localStorage.setItem("hw_season_card_hide_until", new Date(seasonNow() + 7 * DAY_MS).toISOString()); } catch (e) {}
        ev("season_card_close", btn);
        if (card.contains(d.activeElement)) d.activeElement.blur();
        d.removeEventListener("keydown", onKey);
        window.removeEventListener("resize", avoidBottomBars);
        card.remove();
      }
      function onKey(e) {
        if (e.key !== "Escape" && e.key !== "Esc") return;
        // 페이지의 진짜 모달(예: 사례 이미지 확대)이 열려 있으면 그쪽 Esc에 양보
        var modals = d.querySelectorAll("[aria-modal='true']");
        for (var i = 0; i < modals.length; i++) { if (modals[i].getClientRects().length) return; }
        closeCard("esc");
      }
      d.addEventListener("keydown", onKey);
      card.querySelector(".hws-x").addEventListener("click", function () { closeCard("x"); });
      Array.prototype.forEach.call(card.querySelectorAll("a[data-btn]"), function (a) {
        a.addEventListener("click", function () { ev("season_card_click", a.getAttribute("data-btn")); });
      });
      ev("season_card_view");
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    timer = setTimeout(showCard, 8000);
    applyScheme();
  }


  /* ------------------------------------------------------------
     개인정보처리방침 링크 (2026-09-21)
     페이지마다 푸터 구조가 달라, 없는 곳에만 공통으로 한 줄 넣는다.
     - 이미 /privacy.html 링크가 있으면 아무것도 하지 않음
     - privacy.html 자신에는 넣지 않음
     ------------------------------------------------------------ */
  function injectPrivacyLink() {
    if (/\/privacy\.html$/.test(location.pathname)) return;
    if (d.querySelector('a[href$="privacy.html"]')) return;
    if ($("hw-privacy-line")) return;

    var line = d.createElement("div");
    line.id = "hw-privacy-line";
    line.style.cssText =
      "margin:18px auto 0;padding:14px 16px 20px;max-width:900px;text-align:center;" +
      "font-size:16px;line-height:1.7;opacity:.95";
    var a = d.createElement("a");
    a.href = "/privacy.html";
    a.textContent = "개인정보처리방침";
    a.style.cssText = "color:inherit;text-decoration:underline;padding:8px 12px;display:inline-block;min-height:44px;box-sizing:border-box";
    line.appendChild(a);

    var foot = d.querySelector("footer");
    if (foot) { foot.appendChild(line); }
    else { (d.querySelector("main") || d.body).appendChild(line); }
  }

  /* ============================================================
     ⑥ 실행
     ============================================================ */
  function boot() {
    try { injectLawUI(); }    catch (e) { if (HW_CONFIG.DEBUG) console.error(e); }
    try { unifyLeadForm(); }  catch (e) { if (HW_CONFIG.DEBUG) console.error(e); }
    try { injectSeason(); }   catch (e) { if (HW_CONFIG.DEBUG) console.error(e); }
    try { injectPrivacyLink(); } catch (e) { if (HW_CONFIG.DEBUG) console.error(e); }
  }

  if (d.readyState === "loading") {
    d.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
