#!/usr/bin/env python3
"""
IndexNow 색인 통보 — indexnow.py (보안등급: 공유 가능)
네이버 서치어드바이저·빙 등 IndexNow 참여 검색엔진에 새/수정 URL을 즉시 알린다.
구글은 IndexNow를 지원하지 않음 → sitemap.xml lastmod 갱신으로 재수집 유도.

사용법: python3 _automation/indexnow.py https://finitart.com/blog/a.html [...]
키 파일: 저장소 루트 /<KEY>.txt (공개되어야 정상 동작 — 비밀값 아님)
"""
import json, sys, urllib.request

HOST = "finitart.com"
KEY = "64e9ca91573ed16da5e460f11066b2af"
ENDPOINTS = ["https://searchadvisor.naver.com/indexnow", "https://api.indexnow.org/indexnow"]

def ping(urls):
    body = json.dumps({"host": HOST, "key": KEY,
                       "keyLocation": f"https://{HOST}/{KEY}.txt",
                       "urlList": urls}).encode("utf-8")
    ok = True
    for ep in ENDPOINTS:
        req = urllib.request.Request(ep, data=body, method="POST",
                                     headers={"Content-Type": "application/json; charset=utf-8"})
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                print(f"{ep} -> {r.status}")
        except urllib.error.HTTPError as e:
            print(f"{ep} -> {e.code} {e.read()[:200]!r}")
            ok = ok and e.code in (200, 202)
        except Exception as e:
            print(f"{ep} -> 실패 {e}")
            ok = False
    return ok

if __name__ == "__main__":
    u = [x for x in sys.argv[1:] if x.startswith("https://")]
    if not u:
        sys.exit(__doc__)
    sys.exit(0 if ping(u) else 1)
