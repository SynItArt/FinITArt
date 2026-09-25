#!/usr/bin/env node
/* lifemap-build.js — /lifemap/index.html 의 MAP 데이터에서 연령대별 정적 페이지 6장을 만든다.
 * 사용:  node tools/lifemap-build.js            → noindex 상태로 생성(시안·검수용)
 *        node tools/lifemap-build.js --home     → 홈(index.html) 첫 화면 블록만 갱신 (2026-09-26)
 *        node tools/lifemap-build.js --publish  → noindex 제거(공개 승인 뒤에만)
 * 출력:  lifemap/20/index.html … lifemap/70/index.html
 * 원칙:  내용은 lifemap/index.html 의 MAP 하나만 고친다(두 번 관리 금지). 이 스크립트는 읽기만 하고 MAP을 수정하지 않는다.
 *        지식(변곡점·확보할 재정·조문·체크리스트)은 정적 HTML로, 계산·숫자만 JS로. (Intent 4-4 B · v1.9 G1)
 */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "lifemap", "index.html");
const PUBLISH = process.argv.includes("--publish");
const BASE = "https://finitart.com";

const html = fs.readFileSync(SRC, "utf8");
const m = html.match(/var MAP = (\{[\s\S]*?\n\});/);
if (!m) { console.error("MAP 데이터를 찾지 못했습니다:", SRC); process.exit(1); }
const MAP = vm.runInNewContext("(" + m[1] + ")");
const mm = html.match(/var MORE = (\{[\s\S]*?\n\});/);
const MORE = mm ? vm.runInNewContext("(" + mm[1] + ")") : {};
const basis = (html.match(/<p class="basis">([\s\S]*?)<\/p>/) || [,""])[1].trim();
const BANDS = [20, 30, 40, 50, 60, 70];
const LABEL = { hw: "hw", intake: "pro", pro: "pro" };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = s => String(s).replace(/<[^>]+>/g, "");
let no = 0; BANDS.forEach(b => MAP[b].cards.forEach(c => { c.no = ++no; }));
const TOTAL = no;

