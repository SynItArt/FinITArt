/* ============================================================
 * HeirWise 시리즈 공통 데이터 — series-data.js  v1.0
 * 보안등급: 공유 가능
 * ------------------------------------------------------------
 * 역할:
 *  1) 글 목록·상호링크·CTA를 한 곳에서 관리 (글 추가 = 여기 한 줄)
 *  2) 법령 기준일·핵심 수치를 한 곳에서 관리
 *     → 개정 시 이 파일만 수정하면 전체 글에 동시 반영
 *  3) 각 글의 <div class="hw-series"></div> 를 자동 렌더링
 *  4) 본문의 <span data-law="KEY"></span> 를 자동 치환
 *
 * 사용법 (각 글 하단):
 *   <div class="hw-series" data-self="renunciation-3months"></div>
 *   <script src="/blog/series-data.js"></script>
 * ============================================================ */

(function () {
  "use strict";

  /* ---------- ① 법령 기준 (개정 시 여기만 수정) ---------- */
  var HW_LAW = {
    baseline: "상증세법 법률 제21065호(2026.1.2.) · 민법 2026.3.17. 시행 기준",
    "민법1019-1":   { text: "안 날부터 3개월",            ref: "민법 제1019조 제1항" },
    "민법1019-3":   { text: "초과사실을 안 날부터 3개월",  ref: "민법 제1019조 제3항 (특별한정승인)" },
    "민법1019-4":   { text: "성년이 된 후 안 날부터 3개월", ref: "민법 제1019조 제4항 (2022.12.13. 신설)" },
    "상증법67":     { text: "사망한 달의 말일부터 6개월",   ref: "상증세법 제67조" },
    "상증법53-2":   { text: "1억 원 (혼인·출산 통합 한도)", ref: "상증세법 제53조의2 (2024.1.1. 시행)" },
    "상증법53":     { text: "직계존속→성년 자녀 5천만 원(10년)", ref: "상증세법 제53조" },
    "국기법47-2":   { text: "무신고가산세 20% (부정 40%)",  ref: "국세기본법 제47조의2" },
    "국기법47-4":   { text: "납부지연 1일 0.022%",         ref: "국세기본법 제47조의4" },
    "상증법69":     { text: "신고세액공제 3%",             ref: "상증세법 제69조" }
  };

  /* ---------- ② 글 목록 (새 글 = 객체 1개 추가) ---------- */
  var HW_SERIES = [
    {
      slug: "gift-marriage-deduction",
      no: 3,
      title: "결혼·출산하면 1억 더 — 혼인·출산 증여재산 공제 총정리",
      url: "/blog/gift-marriage-deduction.html",
      next: "renunciation-3months",
      related: ["inheritance-tax-6months", "after-death-checklist"],
      cta: { label: "증여 진단 바로가기", url: "/gift/?src=blog-gift" }
    },
    {
      slug: "renunciation-3months",
      no: 1,
      title: "상속포기, 3개월 지나면 끝입니다 — 기한 계산법과 예외",
      url: "/blog/renunciation-3months.html",
      next: "inheritance-tax-6months",
      related: ["inheritance-tax-6months", "after-death-checklist"],
      cta: { label: "상속채무 진단 바로가기", url: "/inheritdebt.html?src=blog-renounce" }
    },
    {
      slug: "inheritance-tax-6months",
      no: 2,
      title: "상속세 신고는 6개월 — 늦으면 가산세가 이렇게 붙습니다",
      url: "/blog/inheritance-tax-6months.html",
      next: "after-death-checklist",
      related: ["renunciation-3months", "after-death-checklist"],
      cta: { label: "상속세 계산기 바로가기", url: "/calculator.html?src=blog-tax6m" }
    },
    {
      slug: "after-death-checklist",
      no: 4,
      title: "부모님 돌아가신 직후 해야 할 일 7가지 (기한 순서대로)",
      url: "/blog/after-death-checklist.html",
      next: null, /* 허브 글: 다음 글 대신 진단 입구로 */
      related: ["renunciation-3months", "inheritance-tax-6months", "gift-marriage-deduction"],
      cta: { label: "인생 변곡점 지도 바로가기", url: "/lifemap/?src=blog-checklist" }
    }
    /* @@SERIES-END@@ 자동 발행 스크립트(_automation/blog_publish.py)가 이 줄 앞에 글을 추가합니다 */
  ];

  function bySlug(slug) {
    for (var i = 0; i < HW_SERIES.length; i++)
      if (HW_SERIES[i].slug === slug) return HW_SERIES[i];
    return null;
  }

  /* ---------- ③ 상호링크 블록 렌더링 ---------- */
  function renderSeries() {
    var boxes = document.querySelectorAll(".hw-series");
    for (var b = 0; b < boxes.length; b++) {
      var box = boxes[b];
      var self = bySlug(box.getAttribute("data-self"));
      if (!self) continue;

      var html = '<div class="hw-series-inner">';
      html += '<p class="hw-series-head">함께 읽으면 좋은 글</p><ul class="hw-series-list">';
      for (var r = 0; r < self.related.length; r++) {
        var rel = bySlug(self.related[r]);
        if (rel) html += '<li><a href="' + rel.url + '?src=series-' + self.slug + '">' + rel.title + "</a></li>";
      }
      html += "</ul>";
      if (self.next) {
        var nx = bySlug(self.next);
        if (nx) html += '<p class="hw-series-next">다음 글 → <a href="' + nx.url + '?src=next-' + self.slug + '">' + nx.title + "</a></p>";
      }
      html += '<p class="hw-series-cta"><a class="hw-cta-btn" href="' + self.cta.url + '">' + self.cta.label + "</a><br><small>연락처 입력 없이 결과까지 확인됩니다</small></p>";
      html += '<p class="hw-series-all"><a href="/blog/?src=series-' + self.slug + '">기한 가이드 전체 보기 →</a></p>';
      html += '<p class="hw-series-law"><small>' + HW_LAW.baseline + " · 정확한 세액은 세무전문가, 법률 판단은 변호사 상담이 필요합니다.</small></p>";
      html += "</div>";
      box.innerHTML = html;
    }
  }

  /* ---------- ④ 본문 법령 수치 자동 치환 ---------- */
  function renderLawSpans() {
    var spans = document.querySelectorAll("[data-law]");
    for (var s = 0; s < spans.length; s++) {
      var key = spans[s].getAttribute("data-law");
      if (HW_LAW[key]) {
        spans[s].textContent = HW_LAW[key].text;
        spans[s].setAttribute("title", HW_LAW[key].ref);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { renderSeries(); renderLawSpans(); });
  } else { renderSeries(); renderLawSpans(); }

  /* 외부(계측 스크립트 등)에서 참조할 수 있게 공개 */
  window.HW_LAW = HW_LAW;
  window.HW_SERIES = HW_SERIES;
})();
