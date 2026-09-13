# HeirWise — finitart.com

상속·증여 재무설계 안내 사이트. GitHub Pages로 배포합니다(`main` 브랜치 루트, 도메인은 `CNAME`).

## 구성

| 경로 | 내용 |
|---|---|
| `index.html` | 메인 — 상속 기한 안내, 자주 묻는 질문, 질문방 |
| `calculator.html`, `inheritdebt.html`, `ceo-diagnosis.html` | 상속세·상속채무·법인 대표 진단 |
| `natural-death.html`, `car-accident.html`, `industrial-accident.html`, `fire-accident.html`, `disability-trust.html`, `insurance-two-faces.html` | 상황별 계산기 |
| `about.html`, `consult.html`, `booking.html`, `book.html`, `chuseok.html`, `privacy.html` | 소개·상담·예약·안내서·캠페인·개인정보처리방침 |
| `retirement/` | 노후·연금 진단 |
| `heirwise-common.js` | 전 페이지 공통 스크립트(계측·상담 폼·법령 기준일) |
| `og/`, `video/` | 공유 이미지, 영상 |
| `robots.txt`, `sitemap.xml`, `llms.txt` | 검색·AI 크롤러 안내 |

## 배포

`main`에 커밋·푸시하면 GitHub Pages가 반영합니다. 빌드 과정은 없습니다.
페이지를 추가하거나 고치면 `sitemap.xml`의 `lastmod`도 함께 갱신합니다.