const CSS = `
:root{--bg:#13161C;--card:#1C2129;--card2:#232A34;--line:#3A4350;--ink:#F3F0EA;--muted:#C9CFD9;--sub:#B6BDCA;
--green:#54CFA8;--green-ink:#0F3B30;--blue:#93C5FD;--blue-ink:#0F2A5C;--amber:#FFC64D;--amber-ink:#4A3200;--focus:#FFC64D;
--b20:var(--band-20);--b20i:var(--band-20-ink);--b20s:var(--band-20-soft);--b30:var(--band-30);--b30i:var(--band-30-ink);--b30s:var(--band-30-soft);--b40:var(--band-40);--b40i:var(--band-40-ink);--b40s:var(--band-40-soft);
--b50:var(--band-50);--b50i:var(--band-50-ink);--b50s:var(--band-50-soft);--b60:var(--band-60);--b60i:var(--band-60-ink);--b60s:var(--band-60-soft);--b70:var(--band-70);--b70i:var(--band-70-ink);--b70s:var(--band-70-soft)}
@media (prefers-color-scheme:light){:root:not([data-theme="dark"]){--bg:#FBF9F4;--card:#FFFFFF;--card2:#F1EEE6;--line:#CFC9BC;--ink:#161A20;--muted:#3B4350;--sub:#4B5563;
--green:#0C5C48;--green-ink:#FFFFFF;--blue:#1D4ED8;--blue-ink:#FFFFFF;--amber:#8A5A00;--amber-ink:#FFFFFF;--focus:#1D4ED8;
--b20:var(--band-20);--b20i:var(--band-20-ink);--b20s:var(--band-20-soft);--b30:var(--band-30);--b30i:var(--band-30-ink);--b30s:var(--band-30-soft);--b40:var(--band-40);--b40i:var(--band-40-ink);--b40s:var(--band-40-soft);
--b50:var(--band-50);--b50i:var(--band-50-ink);--b50s:var(--band-50-soft);--b60:var(--band-60);--b60i:var(--band-60-ink);--b60s:var(--band-60-soft);--b70:var(--band-70);--b70i:var(--band-70-ink);--b70s:var(--band-70-soft)}}
:root[data-theme="light"]{--bg:#FBF9F4;--card:#FFFFFF;--card2:#F1EEE6;--line:#CFC9BC;--ink:#161A20;--muted:#3B4350;--sub:#4B5563;
--green:#0C5C48;--green-ink:#FFFFFF;--blue:#1D4ED8;--blue-ink:#FFFFFF;--amber:#8A5A00;--amber-ink:#FFFFFF;--focus:#1D4ED8;
--b20:var(--band-20);--b20i:var(--band-20-ink);--b20s:var(--band-20-soft);--b30:var(--band-30);--b30i:var(--band-30-ink);--b30s:var(--band-30-soft);--b40:var(--band-40);--b40i:var(--band-40-ink);--b40s:var(--band-40-soft);
--b50:var(--band-50);--b50i:var(--band-50-ink);--b50s:var(--band-50-soft);--b60:var(--band-60);--b60i:var(--band-60-ink);--b60s:var(--band-60-soft);--b70:var(--band-70);--b70i:var(--band-70-ink);--b70s:var(--band-70-soft)}
body[data-band="20"]{--stripe:var(--b20);--stripe-ink:var(--b20i);--stripe-soft:var(--b20s)}body[data-band="30"]{--stripe:var(--b30);--stripe-ink:var(--b30i);--stripe-soft:var(--b30s)}
body[data-band="40"]{--stripe:var(--b40);--stripe-ink:var(--b40i);--stripe-soft:var(--b40s)}body[data-band="50"]{--stripe:var(--b50);--stripe-ink:var(--b50i);--stripe-soft:var(--b50s)}
body[data-band="60"]{--stripe:var(--b60);--stripe-ink:var(--b60i);--stripe-soft:var(--b60s)}body[data-band="70"]{--stripe:var(--b70);--stripe-ink:var(--b70i);--stripe-soft:var(--b70s)}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.7 "Pretendard","Malgun Gothic","Apple SD Gothic Neo",sans-serif}
a{color:inherit}:focus-visible{outline:3px solid var(--focus);outline-offset:3px}
.wrap{max-width:1040px;margin:0 auto;padding:0 16px}
header.top{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid var(--line)}
header.top .brand{font-weight:800;font-size:20px;text-decoration:none}header.top .brand sup{font-size:12px;margin-left:2px}
header.top button.tel{background:none;color:inherit;cursor:pointer;font:inherit;font-weight:700;border:2px solid var(--line);border-radius:999px;padding:8px 14px;font-size:16px}header.top a.tel{font-weight:700;text-decoration:none;border:2px solid var(--line);border-radius:999px;padding:8px 14px;font-size:16px}
nav.crumb{font-size:15px;color:var(--sub);margin:18px 0 0}nav.crumb a{text-decoration:none}
h1{font-size:clamp(26px,4.6vw,38px);line-height:1.3;margin:14px 0 6px}
.axis{display:inline-block;background:var(--stripe);color:var(--stripe-ink);font-weight:800;font-size:15px;border-radius:999px;padding:4px 14px;margin:0 0 16px}
.lead{font-size:19px;color:var(--muted);margin:0 0 18px;max-width:760px}
.basis{font-size:15px;color:var(--sub);border-left:4px solid var(--line);padding-left:12px;margin:0 0 26px}
nav.bands{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 30px}
nav.bands a{min-height:44px;display:inline-flex;align-items:center;padding:0 16px;border:2px solid var(--line);border-radius:10px;font-weight:700;text-decoration:none;font-size:16px}
nav.bands a[aria-current]{background:var(--stripe);color:var(--stripe-ink);border-color:var(--stripe)}
article.card{background:var(--card);border:1.5px solid var(--line);border-left:8px solid var(--stripe);border-radius:16px;padding:22px 22px 24px;margin:0 0 22px}
article.card h2{font-size:clamp(20px,3.4vw,25px);line-height:1.35;margin:0 0 10px}
figure.toon{margin:0 0 16px}figure.toon img{display:block;width:100%;height:auto;aspect-ratio:1200/825;object-fit:cover;border-radius:12px;background:var(--card2)}
figure.toon figcaption{font-size:15.5px;color:var(--muted);margin-top:8px;line-height:1.6}
.toon-none{display:flex;align-items:center;justify-content:center;aspect-ratio:1200/825;background:var(--stripe-soft);color:var(--stripe);border:2px dashed var(--stripe);border-radius:12px;font-weight:800;font-size:18px;margin:0 0 16px}
.money{font-size:17px;margin:0 0 12px}.money strong{color:var(--stripe)}
.who{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}.more{flex-basis:100%;margin-top:6px}.more summary{cursor:pointer;font-weight:800;font-size:16px;min-height:44px;display:flex;align-items:center}.more .lbl{font-size:14px;margin:8px 0 6px;opacity:.9}.more .row{display:flex;flex-wrap:wrap;gap:8px}.tag.life{background:transparent;color:inherit;border:2px solid currentColor}.tag{font-size:15px;font-weight:800;border-radius:999px;padding:6px 12px;min-height:40px;display:inline-flex;align-items:center;text-decoration:none}a.tag:hover{filter:brightness(1.08)}a.tag:focus-visible{outline:3px solid var(--focus);outline-offset:3px}
.tag.hw{background:var(--green);color:var(--green-ink)}.tag.pro{background:var(--blue);color:var(--blue-ink)}
h3{font-size:18px;margin:14px 0 6px}ul.check{margin:0 0 12px;padding-left:22px}ul.check li{margin:0 0 4px}
.calc{font-size:16px;margin:0 0 14px}.cta{display:flex;flex-wrap:wrap;gap:10px}
.cta a{min-height:48px;display:inline-flex;align-items:center;padding:0 20px;border-radius:12px;font-weight:800;text-decoration:none;font-size:17px}
.cta a.ask{background:var(--stripe);color:var(--stripe-ink)}.cta a.tel{border:2px solid var(--line)}
section.who-am-i,section.next{margin:36px 0 0;padding-top:24px;border-top:1px solid var(--line)}
section.who-am-i h2,section.next h2{font-size:22px;margin:0 0 10px}
footer{margin:40px 0 30px;padding-top:20px;border-top:1px solid var(--line);font-size:14.5px;color:var(--sub)}footer p{margin:0 0 6px}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`;

