/* HeirWise 협업 네트워크 — 공통 스크립트 (2026-09-17)
 * 페이지: <body data-nw="map|principles|partners|join|connect">
 * 규칙: 이벤트는 heirwise-common.js 의 hwTrack 만 사용 · localStorage 는 try/catch · 전송 로직 없음(1단계)
 * 노출 규칙(PRD v3.0 §5.7): status=listed 만 · 같은 분야 안에서 지역 일치 → 무작위 · 유료 상단 노출 없음
 */
(function () {
  "use strict";
  var d = document;
  var CFG = window.HW_CONFIG || {};
  var TEL = (CFG.CONTACT && CFG.CONTACT.tel) || "010-2088-5383";
  var MAIL = (CFG.CONTACT && CFG.CONTACT.email) || "itart@finitart.com";
  var DATA_URL = "/network/network-data.json";
  var SAMPLE_URL = "/network/network-sample.local.json"; // DEBUG 전용 · 저장소에 넣지 않음

  var TOOL_LABEL = {
    "/inheritdebt.html": "상속채무 진단기",
    "/calculator.html": "상속세 계산기",
    "/insurance-two-faces.html": "보험금과 상속세",
    "/ceo-diagnosis.html": "대표님 진단",
    "/car-accident.html": "교통사고 보상 계산",
    "/industrial-accident.html": "산업재해 보상 계산",
    "/fire-accident.html": "화재 사고 보상 계산",
    "/disability-trust.html": "장애인 신탁 계산",
    "/natural-death.html": "자연사 상속 안내",
    "/book.html": "『상속설계의 기술』 받기"
  };
  var MODE_LABEL = { referral: "연결", joint_consult: "공동 상담", column: "기고", seminar: "세미나" };
  var REGIONS = ["서울", "경기", "인천", "강원", "충북", "충남", "대전", "세종", "전북", "전남", "광주", "경북", "경남", "대구", "울산", "부산", "제주", "전국(비대면)"];

  function track(name, params, once) {
    try { if (typeof window.hwTrack === "function") window.hwTrack(name, params || {}, once); } catch (e) {}
  }
  function el(tag, attrs, kids) {
    var n = d.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? d.createTextNode(c) : c); });
    return n;
  }
  function qs(name) { try { return new URLSearchParams(location.search).get(name); } catch (e) { return null; } }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ── 화면 밝기 (index.html 과 같은 키 hw-theme) ── */
  function initTheme() {
    var root = d.documentElement, saved = store("hw-theme");
    if (saved === "dark" || saved === "light") root.setAttribute("data-theme", saved);
    var btn = d.getElementById("themeBtn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var now = root.getAttribute("data-theme") ||
        (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      var next = now === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      store("hw-theme", next);
    });
  }

  /* ── 데이터 ── */
  function loadData() {
    return fetch(DATA_URL, { cache: "no-cache", credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (data) {
      if (!CFG.DEBUG) return data;
      return fetch(SAMPLE_URL, { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : []; })
        .then(function (s) { (s || []).forEach(function (p) { p._sample = true; data.partners.push(p); }); return data; })
        .catch(function () { return data; });
    });
  }
  function loadFail(box) {
    box.innerHTML = "";
    box.appendChild(el("div", { class: "note warn", role: "alert" }, [
      el("p", {}, ["목록을 불러오지 못했습니다. 전화 ", el("a", { href: "tel:+82" + TEL.replace(/^0/, "").replace(/-/g, ""), text: TEL })])
    ]));
  }

  /* ── 노출 규칙 ── */
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var r;
      if (window.crypto && crypto.getRandomValues) { var u = new Uint32Array(1); crypto.getRandomValues(u); r = u[0] % (i + 1); }
      else r = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[r]; a[r] = t;
    }
    return a;
  }
  function regionMatch(p, region) {
    if (!region) return false;
    return (p.region || []).some(function (x) { return x.indexOf(region) === 0 || x === "전국(비대면)"; });
  }
  function isShowable(p, rules) {
    if (!p || p.status !== "listed") return false;
    if (!p.agreement || p.agreement.signed !== true || p.agreement.no_referral_fee !== true) return false;
    var rule = rules && rules[p.field];
    if (rule && rule.hold && !p.field_rule_checked_at) return false; // 직역별 게재 규정 확인 전 보류
    return true;
  }
  function orderPartners(list, region) {
    var hit = [], rest = [];
    list.forEach(function (p) { (regionMatch(p, region) ? hit : rest).push(p); });
    return shuffle(hit).concat(shuffle(rest));
  }
  window.HW_NETWORK = { orderPartners: orderPartners, isShowable: isShowable }; // 검수용

  /* ── 카드 ── */
  function vacantCard(g, field) {
    var href = "/network/join.html?group=" + encodeURIComponent(g.id) + (field ? "&field=" + encodeURIComponent(field) : "");
    var a = el("a", { class: "btn btn-ghost", href: href, text: "협업 제안하기" });
    a.addEventListener("click", function () { track("network_join_click", { group: g.id }); });
    return el("div", { class: "vacant" }, [
      el("p", {}, ["이 분야의 협업 기관을 모시고 있습니다", el("br"), el("small", { text: field ? field : g.fields.join(" · ") })]),
      a
    ]);
  }
  function partnerCard(p, g) {
    var badges = el("p", { class: "meta" });
    if (p.credential_verified_at) badges.appendChild(el("span", { class: "badge verified", text: "✔ 자격 확인 " + p.credential_verified_at }));
    if (p.affiliate) { badges.appendChild(d.createTextNode(" ")); badges.appendChild(el("span", { class: "badge affiliate", text: "SynItArt 계열" })); }
    var dl = el("dl", {}, [
      el("dt", { text: "자격" }), el("dd", { text: p.credential || "—" }),
      el("dt", { text: "지역" }), el("dd", { text: (p.region || []).join(", ") || "—" }),
      el("dt", { text: "협업 방식" }), el("dd", { text: (p.modes || []).map(function (m) { return MODE_LABEL[m] || m; }).join(" · ") || "—" })
    ]);
    var connect = el("a", { class: "btn btn-primary", href: "/network/connect.html?group=" + encodeURIComponent(g.id) + "&field=" + encodeURIComponent(p.field), text: "연결 요청" });
    var card = el("article", { class: "pcard" + (p._sample ? " is-sample" : ""), "aria-label": p.org + (p._sample ? " (샘플)" : "") }, [
      el("h3", { text: p.org }),
      el("p", { class: "meta", text: p.field }),
      badges,
      p.intro ? el("p", { class: "intro", text: p.intro }) : null,
      dl,
      el("div", { class: "actions" }, [connect])
    ]);
    return card;
  }

  /* ── 분야 지도 (index) ── */
  function renderMap(data) {
    var box = d.getElementById("groups"), jump = d.getElementById("jump");
    var selG = d.getElementById("fGroup"), selR = d.getElementById("fRegion"), count = d.getElementById("count");
    box.innerHTML = ""; jump.innerHTML = "";
    var region = qs("region") || store("hw_nw_region") || "";

    REGIONS.forEach(function (r) { selR.appendChild(el("option", { value: r, text: r })); });
    selR.value = REGIONS.indexOf(region) >= 0 ? region : "";

    data.groups.forEach(function (g) {
      selG.appendChild(el("option", { value: g.id, text: g.id + " " + g.title }));
      var ja = el("a", { href: "#g-" + g.id }, [el("b", { text: g.id }), g.title]);
      ja.addEventListener("click", function () { track("network_group_open", { group: g.id }); });
      jump.appendChild(el("li", {}, [ja]));

      var chips = el("ul", { class: "chips", "aria-label": g.title + " 분야" });
      g.fields.forEach(function (f) {
        var rule = data.field_rules && data.field_rules[f];
        chips.appendChild(el("li", { class: "chip" }, [f, rule && rule.hold ? el("span", { class: "hold", title: rule.basis, text: "· 게재 규정 확인 중" }) : null]));
      });
      var tools = null;
      if (g.tools && g.tools.length) {
        tools = el("p", { class: "nw-tools" }, ["이런 상황에서 함께 봅니다 → "]);
        g.tools.forEach(function (t) { tools.appendChild(el("a", { href: t, text: TOOL_LABEL[t] || t })); });
      }
      var grid = el("div", { class: "nw-grid", "data-grid": g.id });
      var sec = el("section", { class: "nw-group", id: "g-" + g.id, "aria-labelledby": "h-" + g.id, "data-group": g.id }, [
        el("header", {}, [el("span", { class: "gid", text: g.id }), el("h2", { id: "h-" + g.id, text: g.title })]),
        el("p", { class: "nw-sit", text: g.situation || "" }),
        el("p", { class: "nw-verticals", text: "이어지는 곳: " + (g.verticals || []).join(" · ") }),
        chips, tools, grid
      ]);
      box.appendChild(sec);
    });

    function paint() {
      var gsel = selG.value, rsel = selR.value, shown = 0, orgs = 0;
      store("hw_nw_region", rsel);
      data.groups.forEach(function (g) {
        var sec = d.getElementById("g-" + g.id), grid = sec.querySelector("[data-grid]");
        sec.hidden = !!gsel && gsel !== g.id;
        if (sec.hidden) return;
        shown++;
        grid.innerHTML = "";
        var list = data.partners.filter(function (p) { return p.group === g.id && (isShowable(p, data.field_rules) || (CFG.DEBUG && p._sample)); });
        var byField = {};
        list.forEach(function (p) { (byField[p.field] = byField[p.field] || []).push(p); });
        var any = false;
        g.fields.forEach(function (f) {
          if (!byField[f]) return;
          orderPartners(byField[f], rsel).forEach(function (p) { grid.appendChild(partnerCard(p, g)); orgs++; any = true; });
        });
        grid.appendChild(vacantCard(g));
      });
      count.textContent = "분야 묶음 " + shown + "개" + (orgs ? " · 게재 기관 " + orgs + "곳" : " · 아직 게재된 기관은 없습니다");
    }
    selG.addEventListener("change", function () { if (selG.value) track("network_group_open", { group: selG.value }); paint(); });
    selR.addEventListener("change", paint);
    var g0 = qs("group"); if (g0 && data.groups.some(function (g) { return g.id === g0; })) selG.value = g0;
    paint();
    track("network_view", {}, true);
  }

  /* ── 폼 공통 ── */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var TEL_RE = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;
  function setErr(input, msg) {
    var id = input.getAttribute("aria-describedby") || "";
    var errEl = id.split(" ").map(function (x) { return d.getElementById(x); }).filter(function (x) { return x && x.classList.contains("err"); })[0];
    if (errEl) errEl.textContent = msg || "";
    if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
    return !msg;
  }
  function fillGroups(sel, data, preset) {
    data.groups.forEach(function (g) { sel.appendChild(el("option", { value: g.id, text: g.id + " " + g.title })); });
    if (preset && data.groups.some(function (g) { return g.id === preset; })) sel.value = preset;
  }
  function fillFields(sel, data, gid, preset) {
    sel.innerHTML = "";
    sel.appendChild(el("option", { value: "", text: gid ? "분야를 고르세요" : "먼저 묶음을 고르세요" }));
    var g = data.groups.filter(function (x) { return x.id === gid; })[0];
    if (g) g.fields.forEach(function (f) { sel.appendChild(el("option", { value: f, text: f })); });
    sel.appendChild(el("option", { value: "기타", text: "기타 (소개란에 적어 주세요)" }));
    if (preset) sel.value = preset;
  }
  function counter(ta, out, max) {
    function upd() {
      var lines = ta.value.split(/\n/).length;
      out.textContent = ta.value.length + " / " + max + "자 · " + lines + "줄";
    }
    ta.addEventListener("input", upd); upd();
  }
  function copyText(text, statusEl) {
    function done(ok) { statusEl.textContent = ok ? "복사했습니다. 메일 본문에 붙여 넣어 " + MAIL + " 으로 보내 주세요." : "복사하지 못했습니다. 내용을 직접 선택해 복사해 주세요."; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    else done(false);
  }

  /* ── 합류 신청 (join) — 전송 없음 ── */
  function initJoin(data) {
    var f = d.getElementById("joinForm");
    var g = f.elements.group, fld = f.elements.field;
    fillGroups(g, data, qs("group"));
    fillFields(fld, data, g.value, qs("field"));
    g.addEventListener("change", function () { fillFields(fld, data, g.value); });
    REGIONS.forEach(function (r) { d.getElementById("regionList").appendChild(el("label", { class: "check" }, [el("input", { type: "checkbox", name: "region", value: r }), r])); });
    counter(f.elements.intro, d.getElementById("introCount"), 300);
    var status = d.getElementById("joinStatus");

    function validate() {
      var ok = true, first = null;
      function chk(input, msg) { var r = setErr(input, msg); if (!r) { ok = false; first = first || input; } }
      chk(f.elements.org, f.elements.org.value.trim() ? "" : "기관명을 적어 주세요.");
      chk(f.elements.person, f.elements.person.value.trim() ? "" : "담당자 이름을 적어 주세요.");
      var em = f.elements.email.value.trim();
      chk(f.elements.email, !em ? "이메일을 적어 주세요." : (EMAIL_RE.test(em) ? "" : "이메일 형식을 확인해 주세요. 예: name@example.com"));
      var tel = f.elements.tel.value.trim();
      chk(f.elements.tel, !tel ? "전화번호를 적어 주세요." : (TEL_RE.test(tel) ? "" : "전화번호 형식을 확인해 주세요. 예: 010-1234-5678"));
      chk(g, g.value ? "" : "묶음을 골라 주세요.");
      chk(fld, fld.value ? "" : "분야를 골라 주세요.");
      var regions = [].slice.call(f.querySelectorAll('input[name=region]:checked'));
      chk(d.getElementById("regionBox"), regions.length ? "" : "활동 지역을 하나 이상 골라 주세요.");
      var modes = [].slice.call(f.querySelectorAll('input[name=modes]:checked'));
      chk(d.getElementById("modesBox"), modes.length ? "" : "협업 방식을 하나 이상 골라 주세요.");
      var intro = f.elements.intro.value.trim();
      chk(f.elements.intro, !intro ? "소개를 적어 주세요." : (intro.length > 300 ? "300자 안으로 줄여 주세요." : (intro.split(/\n/).length > 3 ? "세 줄 안으로 줄여 주세요." : "")));
      chk(f.elements.agree_privacy, f.elements.agree_privacy.checked ? "" : "개인정보 수집·이용에 동의해 주셔야 검토할 수 있습니다.");
      chk(f.elements.agree_nofee, f.elements.agree_nofee.checked ? "" : "소개 대가를 주고받지 않는 원칙에 동의해 주셔야 합류할 수 있습니다.");
      if (first) first.focus();
      return ok ? { regions: regions.map(function (x) { return x.value; }), modes: modes.map(function (x) { return x.value; }) } : null;
    }
    f.addEventListener("submit", function (e) { e.preventDefault(); });
    d.getElementById("joinCheck").addEventListener("click", function () {
      var v = validate();
      if (!v) { status.textContent = "빠진 곳을 채워 주세요. 표시된 칸부터 확인하시면 됩니다."; return; }
      var text = [
        "[HeirWise 협업 네트워크 합류 신청]",
        "기관명: " + f.elements.org.value.trim(),
        "담당자: " + f.elements.person.value.trim(),
        "이메일: " + f.elements.email.value.trim() + " / 전화: " + f.elements.tel.value.trim(),
        "묶음·분야: " + g.value + " / " + fld.value,
        "자격·등록번호: " + (f.elements.credential.value.trim() || "(없음)"),
        "활동 지역: " + v.regions.join(", "),
        "협업 방식: " + v.modes.map(function (m) { return MODE_LABEL[m]; }).join(", "),
        "소개:", f.elements.intro.value.trim(),
        "동의: 개인정보 수집·이용 ✔ / 소개 대가 없음 원칙 ✔"
      ].join("\n");
      d.getElementById("joinCopy").hidden = false;
      d.getElementById("joinCopy").onclick = function () { copyText(text, status); };
      status.textContent = "입력 형식이 모두 맞습니다. 온라인 접수는 준비 중이라, 아래 버튼으로 내용을 복사해 " + MAIL + " 으로 보내 주세요.";
    });
  }

  /* ── 연결 요청서 (connect) — 2단계 공개 전, 전송 없음 ── */
  function initConnect(data) {
    var f = d.getElementById("connForm");
    var g = f.elements.group, fld = f.elements.field;
    fillGroups(g, data, qs("group"));
    fillFields(fld, data, g.value, qs("field"));
    g.addEventListener("change", function () { fillFields(fld, data, g.value); });
    REGIONS.forEach(function (r) { f.elements.region.appendChild(el("option", { value: r, text: r })); });
    counter(f.elements.summary, d.getElementById("sumCount"), 500);
    var status = d.getElementById("connStatus");
    var RRN = /\d{6}\s*-\s*[1-4]\d{6}/;
    f.addEventListener("submit", function (e) { e.preventDefault(); });
    d.getElementById("connCheck").addEventListener("click", function () {
      var ok = true, first = null;
      function chk(input, msg) { if (!setErr(input, msg)) { ok = false; first = first || input; } }
      chk(g, g.value ? "" : "필요한 분야 묶음을 골라 주세요.");
      var s = f.elements.summary.value.trim();
      chk(f.elements.summary, !s ? "상황을 짧게 적어 주세요." : (s.length > 500 ? "500자 안으로 줄여 주세요." : (RRN.test(s) ? "주민등록번호는 적지 말아 주세요. 지워 주시면 됩니다." : "")));
      chk(f.elements.region, f.elements.region.value ? "" : "지역을 골라 주세요.");
      var tel = f.elements.tel.value.trim();
      chk(f.elements.tel, !tel ? "연락받을 전화번호를 적어 주세요." : (TEL_RE.test(tel) ? "" : "전화번호 형식을 확인해 주세요. 예: 010-1234-5678"));
      chk(f.elements.agree_collect, f.elements.agree_collect.checked ? "" : "수집·이용에 동의해 주셔야 연결할 수 있습니다.");
      chk(f.elements.agree_third, f.elements.agree_third.checked ? "" : "기관에 전달하려면 제3자 제공 동의가 필요합니다.");
      if (first) first.focus();
      status.textContent = ok
        ? "입력 형식이 모두 맞습니다. 연결 요청 접수는 아직 열리지 않았습니다. 지금은 전화 " + TEL + " 로 말씀해 주세요."
        : "빠진 곳을 채워 주세요. 표시된 칸부터 확인하시면 됩니다.";
    });
  }

  /* ── 시작 ── */
  function start() {
    initTheme();
    var page = d.body.getAttribute("data-nw");
    if (page === "principles" || page === "partners") { track("network_view", { sub: page }, true); return; }
    var box = d.getElementById("groups") || d.getElementById("formBox");
    loadData().then(function (data) {
      if (page === "map") renderMap(data);
      else if (page === "join") initJoin(data);
      else if (page === "connect") initConnect(data);
    }).catch(function () { if (box) loadFail(box); });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", start); else start();
})();
