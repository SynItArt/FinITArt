/* 대표님 문제 16장 — 공통 스크립트 (2026-09-29)
 * - 날짜 계산: 민법 §157(초일 불산입)·§159·§160(역에 의한 계산, 해당일 없으면 그 달 말일)·§161(토요일·공휴일이면 익일)
 *   국세기본법 §5①(세법 기한: 토·일·공휴일·대체공휴일·노동절이면 다음 날) — 원문 대조 2026-09-29
 * - 공휴일: 양력 고정 공휴일만 반영. 설·추석·부처님오신날·대체공휴일·임시공휴일은 반영하지 않음(화면에 안내)
 * - 입력값은 이 브라우저 안에서만 계산. 서버로 보내지 않음.
 */
(function () {
  "use strict";
  var FIXED = ["01-01", "03-01", "05-05", "06-06", "08-15", "10-03", "10-09", "12-25"]; // 양력 고정 공휴일
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parse(s) { if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null; var p = s.split("-"); var d = new Date(+p[0], +p[1] - 1, +p[2]); return isNaN(d) ? null : d; }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function lastDay(y, m) { return new Date(y, m + 1, 0).getDate(); }
  // 민법 §160: 기산일 해당일의 전일로 만료. 초일 불산입이면 「사건일 + N개월」의 같은 날짜(없으면 그 달 말일)
  function addMonthsCivil(d, n) { var y = d.getFullYear(), m = d.getMonth() + n; var ty = y + Math.floor(m / 12), tm = ((m % 12) + 12) % 12; return new Date(ty, tm, Math.min(d.getDate(), lastDay(ty, tm))); }
  function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), lastDay(d.getFullYear(), d.getMonth())); }
  // 「○○일이 속하는 달의 말일부터 N개월」 → N개월 뒤 달의 말일
  function monthEndPlus(d, n) { var e = endOfMonth(d); var y = e.getFullYear(), m = e.getMonth() + n; var ty = y + Math.floor(m / 12), tm = ((m % 12) + 12) % 12; return new Date(ty, tm, lastDay(ty, tm)); }
  function isHoliday(d, tax) {
    var w = d.getDay(); if (w === 0 || w === 6) return true;
    var md = pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    if (FIXED.indexOf(md) >= 0) return true;
    if (tax && md === "05-01") return true; // 국세기본법 §5①3호 노동절
    return false;
  }
  function roll(d, tax) { var x = d, n = 0; while (isHoliday(x, tax) && n < 10) { x = addDays(x, 1); n++; } return { date: x, moved: n > 0 }; }
  function daysBetween(a, b) { return Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5); }
  function won(n) { if (!isFinite(n)) return "-"; return Math.round(n).toLocaleString("ko-KR") + "원"; }
  function num(v) { var n = parseFloat(String(v == null ? "" : v).replace(/[^\d.\-]/g, "")); return isFinite(n) ? n : 0; }
  function track(name, p) { try { if (window.hwTrack) window.hwTrack(name, p || {}); } catch (e) {} }
  function ics(events, filename) {
    var L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HeirWise//finitart.com//KO", "CALSCALE:GREGORIAN"];
    var stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    events.forEach(function (e, i) {
      var d = ymd(e.date).replace(/-/g, ""), n = ymd(addDays(e.date, 1)).replace(/-/g, "");
      L.push("BEGIN:VEVENT", "UID:hw-" + d + "-" + i + "@finitart.com", "DTSTAMP:" + stamp, "DTSTART;VALUE=DATE:" + d, "DTEND;VALUE=DATE:" + n,
        "SUMMARY:" + e.title.replace(/[,;]/g, " "), "DESCRIPTION:" + (e.desc || "").replace(/[,;]/g, " ").replace(/\n/g, "\\n") + "\\n적용 여부는 전문가 확인 · finitart.com/ceo/deadline.html",
        "BEGIN:VALARM", "TRIGGER:-P30D", "ACTION:DISPLAY", "DESCRIPTION:30일 전 " + e.title.replace(/[,;]/g, " "), "END:VALARM",
        "BEGIN:VALARM", "TRIGGER:-P7D", "ACTION:DISPLAY", "DESCRIPTION:7일 전 " + e.title.replace(/[,;]/g, " "), "END:VALARM", "END:VEVENT");
    });
    L.push("END:VCALENDAR");
    var blob = new Blob([L.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename || "heirwise-deadlines.ics";
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  window.HWCEO = { ymd: ymd, parse: parse, addDays: addDays, addMonthsCivil: addMonthsCivil, monthEndPlus: monthEndPlus, endOfMonth: endOfMonth, roll: roll, daysBetween: daysBetween, won: won, num: num, track: track, ics: ics, lastDay: lastDay };
  document.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest("a[data-ev]"); if (a) track(a.getAttribute("data-ev"), { page: location.pathname }); });
})();
