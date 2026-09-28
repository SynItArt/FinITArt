# -*- coding: utf-8 -*-
"""
HeirWise 우리 집 사연 v1.0 — 기존 파일 패치 (2026-09-28)
보안등급: 내부용 | 제작: HeirWise_Syn Dae Sik (申大湜)

고치는 곳 (4파일, 삽입만 — 기존 줄 삭제 없음)
  1) privacy.html      §1 표에 「사연 남기기」 행 (물어보기(챗봇) 행 바로 뒤)
  2) heirwise-common.js PAGE_NAMES 에 /chat.html · /stories.html 이름표 (경로 띠 「⌂ 홈 › …」용)
  3) sitemap.xml       stories.html · chat.html 등재 (</urlset> 앞)
  4) llms.txt          ## 페이지 에 두 줄 (상담 신청 줄 앞)

실행 (저장소 루트 C:\\dev\\HeirWise-deploy, Git Bash)
    python tools/patch_stories_v1_2026-09-28.py --check
    python tools/patch_stories_v1_2026-09-28.py
멱등: 이미 적용된 항목은 skip. 원본은 *.bak-20260928s
"""
import io, os, sys, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHECK = "--check" in sys.argv
TAG = ".bak-20260928s"
TODAY = "2026-09-28"

def read(p): return io.open(p, "r", encoding="utf-8").read()
def write(p, s):
    if not os.path.exists(p + TAG): shutil.copyfile(p, p + TAG)
    io.open(p, "w", encoding="utf-8", newline="\n").write(s)
def insert_once(text, anchor, addition, before=True, marker=None):
    if (marker or addition.strip()[:60]) in text: return text, "skip(already)"
    n = text.count(anchor)
    if n != 1: return text, "FAIL(anchor x%d)" % n
    return text.replace(anchor, (addition + anchor) if before else (anchor + addition)), "ok"

results = []

# 1) privacy.html
PV = os.path.join(ROOT, "privacy.html"); pv = read(PV)
ROW = ('      <tr><td data-th="어디서">사연 남기기<br>(우리 집 사연)</td>'
       '<td data-th="받는 항목">사연 내용, 나이대, 부르실 이름(별명), 게시 희망 여부, 연락처(적으신 경우)</td>'
       '<td data-th="목적">답변과 익명 게시(고유명사·금액을 바꿔 운영자가 정리한 뒤, 게시에 동의하신 사연만)</td>'
       '<td data-th="보유 기간">답변일부터 1년 · 게시된 사연은 삭제 요청 시 지웁니다</td></tr>\n')
anchor = '      <tr><td data-th="어디서">자동 수집</td>'
pv, r = insert_once(pv, anchor, ROW, before=True, marker='data-th="어디서">사연 남기기')
results.append(("privacy §1 사연 행", r))
if not CHECK and r == "ok": write(PV, pv)

# 2) heirwise-common.js PAGE_NAMES
JS = os.path.join(ROOT, "heirwise-common.js"); js = read(JS)
NAMES = '    "/chat.html": [TALK, "물어보기"],\n    "/stories.html": [null, "우리 집 사연"],\n'
anchor = '    "/privacy.html": [null, "개인정보처리방침"],\n'
js, r = insert_once(js, anchor, NAMES, before=True, marker='"/stories.html": [null, "우리 집 사연"]')
results.append(("common.js PAGE_NAMES", r))
if not CHECK and r == "ok": write(JS, js)

# 3) sitemap.xml
SM = os.path.join(ROOT, "sitemap.xml"); sm = read(SM)
URLS = ('  <url>\n    <loc>https://finitart.com/stories.html</loc>\n    <lastmod>%s</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n'
        '  <url>\n    <loc>https://finitart.com/chat.html</loc>\n    <lastmod>%s</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n') % (TODAY, TODAY)
sm, r = insert_once(sm, "</urlset>", URLS, before=True, marker="https://finitart.com/stories.html</loc>")
results.append(("sitemap 2 URL", r))
if not CHECK and r == "ok": write(SM, sm)

# 4) llms.txt
LL = os.path.join(ROOT, "llms.txt"); ll = read(LL)
LINES = ('- [우리 집 사연](https://finitart.com/stories.html): 상속·증여를 겪은 집들의 사연 28편(판례·강의·이용자 사연을 이름·금액을 바꿔 재구성). 사연마다 쟁점·법정 기한·맞는 도구를 정리. 댓글 없이 반응 버튼만, 이름 없이 사연 접수.\n'
         '- [물어보기](https://finitart.com/chat.html): 상황을 적으면 유형을 분류하고 기한과 도구를 안내하는 1차 창구. 법률·세무 판단이 아닌 정리·안내이며, 원하면 그 자리에서 상담 연락처를 남길 수 있음.\n')
anchor = '- [상담 신청](https://finitart.com/consult.html)\n'
ll, r = insert_once(ll, anchor, LINES, before=True, marker="https://finitart.com/stories.html):")
results.append(("llms.txt 2줄", r))
if not CHECK and r == "ok": write(LL, ll)

print("모드:", "확인만" if CHECK else "적용")
for n, r in results: print("  %-20s %s" % (n, r))
if any(r.startswith("FAIL") for _, r in results):
    print("\n⚠ 앵커를 찾지 못한 항목이 있습니다. 해당 파일은 수정하지 않았습니다."); sys.exit(1)
