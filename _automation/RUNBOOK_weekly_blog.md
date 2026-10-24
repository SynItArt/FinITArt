# HeirWise 주간 블로그 운영 지침 (RUNBOOK) — 보안등급: 공유 가능

매주 목요일 예약 작업이 이 지침대로 글 3편을 만든다. 원칙: **검토 후 발행** — 본부장님 승인 전에는 main(=finitart.com)에 아무것도 반영하지 않는다.

## 0. 준비
- 저장소: SynItArt/FinITArt (`add_repo` access=push → `git clone --depth 1`), 작업 디렉터리 `/home/claude/finitart`
- 커밋 작성자: `-c user.name="Syn Dae Sik" -c user.email="itart@finitart.com"`
- 이전 검토 브랜치 확인: `git ls-remote --heads origin 'blog-review-*'` — main에 아직 병합 안 된 브랜치가 있으면 **새 글을 쓰지 말고** 그 브랜치 목록과 "승인 대기 중" 상태만 보고하고 승인 절차(6장)를 안내한다. 한 번에 하나의 검토 브랜치만 둔다.

## 1. 주제 선택
- `_automation/blog-plan.json` 에서 status=pending 을 order 순으로 3개.
- pending 이 3개 미만이면 남은 것만 쓰고, 0개면 글을 쓰지 말고 새 주제 6개(같은 JSON 형식, 기한·세금·증여 위주, 검색 키워드 포함)를 제안만 한다.

## 2. 법령 검증 (작성 전, 생략 금지)
- 각 글의 law_hint 는 출발점일 뿐이다. law.go.kr(국가법령정보센터)·국세청·정부24 공식 자료로 조문 번호·금액·기한·시행일을 확인한다.
- 블로그·언론 기사만으로 수치를 확정하지 않는다. "2024년 상속세 개편안(최고세율 40%, 자녀공제 5억)"은 2024.12.10 국회 부결 — 시행된 것처럼 쓴 글은 노이즈.
- 판례를 인용하면 사건번호를 대법원 종합법률정보 등으로 확인한다. 확인 못 하면 판례 언급을 빼고 "판례상 일반적으로"로도 쓰지 않는다.
- 확인 결과(조문·시행일·출처 URL)를 보고서 표에 남긴다.

## 3. 작성 규칙
- 형식: 기존 글(`blog/renunciation-3months.html`)의 HTML·CSS를 그대로 복제해 본문만 교체. 파일명 `blog/<slug>.html`.
  - 교체할 곳: `<title>`, description, og:title/og:description/og:url, `<body data-tool="blog-<slug>">`, `<h1>`, 본문, `.hw-series` 의 `data-self="<slug>"`.
  - 스크립트 2줄(`/blog/series-data.js`, `/heirwise-common.js`) 유지.
- 구조: 결론 먼저(기한·숫자) → 근거 조문 blockquote → 계산 예시 1개(표) → 놓쳤을 때 비용/주의 3가지 → 면책 문구. CTA·상호링크는 series-data.js 가 자동 렌더링하므로 본문에 버튼을 넣지 않는다.
- 본문 안에서 이미 발행된 글로 자연스러운 내부 링크 1~2개(`?src=body-<slug>`).
- 분량 1,500~2,500자. 대화체·어법에 맞는 자연스러운 문장. 장례·죽음을 자극적으로 쓰지 않는다.
- 표기: 머리말 `SynItArt · HeirWise™`(™ 한 번), 꼬리말 "AI·데이터 실무교육 3,603시간"(2026.11.6 이후 작성분은 "3,951시간").
- 금지: "절세" 단정 표현, 보험·투자 자격 내세우기, 「김·장」 로펌명, 참고서 4권의 제목·소제목·특유 표현 그대로 사용, 확인 안 된 수치.
- 면책 문구(이탤릭): "본 글은 ○○법(기준일) 기준의 일반적 안내이며, 법률 판단은 변호사, 정확한 세액은 세무전문가 상담이 필요합니다."
- 저시력 기준(본문 18px, 명암비 4.5:1, 색으로만 뜻 전달 금지)은 템플릿 CSS 로 이미 충족 — 색을 바꾸지 않는다.

## 4. 검토 브랜치에 올리기 (자동)
```
git switch -c blog-review-<YYYY-MM-DD>
python3 _automation/blog_publish.py <slug1> <slug2> <slug3>
python3 _automation/blog_publish.py --check
node -e "global.document={readyState:'complete',querySelectorAll:()=>[]};global.window={};require('./blog/series-data.js')"
python3 -c "import xml.dom.minidom;xml.dom.minidom.parse('sitemap.xml')"
git add -A && git commit -m "blog(review): <제목 3개 요약>" && git push origin blog-review-<YYYY-MM-DD>
```
- 그다음 **멈추고** 보고한다(5장). main 에는 손대지 않는다.

## 5. 보고 (SendUserMessage, 한국어, 결론 먼저)
- 3편 제목·핵심 결론 한 줄·글자 수
- 법령 검증 표: 조문 | 확인한 내용 | 시행일 | 출처 URL
- 미리보기(본문 확인용 — 하단 상호링크 상자는 실제 사이트에서만 보임): 각 글 `https://raw.githack.com/SynItArt/FinITArt/blog-review-<날짜>/blog/<slug>.html`
- 마지막 줄: **"승인하시면 '승인'이라고 답해 주세요. 일부만이면 '1,3 승인', 수정이면 내용을 적어 주세요."**

## 6. 승인 후 발행 (본부장님이 이 세션에서 승인한 경우에만)
- 수정 요청이면: 검토 브랜치에서 고치고 다시 5장 보고.
- 승인되면:
```
git switch main && git pull --ff-only origin main
git merge --ff-only blog-review-<날짜>   # 실패하면 git merge --no-edit (충돌 시 멈추고 보고)
python3 _automation/blog_publish.py --final <승인된 slug들>
git add -A && git commit -m "blog: <제목> 발행" && git push origin main
git push origin --delete blog-review-<날짜>
```
- 일부만 승인: 승인 안 된 글의 html 을 지우고, blog-plan.json 에서 그 글 status 를 pending 으로 되돌린 뒤 series-data.js·sitemap.xml 에서 해당 항목을 제거하고 진행.
- 약 2분 뒤 `curl -s -o /dev/null -w "%{http_code}" https://finitart.com/blog/<slug>.html` 로 200 확인.
- 색인 통보: `python3 _automation/indexnow.py <새 URL들> https://finitart.com/blog/ https://finitart.com/sitemap.xml`
- 최종 보고: 발행 URL, 200 확인 결과, IndexNow 응답, 그리고 구글 즉시 색인용 안내(서치콘솔 URL 검사 → 색인 생성 요청, 새 URL 목록 복사용 코드블록).

## 금지
- 승인 없이 main 에 push 하지 않는다.
- 기존 글·다른 페이지(index.html 등)를 수정하지 않는다. 손대는 파일은 blog/ 신규 글, blog/series-data.js, blog/index.html, sitemap.xml, _automation/blog-plan.json 뿐.
- 유료 API·결제가 걸리는 호출을 하지 않는다.
