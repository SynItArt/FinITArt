#!/usr/bin/env node
/* lifemap-build.js — /lifemap/index.html 의 MAP 데이터에서 연령대별 정적 페이지 6장을 만든다.
 * 사용:  node tools/lifemap-build.js            → noindex 상태로 생성(시안·검수용)
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
--b20:#A998EB;--b20i:#110B28;--b20s:#2B2540;--b30:#B998EB;--b30i:#170B28;--b30s:#2E2440;--b40:#CC98EB;--b40i:#1D0B28;--b40s:#312340;
--b50:#DE98EB;--b50i:#230B28;--b50s:#342340;--b60:#EB98E7;--b60i:#280B26;--b60s:#372340;--b70:#EB98D4;--b70i:#280B20;--b70s:#372338}
@media (prefers-color-scheme:light){:root:not([data-theme="dark"]){--bg:#FBF9F4;--card:#FFFFFF;--card2:#F1EEE6;--line:#CFC9BC;--ink:#161A20;--muted:#3B4350;--sub:#4B5563;
--green:#0C5C48;--green-ink:#FFFFFF;--blue:#1D4ED8;--blue-ink:#FFFFFF;--amber:#8A5A00;--amber-ink:#FFFFFF;--focus:#1D4ED8;
--b20:#352281;--b20i:#FFFFFF;--b20s:#EDE7F9;--b30:#482281;--b30i:#FFFFFF;--b30s:#EFE7F9;--b40:#5D2281;--b40i:#FFFFFF;--b40s:#F1E7F9;
--b50:#712281;--b50i:#FFFFFF;--b50s:#F3E7F8;--b60:#81227C;--b60i:#FFFFFF;--b60s:#F5E7F5;--b70:#812266;--b70i:#FFFFFF;--b70s:#F5E7EE}}
:root[data-theme="light"]{--bg:#FBF9F4;--card:#FFFFFF;--card2:#F1EEE6;--line:#CFC9BC;--ink:#161A20;--muted:#3B4350;--sub:#4B5563;
--green:#0C5C48;--green-ink:#FFFFFF;--blue:#1D4ED8;--blue-ink:#FFFFFF;--amber:#8A5A00;--amber-ink:#FFFFFF;--focus:#1D4ED8;
--b20:#352281;--b20i:#FFFFFF;--b20s:#EDE7F9;--b30:#482281;--b30i:#FFFFFF;--b30s:#EFE7F9;--b40:#5D2281;--b40i:#FFFFFF;--b40s:#F1E7F9;
--b50:#712281;--b50i:#FFFFFF;--b50s:#F3E7F8;--b60:#81227C;--b60i:#FFFFFF;--b60s:#F5E7F5;--b70:#812266;--b70i:#FFFFFF;--b70s:#F5E7EE}
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
.who{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}.tag{font-size:15px;font-weight:700;border-radius:999px;padding:4px 12px}
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

function card(c, band) {
  const who = c.who.map(w => `<span class="tag ${LABEL[w[0]]}">${esc(w[1])}</span>`).join("");
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

for (const b of BANDS) {
  const dir = path.join(ROOT, "lifemap", String(b));
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, "index.html");
  fs.writeFileSync(out, page(b), "utf8");
  const text = page(b).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  console.log(`${path.relative(ROOT, out)}  정적 본문 ${text.length}자  카드 ${MAP[b].cards.length}장  ${PUBLISH ? "공개(index)" : "noindex"}`);
}
console.log(`완료: ${BANDS.length}페이지 · 카툰 ${TOTAL}편 · 데이터 원본 ${path.relative(ROOT, SRC)}`);