var PRO_MAP={"세무사":["B","세무사"],"감정평가사":["B","감정평가사"],"회계사":["B","공인회계사"],"공인회계사":["B","공인회계사"],"변호사":["A","변호사(가사·상속)"],"법무사":["A","법무사"],"공인중개사":["C","공인중개사"],"노무사":["E","공인노무사"]};
function whoChips(c, band){ var enc=encodeURIComponent; return c.who.map(function(w){ var kind=w[0], txt=w[1]; if(kind==="hw"){ return '<a class="tag hw" href="/consult.html?src=lifemap&age='+band+'&ev='+enc(c.ev)+'">'+esc(txt.split(" — ")[0])+' — 직접 응답 ›</a>'; } if(kind==="intake"){ return '<a class="tag pro" href="'+esc(c.ask)+'">'+esc(txt)+' ›</a>'; } var parts=txt.split(" — "), suffix=parts[1]?(" — "+parts[1]):""; return parts[0].split("·").map(function(n){ n=n.trim(); var m=PRO_MAP[n]; var href=m?"/network/connect.html?src=lifemap&age="+band+"&ev="+enc(c.ev)+"&group="+m[0]+"&field="+enc(m[1]):c.ask; return '<a class="tag pro" href="'+esc(href)+'">'+esc(n+suffix)+' ›</a>'; }).join(""); }).join(""); }
var LIFE_G={N:1,O:1,P:1,Q:1,R:1,S:1};
function moreChips(c, band){ var list=MORE[c.ev]||[]; var enc=encodeURIComponent; var have={}; c.who.forEach(function(w){ w[1].split(" — ")[0].split("·").forEach(function(n){ var m=PRO_MAP[n.trim()]; if(m) have[m[1]]=1; }); }); var pro=[], life=[]; list.forEach(function(x){ if(have[x[1]]) return; var q="src=lifemap&age="+band+"&ev="+enc(c.ev)+"&group="+x[0]+"&field="+enc(x[1]); if(LIFE_G[x[0]]) life.push('<a class="tag life" href="/network/index.html?'+esc(q)+'">'+esc(x[1])+' ›</a>'); else pro.push('<a class="tag pro" href="/network/connect.html?'+esc(q)+'">'+esc(x[1])+' ›</a>'); }); if(!pro.length&&!life.length) return ""; return '<details class="more"><summary>이때 만날 수 있는 사람 더 보기 ('+(pro.length+life.length)+')</summary>'+(pro.length?'<p class="lbl">전문가 — 누르면 연결 요청 폼이 이 분야로 열립니다</p><div class="row">'+pro.join("")+'</div>':"")+(life.length?'<p class="lbl">생활 파트너 — 모시는 중인 곳을 분야 지도에서 봅니다. 연락처를 넘기지 않습니다</p><div class="row">'+life.join("")+'</div>':"")+'</details>'; }
function card(c, band) {
  const who = whoChips(c, band) + moreChips(c, band);
  const checks = c.check.map(x => `<li>${esc(x)}</li>`).join("");
  const toon = c.img
    ? `<figure class="toon"><img src="${esc(c.img)}" alt="${esc(c.alt || c.h + " — 4컷 카툰 1컷")}" loading="lazy" width="1200" height="825" onerror="this.parentNode.outerHTML='<div class=&quot;toon-none&quot;>카툰 제작 중 · ${c.no} / ${TOTAL}편</div>'"><figcaption>${esc(c.alt || "")}</figcaption></figure>`
    : `<div class="toon-none">카툰 제작 중 · ${c.no} / ${TOTAL}편</div>`;
  const lines = Array.isArray(c.lines) && c.lines.length
    ? `<details><summary>4컷 글로 읽기</summary><ol>${c.lines.map(x => `<li>${esc(x)}</li>`).join("")}</ol></details>` : "";
  return `<article class="card" id="${esc(c.ev)}">
${toon}${lines}
<h2>${esc(c.h)}</h2>
<p class="money"><strong>지금 확보할 재정</strong> · ${esc(c.money)}</p>
<div class="who">${who}</div>
<h3>이번 달에 할 세 가지</h3>
<ul class="check">${checks}</ul>
${c.calc ? `<p class="calc">${c.calc}</p>` : ""}
<div class="cta"><a class="ask" href="${esc(c.ask)}" onclick="if(window.gtag)gtag('event','lifemap_ask',{age:${band},ev:'${esc(c.ev)}'})">내 경우 물어보기</a><a class="tel" href="tel:01020885383">전화로 먼저 묻기</a></div>
</article>`;
}

