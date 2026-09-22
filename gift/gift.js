/* HeirWise™ gift/ — 부모님께 받는 돈 · 증여세 개략 계산 (순수 함수만, DOM 없음)
 *
 * 적용 법령: 상속세 및 증여세법 법률 제21065호 (2026. 1. 2. 시행)
 *   §47② 10년 합산(합계 1천만원 이상일 때만) · §53 증여재산 공제 · §53의2 혼인·출산 공제
 *   §55② 과세표준 50만원 미만 과세 안 함 · §56(§26 세율) · §68① 신고기한 · §69② 신고세액공제
 *   §57 세대생략 할증 · §58 납부세액공제 — 이 계산기 범위 밖(안내만)
 *
 * 규칙(L6): 세액·기한은 이 파일의 규칙으로만 계산한다. AI/LLM 사용 금지.
 * 날짜: 'YYYY-MM-DD' 문자열 → 일 번호(UTC 자정 기준 정수) 산술만. 시각·시간대 없음.
 * 테스트: HeirWise-PRD/tests/gift.test.js (Y1-6 13케이스 + Y1-9 분류 케이스)
 * 결과는 모두 「개략 추정」이다. 정확한 세액은 세무전문가 상담이 필요하다.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HWGift = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var MAN = 10000;               // 1만원
  var EOK = 100000000;           // 1억원

  var LAW = {
    act: "상속세 및 증여세법 법률 제21065호 (2026. 1. 2. 시행)",
    basic: { parentAdult: 5000 * MAN, parentMinor: 2000 * MAN, relative: 1000 * MAN }, // §53
    special: 1 * EOK,            // §53의2 ①② 각 1억, ③ 합계 1억
    aggregateMin: 1000 * MAN,    // §47② 합계 1천만원 이상일 때만 합산
    minBase: 50 * MAN,           // §55② 과세표준 50만원 미만 → 과세 안 함
    // §56 → §26 세율 (시행규칙 별지 제10호서식 대조, 부록 B v3)
    brackets: [
      { upTo: 1 * EOK,  rate: 0.10, less: 0 },
      { upTo: 5 * EOK,  rate: 0.20, less: 1000 * MAN },
      { upTo: 10 * EOK, rate: 0.30, less: 6000 * MAN },
      { upTo: 30 * EOK, rate: 0.40, less: 16000 * MAN },
      { upTo: Infinity, rate: 0.50, less: 46000 * MAN }
    ],
    reportCredit: 0.03,          // §69② — 산출세액에서 같은 항 각 호 금액을 뺀 금액의 3%
    windowYears: 2               // §53의2 ① 혼인일 전후 2년 · ② 출생일·입양일부터 2년
  };

  /* ── 날짜 (일 번호) ───────────────────────────── */
  function parseYmd(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
    return Date.UTC(y, mo - 1, d) / 86400000;
  }
  function daysInMonth(y, mo) { return new Date(Date.UTC(y, mo, 0)).getUTCDate(); }
  function toYmd(n) {
    var dt = new Date(n * 86400000);
    var y = dt.getUTCFullYear(), mo = dt.getUTCMonth() + 1, d = dt.getUTCDate();
    return y + "-" + (mo < 10 ? "0" : "") + mo + "-" + (d < 10 ? "0" : "") + d;
  }
  function parts(n) {
    var dt = new Date(n * 86400000);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  }
  // 같은 날짜로 n년 이동 (2월 29일 → 없는 해는 2월 28일)
  function addYears(n, years) {
    var p = parts(n), y = p.y + years;
    return Date.UTC(y, p.m - 1, Math.min(p.d, daysInMonth(y, p.m))) / 86400000;
  }
  /* §68① 증여받은 날이 속하는 달의 말일부터 3개월 이내 → 3개월 뒤 달의 말일
     예) 2026-01-31 → 2026-04-30 · 2026-09-21 → 2026-12-31 */
  function reportDeadline(giftYmd) {
    var n = parseYmd(giftYmd); if (n == null) return null;
    var p = parts(n), mo = p.m + 3, y = p.y;
    if (mo > 12) { mo -= 12; y += 1; }
    return toYmd(Date.UTC(y, mo - 1, daysInMonth(y, mo)) / 86400000);
  }
  function daysBetween(fromYmd, toYmdStr) {
    var a = parseYmd(fromYmd), b = parseYmd(toYmdStr);
    return (a == null || b == null) ? null : b - a;
  }

  /* §53의2 기간 판정 — 기간 계산은 민법 §157(초일 불산입)·§160(역에 의한 계산)에 따라
     「기준일로부터 2년」의 끝을 2년 뒤 같은 날짜로 본다 [해석: 세무전문가 확인 권장].
     혼인: [혼인일−2년, 혼인일+2년] · 출산·입양: [출생·입양일, 그날+2년] */
  function windowCheck(occasion, eventYmd, giftYmd) {
    var ev = parseYmd(eventYmd), g = parseYmd(giftYmd);
    if (ev == null || g == null) return null;
    var start = occasion === "marriage" ? addYears(ev, -LAW.windowYears) : ev;
    var end = addYears(ev, LAW.windowYears);
    var inside = g >= start && g <= end;
    return {
      start: toYmd(start), end: toYmd(end), inside: inside,
      daysOutside: inside ? 0 : (g > end ? g - end : start - g),
      side: inside ? "in" : (g > end ? "after" : "before")
    };
  }

  /* ── 세율 ─────────────────────────────────────── */
  function calcTaxOnBase(base) {
    if (base < LAW.minBase) return 0;
    for (var i = 0; i < LAW.brackets.length; i++) {
      var b = LAW.brackets[i];
      if (base <= b.upTo) return Math.floor(base * b.rate - b.less);
    }
    return 0;
  }

  function basicLimit(giver, adult) {
    if (giver === "parent") return adult ? LAW.basic.parentAdult : LAW.basic.parentMinor;
    if (giver === "in_law" || giver === "other") return LAW.basic.relative;
    return 0;
  }

  /* ── 본 계산 ──────────────────────────────────────
   * input = {
   *   giver: 'parent' | 'in_law' | 'grand' | 'other',
   *   adult: true | false,              // 받는 날 기준 만 19세 이상
   *   occasion: 'marriage' | 'birth' | 'none',
   *   eventDate: 'YYYY-MM-DD',          // 혼인신고일(예정일) · 출생신고서상 출생일 또는 입양신고일
   *   giftDate: 'YYYY-MM-DD',           // 받는 날
   *   amount: 원,                        // 이번에 받는 돈
   *   prior10y: 원,                      // 최근 10년 안에 같은 쪽(부·모는 한 사람)에서 받은 돈
   *   priorSpecialUsed: 원,              // 이미 쓴 혼인·출산 공제
   *   today: 'YYYY-MM-DD'                // 한국 날짜 (D-day 계산용)
   * }
   */
  function calcGift(input) {
    var i = input || {};
    var giver = i.giver;
    if (giver === "grand") {
      return { supported: false, reason: "grand", note: "세대를 건너뛴 증여는 세금이 30~40% 더 붙어서(§57) 이 계산기로는 정확히 안 나와요." };
    }
    if (["parent", "in_law", "other"].indexOf(giver) < 0) return { supported: false, reason: "giver" };

    var amount = Math.max(0, Math.floor(+i.amount || 0));
    var prior = Math.max(0, Math.floor(+i.prior10y || 0));
    var priorSpecial = Math.max(0, Math.floor(+i.priorSpecialUsed || 0));
    var occasion = i.occasion === "marriage" || i.occasion === "birth" ? i.occasion : "none";
    var adult = i.adult !== false;

    // §47② 같은 쪽 10년 합산 — 합계 1천만원 이상일 때만
    var aggregated = prior > 0 && (prior + amount) >= LAW.aggregateMin;
    var grossBase = aggregated ? prior + amount : amount;       // 증여세 과세가액

    // §53 기본 공제
    var bLimit = basicLimit(giver, adult);
    var basicUsedBefore = aggregated ? 0 : Math.min(bLimit, Math.max(0, prior - priorSpecial));
    var basicAvail = Math.max(0, bLimit - basicUsedBefore);

    // §53의2 혼인·출산 공제 (부모에게서 받을 때만, ③ 합계 1억)
    var win = occasion === "none" ? null : windowCheck(occasion, i.eventDate, i.giftDate);
    var specialEligible = giver === "parent" && !!(win && win.inside);
    var specialRemain = Math.max(0, LAW.special - priorSpecial);
    // 합산 시 이전 증여에 이미 적용된 혼인·출산 공제도 함께 뺀다
    var priorSpecialInBase = aggregated ? Math.min(priorSpecial, prior) : 0;

    // 공제 배분: 기간이 정해진 혼인·출산 공제를 먼저, 그다음 기본 공제
    var afterPriorSpecial = grossBase - priorSpecialInBase;
    var specialNow = specialEligible ? Math.min(specialRemain, Math.max(0, amount)) : 0;
    specialNow = Math.min(specialNow, Math.max(0, afterPriorSpecial));
    var rest = Math.max(0, afterPriorSpecial - specialNow);
    var basicNow = Math.min(basicAvail, rest);
    var base = Math.max(0, rest - basicNow);                    // 과세표준

    var r = taxFrom(base);

    // 시점 비교 — 같은 금액, 혼인·출산 공제를 받지 못할 때
    var compare = null;
    if (occasion !== "none" && giver === "parent" && specialRemain > 0) {
      var rest2 = Math.max(0, afterPriorSpecial);
      var base2 = Math.max(0, rest2 - Math.min(basicAvail, rest2));
      compare = { withSpecial: r.finalTax, withoutSpecial: taxFrom(base2).finalTax };
    }

    var deadline = reportDeadline(i.giftDate);
    var dLeft = (deadline && i.today) ? daysBetween(i.today, deadline) : null;
    var gN = parseYmd(i.giftDate);

    return {
      supported: true,
      label: "개략 추정",
      giver: giver, adult: adult, occasion: occasion, amount: amount,
      aggregated: aggregated, aggregatedNote: prior > 0 && !aggregated ? "합산 안 함" : (aggregated ? "합산" : "없음"),
      grossBase: grossBase,
      basicLimit: bLimit, basicUsedBefore: basicUsedBefore, basicAvail: basicAvail, basicNow: basicNow,
      basicLeft: Math.max(0, basicAvail - basicNow),
      specialEligible: specialEligible, specialNow: specialNow,
      specialLeft: Math.max(0, specialRemain - specialNow),
      window: win,
      taxBase: base,
      calcTax: r.calcTax, reportCredit: r.credit, finalTax: r.finalTax,
      zero: r.finalTax === 0,
      compare: compare,
      deadline: deadline, daysLeft: dLeft, overdue: dLeft != null && dLeft < 0,
      renewDate: gN == null ? null : toYmd(addYears(gN, 10)),
      priorTaxNotCredited: aggregated,    // §58 이미 낸 세금 미반영 안내
      taxablePortion: Math.max(0, amount - specialNow - basicNow)
    };
  }

  function taxFrom(base) {
    var calc = calcTaxOnBase(base);
    // §69② 산출세액 − (징수유예·공제감면 등 각 호 금액: MVP는 0) 의 3%
    var credit = Math.floor(calc * LAW.reportCredit);
    return { calcTax: calc, credit: credit, finalTax: calc - credit };
  }

  /* ── 표시용 ───────────────────────────────────── */
  function formatWon(won) {
    won = Math.max(0, Math.round(+won || 0));
    if (won === 0) return "0원";
    if (won < MAN) return won.toLocaleString("ko-KR") + "원";
    // 만원 단위 한글 병기: 1억 5,000만원 (만원 미만은 버리고 표시)
    var eok = Math.floor(won / EOK), man = Math.floor((won % EOK) / MAN);
    var s = [];
    if (eok) s.push(eok.toLocaleString("ko-KR") + "억");
    if (man) s.push(man.toLocaleString("ko-KR") + "만");
    return s.join(" ") + "원";
  }
  // 세액 표시: 만원 단위 반올림 「약 485만원」
  function formatTaxApprox(won) {
    if (!won) return "0원";
    if (won < MAN) return "약 " + won.toLocaleString("ko-KR") + "원";
    return "약 " + formatWon(Math.round(won / MAN) * MAN);
  }
  function amountBand(won) {
    if (won <= 5000 * MAN) return "~5천";
    if (won <= 15000 * MAN) return "~1.5억";
    if (won <= 5 * EOK) return "~5억";
    return "5억+";
  }
  // 10년 뒤 예시 (세전·복리, 가정 수익률) — L2: 권유 아님
  var TEN_YEAR = [
    { rate: 0, factor: 1 },
    { rate: 3, factor: 1.3439 },
    { rate: 5, factor: 1.6289 }
  ];
  function tenYear(amount) {
    return TEN_YEAR.map(function (t) { return { rate: t.rate, factor: t.factor, value: Math.round(amount * t.factor) }; });
  }

  /* ── 주민등록번호 검사 (heirwise-common.js hwHasRRN과 같은 패턴) ── */
  var RRN_RE = /\b\d{6}\s*-?\s*[1-8]\d{6}\b/;
  function hasRRN(v) { return RRN_RE.test(String(v == null ? "" : v)); }

  /* ── Y1-9 응대 유형 자동 분류 (규칙) ─────────────────
   * ctx = {
   *   giver, result (calcGift 결과 또는 null), question: 한 줄 질문,
   *   alertOnly: 문의 없이 기한 알림만, from10y: 10년 표를 보고 클릭 (기록용 — 분류에는 쓰지 않음, D1 09-22), viewed10y
   * }
   * 순서: (알림만이면 R0) → R3 → R2 → R4 → R1 — 위에서부터 먼저 맞는 것 하나
   */
  var R4_WORDS = ["운용", "집", "전세", "대출", "노후", "아이", "적금", "투자"];
  var ROUTES = {
    R0: { priority: "P3", sla: "알림 일정에 맞춰", who: "AI 초안 → 본부장 발송" },
    R1: { priority: "P3", sla: "48시간 안에", who: "AI 초안 → 본부장 검수 발송" },
    R2: { priority: "P1", sla: "2시간 안에(업무시간)", who: "본부장 직접" },
    R3: { priority: "P1", sla: "2시간 안에(업무시간)", who: "복합" },
    R4: { priority: "P2", sla: "24시간 안에", who: "본부장 직접" }
  };
  function classifyLead(ctx) {
    var c = ctx || {}, r = c.result || null, q = String(c.question || "");
    var route;
    if (c.alertOnly && !q.trim()) route = "R0";
    else if (c.giver === "grand" || (r && r.supported && (
              r.aggregated || r.taxBase > 1 * EOK || (r.overdue && r.finalTax > 0)))) route = "R3";
    else if (r && r.supported && r.daysLeft != null && r.daysLeft <= 30) route = "R2";
    else if (R4_WORDS.some(function (w) { return q.indexOf(w) >= 0; })) route = "R4";
    else route = "R1";
    var info = ROUTES[route];
    return { route: route, priority: info.priority, sla: info.sla, who: info.who };
  }

  var OCC_LABEL = { marriage: "혼인", birth: "출산", none: "없음" };
  /* 메모(태그) 한 줄 — 시트 result 칸. 금액은 구간값만
     [gift] R2·P1 | 계기:혼인 | 금액:~1.5억 | 세액:0 | 기한:D-12 | 합산:없음 | 10년표:봄 | 알림:동의 */
  function leadTag(ctx, cls) {
    var r = (ctx && ctx.result) || null;
    var t = ["[gift] " + cls.route + "·" + cls.priority];
    if (ctx.giver === "grand") {
      t.push("계기:" + (OCC_LABEL[ctx.occasion] || "없음"), "대상:조부모", "계산:범위밖");
    } else if (r && r.supported) {
      t.push("계기:" + OCC_LABEL[r.occasion]);
      t.push("금액:" + amountBand(r.amount));
      t.push("세액:" + (r.finalTax === 0 ? "0" : formatTaxApprox(r.finalTax).replace(/\s/g, "")));
      t.push("기한:" + (r.daysLeft == null ? "-" : (r.daysLeft < 0 ? "지남" : "D-" + r.daysLeft)));
      t.push("합산:" + (r.aggregated ? "있음" : "없음"));
    }
    t.push("10년표:" + (ctx.viewed10y ? "봄" : "안봄"));
    t.push("알림:" + (ctx.alert ? "동의" : "없음"));
    return t.join(" | ");
  }

  return {
    LAW: LAW, calcGift: calcGift, calcTaxOnBase: calcTaxOnBase, reportDeadline: reportDeadline,
    windowCheck: windowCheck, daysBetween: daysBetween, parseYmd: parseYmd, toYmd: toYmd, addYears: addYears,
    formatWon: formatWon, formatTaxApprox: formatTaxApprox, amountBand: amountBand, tenYear: tenYear,
    hasRRN: hasRRN, classifyLead: classifyLead, leadTag: leadTag, ROUTES: ROUTES, OCC_LABEL: OCC_LABEL
  };
});
