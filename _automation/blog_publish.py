#!/usr/bin/env python3
"""
HeirWise 블로그 발행 도우미 — blog_publish.py  (보안등급: 공유 가능)

새 글 HTML(blog/<slug>.html)을 만든 뒤 실행하면, 사람이 손대던 연결 작업을 한 번에 처리한다.
  1) blog/series-data.js  — 시리즈 목록에 글 추가(상호링크·다음 글·CTA 자동 렌더링)
  2) sitemap.xml          — URL 추가 (lastmod=오늘)
  3) blog/index.html      — 기한 가이드 전체 목록 페이지 재생성(정적 링크 → 검색엔진 발견용)
  4) _automation/blog-plan.json — status 갱신

사용법
  python3 _automation/blog_publish.py <slug> [<slug> ...]          # 검토 브랜치용: status=review
  python3 _automation/blog_publish.py --final <slug> [<slug> ...]  # 승인 후 main: status=published
  python3 _automation/blog_publish.py --check                      # 연결 상태 점검만

같은 slug를 두 번 실행해도 중복 추가하지 않는다(멱등).
"""
import datetime as dt
import html
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAN = os.path.join(ROOT, "_automation", "blog-plan.json")
SERIES = os.path.join(ROOT, "blog", "series-data.js")
SITEMAP = os.path.join(ROOT, "sitemap.xml")
INDEX = os.path.join(ROOT, "blog", "index.html")
MARK = "/* @@SERIES-END@@"
CLUSTER_ORDER = ["허브", "기한", "세금", "증여", "분할", "준비"]
CLUSTER_NAME = {
    "허브": "처음 읽을 글", "기한": "놓치면 안 되는 기한", "세금": "상속세·세금",
    "증여": "증여 — 받기 전에 세금부터", "분할": "가족 간 나누기", "준비": "미리 준비하기",
}
TODAY = dt.date.today().isoformat()


def rd(p):
    return io.open(p, encoding="utf-8").read()


def wr(p, s):
    io.open(p, "w", encoding="utf-8", newline="\n").write(s)


def load_plan():
    return json.loads(rd(PLAN))


def save_plan(plan):
    wr(PLAN, json.dumps(plan, ensure_ascii=False, indent=2) + "\n")


def title_of(slug):
    s = rd(os.path.join(ROOT, "blog", slug + ".html"))
    m = re.search(r"<h1[^>]*>(.*?)</h1>", s, re.S)
    if not m:
        sys.exit(f"[오류] blog/{slug}.html 에 <h1> 제목이 없습니다")
    return re.sub(r"<[^>]+>", "", m.group(1)).strip()


def js_str(v):
    return json.dumps(v, ensure_ascii=False)


def add_to_series(entry):
    s = rd(SERIES)
    if f'slug: "{entry["slug"]}"' in s:
        print(f"  series-data.js: {entry['slug']} 이미 있음 — 건너뜀")
        return
    i = s.find(MARK)
    if i < 0:
        sys.exit("[오류] series-data.js 에 @@SERIES-END@@ 표식이 없습니다")
    head, tail = s[:i], s[i:]
    head = head.rstrip()
    if not head.endswith(","):
        head += ","
    obj = (
        "\n    {\n"
        f'      slug: {js_str(entry["slug"])},\n'
        f'      no: {entry["no"]},\n'
        f'      title: {js_str(entry["title"])},\n'
        f'      url: {js_str(entry["url"])},\n'
        f'      next: {js_str(entry["next"]) if entry["next"] else "null"},\n'
        f'      related: {js_str(entry["related"])},\n'
        f'      cta: {{ label: {js_str(entry["cta"]["label"])}, url: {js_str(entry["cta"]["url"])} }}\n'
        "    }\n    "
    )
    wr(SERIES, head + obj + tail)
    print(f"  series-data.js: {entry['slug']} 추가")


def hub_add_related(hub, slug):
    s = rd(SERIES)
    m = re.search(r'(slug: "%s",.*?related: )(\[[^\]]*\])' % re.escape(hub), s, re.S)
    if not m:
        return
    rel = json.loads(m.group(2))
    if slug in rel or len(rel) >= 8:
        return
    rel.append(slug)
    s = s[: m.start(2)] + js_str(rel) + s[m.end(2):]
    wr(SERIES, s)


def add_to_sitemap(url, prio="0.7"):
    s = rd(SITEMAP)
    if f"<loc>{url}</loc>" in s:
        print(f"  sitemap.xml: 이미 있음 — {url}")
        return
    block = (f"  <url>\n    <loc>{url}</loc>\n    <lastmod>{TODAY}</lastmod>\n"
             f"    <changefreq>monthly</changefreq>\n    <priority>{prio}</priority>\n  </url>\n\n")
    s = s.rstrip()
    assert s.endswith("</urlset>")
    s = s[: -len("</urlset>")].rstrip() + "\n\n" + block + "</urlset>\n"
    wr(SITEMAP, s)
    print(f"  sitemap.xml: 추가 — {url}")


def build_index(plan):
    live = [p for p in plan["posts"] if p["status"] in ("published", "review")
            and os.path.exists(os.path.join(ROOT, "blog", p["slug"] + ".html"))]
    groups = []
    for c in CLUSTER_ORDER:
        items = [p for p in live if p.get("cluster") == c]
        if not items:
            continue
        lis = "\n".join(
            f'        <li><a href="/blog/{p["slug"]}.html?src=blog-index">{html.escape(p.get("title") or p.get("topic"))}</a></li>'
            for p in sorted(items, key=lambda x: x["order"]))
        groups.append(f'    <h2>{CLUSTER_NAME.get(c, c)}</h2>\n      <ul class="hw-list">\n{lis}\n      </ul>')
    body = "\n\n".join(groups)
    page = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>기한 가이드 — 상속·증여, 놓치면 안 되는 날짜들 | HeirWise</title>