function page(band) {
  const d = MAP[band];
  const url = `${BASE}/lifemap/${band}/`;
  const title = `${d.title} — 지금 준비할 돈, 만날 사람 | HeirWise`;
  const desc = `${d.title}: ${d.cards.map(c => c.h.split(" — ")[0]).join(" · ")}. 그때 확보할 재정과 지금 물어볼 사람을 정리했습니다. ${d.axis}.`;
  const nav = BANDS.map(b => `<a href="/lifemap/${b}/"${b === band ? ' aria-current="page"' : ""}>${b === 70 ? "70대 이상" : b + "대"}</a>`).join("");
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": url + "#page", "url": url, "name": title, "description": desc, "inLanguage": "ko",
        "isPartOf": { "@id": BASE + "/#website" }, "author": { "@id": BASE + "/#person" }, "publisher": { "@id": BASE + "/#person" },
        "about": { "@type": "Thing", "name": d.title } },
      { "@type": "BreadcrumbList", "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "HeirWise", "item": BASE + "/" },
        { "@type": "ListItem", "position": 2, "name": "인생 변곡점 지도", "item": BASE + "/lifemap/" },
        { "@type": "ListItem", "position": 3, "name": d.title, "item": url } ] },
      { "@type": "ItemList", "name": d.title, "itemListOrder": "https://schema.org/ItemListOrderAscending",
        "itemListElement": d.cards.map((c, i) => ({ "@type": "ListItem", "position": i + 1, "name": c.h, "description": strip(c.money), "url": url + "#" + c.ev })) }
    ]
  };
  const robots = PUBLISH ? "" : `<meta name="robots" content="noindex">  <!-- 시안 단계. 공개 시 node tools/lifemap-build.js --publish 로 재생성 -->\n`;
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script>try{var t=localStorage.getItem("hw-theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t);}catch(e){}</script>
<link rel="stylesheet" href="/hw-bands.css">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${robots}<link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:site_name" content="HeirWise">
<link rel="icon" type="image/svg+xml" href="/img/brand/heirwise-symbol.svg">
<script src="/heirwise-common.js" defer></script>
<script type="application/ld+json">
${JSON.stringify(ld, null, 1)}
</script>
<style>${CSS}</style>
</head>
<body data-band="${band}">
<div class="wrap">
  <header class="top">
    <a class="brand" href="/">HeirWise<sup>™</sup></a>
    <span style="display:flex;gap:8px;align-items:center"><button class="tel" id="themeBtn" type="button" aria-label="밝은 화면과 어두운 화면 전환">◐</button><a class="tel" href="tel:01020885383">전화로 먼저 묻기</a></span>
  </header>
  <nav class="crumb" aria-label="현재 위치"><a href="/">홈</a> › <a href="/lifemap/">인생 변곡점 지도</a> › ${esc(d.title)}</nav>
  <h1>${esc(d.title)}<br>지금 준비할 돈, 만날 사람</h1>
  <span class="axis">${esc(d.axis)}</span>
  <p class="lead">이 나이대에 돈이 크게 움직이는 순간 ${d.cards.length}가지와, 그때 미리 확보해 두어야 할 재정, 지금 물어볼 사람을 정리했습니다. 나이 슬라이더로 다른 시기를 보려면 <a href="/lifemap/">지도 전체</a>로 가세요.</p>
  <p class="basis">${basis}</p>
  <nav class="bands" aria-label="다른 나이대">${nav}</nav>
${d.cards.map(c => card(c, band)).join("\n")}
  <section class="who-am-i">
    <h2>답하는 사람</h2>
    <p><strong>신대식</strong> — AFPK<sup>®</sup> 자격인증자 · 생명/손해/제3보험설계사 · 변액보험판매관리사 · 투자권유대행인(펀드·신탁·부동산) · 퇴직연금제도모집인 · 산업안전기사 · 소방설비기사(기계·전기) · 부동산 경공매 권리분석사 · 어선중개업</p>
    <p>초록 표시 분야는 제가 직접 응답합니다. 파란 표시 분야는 제가 상황을 먼저 정리한 뒤 해당 전문가에게 연결하며, 법률 판단과 세액 확정은 전문가의 일입니다. 연결에 대가는 없습니다.</p>
    <p>카툰의 인물은 AI로 만든 이미지이며 이야기 속 가족입니다. 실제 상담 사례가 아닙니다.</p>
  </section>
  <section class="next">
    <h2>다른 나이대 보기</h2>
    <nav class="bands" aria-label="다른 나이대 (하단)">${nav}</nav>
  </section>
  <footer>
    <p>HeirWise™ · 시니타르(SynItArt) 대표 신대식 · itart@finitart.com · 010-2088-5383 · 경기 안산시 단원구 정왕천동로30번길 2, 2층</p>
    <p>이 페이지의 계산·안내는 개략 추정이며 세무·법률 자문이 아닙니다. 금융상품 안내는 별도 동의 후 소속 금융회사의 절차에 따릅니다.</p>
    <p><a href="/privacy.html">개인정보처리방침</a> · <a href="/network/principles.html">협업 네트워크 운영 원칙</a></p>
  </footer>
</div>
<script>document.getElementById("themeBtn").addEventListener("click",function(){var r=document.documentElement,now=r.getAttribute("data-theme")||(window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"),next=now==="dark"?"light":"dark";r.setAttribute("data-theme",next);try{localStorage.setItem("hw-theme",next);}catch(e){}});</script>
</body>
</html>
`;
}


/* ── 홈 첫 화면 블록 (2026-09-26) — index.html 의 LIFEMAP-HOME 표시 사이만 바꾼다 ── */
function homeBlock() {
  const lab = b => (b === 70 ? "70대 이상" : b + "대");
  const tabs = BANDS.map(b => `<button type="button" role="tab" id="lmt-${b}" aria-controls="lmp-${b}" data-band="${b}" aria-selected="false">${lab(b)}</button>`).join("");
  const panels = BANDS.map(b => {
    const d = MAP[b];
    const cards = d.cards.map(c => `<li><a class="lm-c" href="/lifemap/${b}/#${esc(c.ev)}">` +
      (c.img ? `<img src="${esc(c.img)}" alt="${esc(c.alt || c.h + " — 4컷 카툰 1컷")}" loading="lazy" width="1200" height="825">` : `<span class="lm-none">카툰 제작 중</span>`) +
      `<span class="lm-t">${esc(c.h)}</span><span class="lm-m"><b>지금 확보할 재정</b> · ${esc(strip(c.money))}</span><span class="lm-go">자세히 보기 ›</span></a></li>`).join("");
    return `<div class="lm-p" id="lmp-${b}" role="tabpanel" aria-labelledby="lmt-${b}" data-band="${b}">
  <h2 class="lm-pt">${esc(d.title)} <span class="hw-band-chip" data-band="${b}">${esc(d.axis)}</span></h2>
  <ul class="lm-cards">${cards}</ul>
  <p class="lm-all"><a href="/lifemap/${b}/">${lab(b)} 변곡점 전체 보기 →</a></p>
</div>`;
  }).join("\n");
  return `<style>
.lm-home{padding:44px 0 36px;border-bottom:1px solid var(--line)}
.lm-home .lm-eye{display:inline-block;background:var(--violet);color:var(--violet-ink);font-weight:800;font-size:15px;border-radius:999px;padding:4px 14px;margin:0 0 14px}
.lm-home h1{margin:0 0 12px;max-width:none}
.lm-home .lm-lede{font-size:clamp(1.05rem,2vw,1.2rem);color:var(--ink-2);max-width:60ch;margin:0 0 22px;line-height:1.8}
.lm-q{font-weight:800;font-size:18px;margin:0 0 10px}
.lm-tabs{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin:0 0 22px}
.lm-tabs button{min-height:52px;border-radius:12px;border:2px solid var(--line-strong);background:var(--surface);color:var(--ink);font:inherit;font-weight:800;font-size:17px;cursor:pointer}
.lm-tabs button[aria-selected=true]{background:var(--band);color:var(--band-ink);border-color:var(--band)}
.lm-tabs button:focus-visible,.lm-c:focus-visible{outline:3px solid var(--violet);outline-offset:3px}
@media(max-width:640px){.lm-tabs{grid-template-columns:repeat(3,1fr)}}
.lm-pt{font-size:clamp(20px,3vw,24px);margin:0 0 14px;display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.lm-cards{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.lm-c{display:flex;flex-direction:column;height:100%;background:var(--surface);border:1.5px solid var(--line);border-top:6px solid var(--band);border-radius:16px;padding:10px 10px 16px;text-decoration:none;color:var(--ink)}
.lm-c:hover{border-color:var(--band)}
.lm-c img,.lm-none{display:block;width:100%;height:auto;aspect-ratio:1200/825;object-fit:cover;border-radius:10px;background:var(--surface-2)}
.lm-none{display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--ink-2)}
.lm-t{font-size:19px;font-weight:800;line-height:1.4;margin:12px 4px 6px}
.lm-m{font-size:16px;line-height:1.6;color:var(--ink-2);margin:0 4px;flex:1}
.lm-m b{color:var(--ink)}
.lm-go{font-weight:800;margin:10px 4px 0;color:var(--ink)}
.lm-all{margin:14px 0 0;font-size:17px;font-weight:800}
.lm-all a{color:var(--ink)}
.lm-more{margin:22px 0 0;display:flex;flex-wrap:wrap;gap:10px}
.lm-more a{min-height:48px;display:inline-flex;align-items:center;padding:0 20px;border-radius:12px;font-weight:800;text-decoration:none;border:2px solid var(--line-strong);color:var(--ink)}
.lm-more a.pri{background:var(--violet);color:var(--violet-ink);border-color:var(--violet)}
html.lm-js .lm-p{display:none}html.lm-js .lm-p.on{display:block}
html:not(.lm-js) .lm-p{margin:0 0 30px}
</style>
<section id="lifemap-home" class="lm-home" aria-labelledby="lmhH">
 <div class="wrap">
  <span class="lm-eye">인생 변곡점 지도</span>
  <h1 id="lmhH">지금 내 나이에 준비할 돈, 만날 사람</h1>
  <p class="lm-lede">살면서 돈이 크게 움직이는 순간은 정해져 있습니다. 나이를 고르면 그 시기의 변곡점 3가지와, 그때 미리 확보해 둘 재정, 지금 물어볼 사람을 보여 드립니다.</p>
  <p class="lm-q" id="lmQ">나는 지금</p>
  <div class="lm-tabs" role="tablist" aria-labelledby="lmQ">${tabs}</div>
${panels}
  <p class="lm-more"><a class="pri" href="/lifemap/">나이 슬라이더로 지도 전체 보기 →</a><a href="#deadline">상속이 이미 시작됐다면 — 기한부터</a></p>
 </div>
</section>
<script>
(function(){
  var root=document.documentElement; root.classList.add("lm-js");
  var sec=document.getElementById("lifemap-home"), tabs=[].slice.call(sec.querySelectorAll('[role=tab]'));
  function pick(b, user){
    tabs.forEach(function(t){var on=t.getAttribute("data-band")===String(b);t.setAttribute("aria-selected",String(on));t.tabIndex=on?0:-1;});
    [].forEach.call(sec.querySelectorAll(".lm-p"),function(p){p.classList.toggle("on",p.getAttribute("data-band")===String(b));});
    if(user){ try{localStorage.setItem("hw-lm-band",String(b));}catch(e){} sec.setAttribute("data-lifemap-band",String(b));
      if(window.hwTrack) window.hwTrack("lifemap_home_band",{band:String(b)}); }
  }
  tabs.forEach(function(t,i){
    t.addEventListener("click",function(){pick(t.getAttribute("data-band"),true);});
    t.addEventListener("keydown",function(e){var k=e.key,j=k==="ArrowRight"?i+1:k==="ArrowLeft"?i-1:-9;if(j===-9)return;e.preventDefault();var n=tabs[(j+tabs.length)%tabs.length];n.focus();n.click();});
  });
  var q=Number(new URLSearchParams(location.search).get("age")), saved=null;
  try{saved=localStorage.getItem("hw-lm-band");}catch(e){}
  var start=(q>=20&&q<=80)?(q>=70?70:Math.floor(q/10)*10):(saved&&/^[2-7]0$/.test(saved)?saved:40);
  pick(start,false);
})();
</script>`;
}
if (process.argv.includes("--home")) {
  const IDX = path.join(ROOT, "index.html");
  const src = fs.readFileSync(IDX, "utf8");
  const re = /(<!-- LIFEMAP-HOME:START[^>]*-->)[\s\S]*?(<!-- LIFEMAP-HOME:END -->)/;
  if (!re.test(src)) { console.error("index.html 에 LIFEMAP-HOME 표시가 없습니다"); process.exit(1); }
  fs.writeFileSync(IDX, src.replace(re, (m, a, b) => a + "\n" + homeBlock() + "\n" + b), "utf8");
  console.log(`홈 블록 갱신: 나이대 ${BANDS.length} · 카드 ${TOTAL}장 → index.html`);
  process.exit(0);
}

for (const b of BANDS) {
  const dir = path.join(ROOT, "lifemap", String(b));
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, "index.html");
  fs.writeFileSync(out, page(b), "utf8");
  const text = page(b).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  console.log(`${path.relative(ROOT, out)}  정적 본문 ${text.length}자  카드 ${MAP[b].cards.length}장  ${PUBLISH ? "공개(index)" : "noindex"}`);
}
console.log(`완료: ${BANDS.length}페이지 · 카툰 ${TOTAL}편 · 데이터 원본 ${path.relative(ROOT, SRC)}`);
