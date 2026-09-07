/*!
 * heirwise-common.js — HeirWise 공통 스크립트 v1.0
 * 보안등급: 공유 가능 | 제작: HeirWise_Syn Dae Sik (申大湜)
 *
 * 이 파일 하나가 아래 세 가지를 전 페이지에 일괄 적용합니다.
 *   T-01  GA4 계측 (이벤트 6종)
 *   T-04  상담 폼 통일 (이메일 필드 추가 + 유입 계산기 기록)
 *   T-06  적용 법령 기준일 UI 표시 (프로젝트 규칙 5-3)
 *
 * 각 페이지에는 </body> 바로 앞에 아래 한 줄만 넣으면 됩니다.
 *   <script src="heirwise-common.js" defer></script>
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
    LEAD_ENDPOINT: "https://script.google.com/macros/s/AKfycbwcgtbX_685BwUrylnqEBua73PEaJICd73MjBG5D2AapXDEweWp7eq1b2vykvBB4uM/exec",

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

    DEBUG: false                   // true면 발생 이벤트를 콘솔에 출력
  };
  window.HW_CONFIG = HW_CONFIG;

  var $ = function (id) { return document.getElementById(id); };
  var d = document;

  /* ============================================================
     ② T-01 — GA4 계측
     이벤트 6종: calc_view / calc_start / calc_complete / lead_submit
                 axis_select / sim_reach
     모든 이벤트에 tool(계산기명)·axis(pre=증여, post=상속) 파라미터를 붙입니다.
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

  function detectPage() {
    var b = d.body || {};
    var ds = b.dataset || {};
    if (ds.tool) return { tool: ds.tool, axis: ds.axis || "both" };
    var slug = (location.pathname.split("/").pop() || "index.html")
                 .replace(/\.html?$/i, "") || "index";
    return PAGE_AXIS[slug] || { tool: slug, axis: "both" };
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
        ' &nbsp;→&nbsp; <a href="consult.html" style="color:inherit">무료 상담 신청</a></div>';
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
      "계산기: " + p.tool + " (" + (p.axis === "pre" ? "사전축·증여" : p.axis === "post" ? "사후축·상속" : "공통") + ")\n" +
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
     ⑤ 실행
     ============================================================ */
  function boot() {
    try { injectLawUI(); }    catch (e) { if (HW_CONFIG.DEBUG) console.error(e); }
    try { unifyLeadForm(); }  catch (e) { if (HW_CONFIG.DEBUG) console.error(e); }
  }

  if (d.readyState === "loading") {
    d.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