<meta name="description" content="상속포기 3개월, 상속세 6개월, 증여세 3개월 — 법이 정한 기한과 세금을 글로 먼저 읽어 보세요. 각 글 끝에서 연락처 입력 없이 진단까지 이어집니다.">
<meta property="og:title" content="기한 가이드 — 상속·증여, 놓치면 안 되는 날짜들">
<meta property="og:image" content="https://finitart.com/og/og-default.png">
<meta property="og:url" content="https://finitart.com/blog/">
<meta property="og:type" content="website">
<link rel="canonical" href="https://finitart.com/blog/">
<style>
:root{{ --hw-navy:#1A3C6D; --hw-gold:#7A5C0E; --bg:#FFFFFF; --fg:#1A1A1A; --line:#C9CFD8; --box:#EFF4FA; }}
@media (prefers-color-scheme: dark){{ :root{{ --bg:#101418; --fg:#F2F4F7; --line:#3A434E; --box:#1B2430; --hw-navy:#8FB4FF; --hw-gold:#E8C46A; }} }}
body{{ margin:0; background:var(--bg); color:var(--fg); font-family:"Malgun Gothic","Noto Sans KR",sans-serif; font-size:18px; line-height:1.75; }}
.hw-wrap{{ max-width:760px; margin:0 auto; padding:24px 20px 60px; }}
.hw-brand{{ font-size:15px; color:#5A6472; }} .hw-brand b{{ color:var(--hw-navy); }} .hw-brand .gold{{ color:var(--hw-gold); font-weight:700; }}
h1{{ font-size:28px; color:var(--hw-navy); margin:14px 0 6px; }}
h2{{ font-size:22px; color:var(--hw-navy); margin-top:36px; border-left:6px solid var(--hw-gold); padding-left:12px; }}
.hw-list{{ padding-left:22px; }} .hw-list li{{ margin:8px 0; }} .hw-list a{{ color:var(--hw-navy); font-weight:700; }}
.hw-note{{ font-size:15px; color:#5A6472; border-top:1px solid var(--line); margin-top:44px; padding-top:14px; }}
@media (prefers-color-scheme: dark){{ .hw-brand,.hw-note{{ color:#AEB7C2; }} }}
</style>
</head>
<body data-law="off" data-season="off" data-tool="blog-index">
<div class="hw-wrap">
  <p class="hw-brand"><a href="/" style="color:inherit;text-decoration:none;">SynItArt · <b>Heir</b><span class="gold">Wise</span>™</a> — 자격으로 판단하고, AI로 끝까지 챙깁니다.</p>
  <h1>기한 가이드</h1>
  <p>세금이 없어도 법이 정한 기한은 있습니다. 상황에 맞는 글부터 읽어 보세요.</p>

{body}

  <p class="hw-note">각 글은 작성일 기준 법령에 따른 일반적 안내이며, 정확한 세액은 세무전문가, 법률 판단은 변호사 상담이 필요합니다.<br>
  목록 갱신 {TODAY} · itart@finitart.com</p>
</div>
<script src="/heirwise-common.js" defer></script>
</body>
</html>
"""
    wr(INDEX, page)
    print(f"  blog/index.html: 재생성 ({len(live)}편)")


def publish(slugs, final):
    plan = load_plan()
    by = {p["slug"]: p for p in plan["posts"]}
    hub = plan["hub_slug"]
    base = plan["base_url"]
    published_all = [p["slug"] for p in plan["posts"] if p["status"] == "published"]
    for k, slug in enumerate(slugs):
        if slug not in by:
            sys.exit(f"[오류] blog-plan.json 에 {slug} 가 없습니다")
        if not os.path.exists(os.path.join(ROOT, "blog", slug + ".html")):
            sys.exit(f"[오류] blog/{slug}.html 파일이 없습니다")
    for k, slug in enumerate(slugs):
        p = by[slug]
        p["title"] = title_of(slug)
        same = [q for q in published_all + slugs if q != slug and q != hub
                and by.get(q, {}).get("cluster") == p.get("cluster")]
        related = (same[-2:] if same else []) + [hub]
        nxt = slugs[k + 1] if k + 1 < len(slugs) else hub
        print(f"- {slug}")
        add_to_series({"slug": slug, "no": p["order"], "title": p["title"],
                       "url": f"/blog/{slug}.html", "next": nxt,
                       "related": related, "cta": p["cta"]})
        hub_add_related(hub, slug)
        add_to_sitemap(f"{base}/blog/{slug}.html")
        p["status"] = "published" if final else "review"
        if final:
            p["published"] = TODAY
    add_to_sitemap(f"{base}/blog/", prio="0.8")
    build_index(plan)
    save_plan(plan)


def check():
    plan = load_plan()
    s = rd(SERIES)
    sm = rd(SITEMAP)
    bad = 0
    for p in plan["posts"]:
        if p["status"] != "published":
            continue
        f = os.path.exists(os.path.join(ROOT, "blog", p["slug"] + ".html"))
        a = f'slug: "{p["slug"]}"' in s
        b = f'/blog/{p["slug"]}.html</loc>' in sm
        ok = f and a and b
        bad += (not ok)
        print(f'{"OK " if ok else "NG "} {p["slug"]}  파일={f} 시리즈={a} 사이트맵={b}')
    pend = [p["slug"] for p in plan["posts"] if p["status"] == "pending"]
    print(f"남은 주제 {len(pend)}편: {', '.join(pend[:6])}{' …' if len(pend) > 6 else ''}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    if a[0] == "--check":
        check()
    final = a[0] == "--final"
    publish(a[1:] if final else a, final)
