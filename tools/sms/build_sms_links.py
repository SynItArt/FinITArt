# 문자 안내용 짧은 주소 finitart.com/m/NN/ → UTM 붙은 실제 주소로 이동
# 보안등급: 공개용 · 2026-09-28 · 재실행해도 같은 결과(멱등)
import os, html
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CAMPAIGN = "rev2026_10"
# 번호: (받는 분 유형, 경로, 앵커)
LINKS = {
 "01": ("지인·친구",            "/",                      ""),
 "02": ("50~60대 선후배",       "/book.html",             ""),
 "03": ("30~40대 후배",         "/lifemap/",              ""),
 "04": ("결혼 준비",            "/gift/",                 ""),
 "05": ("최근 상을 당한 분",     "/",                      "#deadline"),
 "06": ("의용소방대·봉사 동료",  "/book.html",             ""),
 "07": ("교육 동기",            "/",                      ""),
 "08": ("모임 회원",            "/book.html",             ""),
 "09": ("보험·금융 고객",        "/book.html",             ""),
 "10": ("법인 대표",            "/ceo-diagnosis.html",    ""),
 "11": ("개인사업자·자영업",     "/",                      "#ceo"),
 "12": ("은퇴 앞둔 직장인",      "/lifemap/",              ""),
 "13": ("부모님 빚 걱정",        "/inheritdebt.html",      ""),
 "14": ("장애 자녀 부모",        "/disability-trust.html", ""),
 "15": ("형제 많은 집",          "/",                      "#situations"),
 "16": ("부동산 보유자",         "/",                      "#tools"),
 "17": ("어업·선박 관계자",      "/lifemap/",              ""),
 "18": ("안전관리 현장",         "/ceo/safety.html",       ""),
 "19": ("세무사·변호사 등 전문가", "/",                      ""),
 "20": ("금융 동료 FC",          "/book.html",             ""),
}
def target(no, path, anchor):
    q = f"utm_source=sms&utm_medium=sms&utm_campaign={CAMPAIGN}&utm_content=t{no}"
    return f"https://finitart.com{path}?{q}{anchor}"
PAGE = """<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>HeirWise 안내로 이동합니다</title>
<link rel="canonical" href="https://finitart.com{path}">
<meta http-equiv="refresh" content="0;url={url_attr}">
<script>location.replace({url_js});</script>
<style>body{{margin:0;font-family:'Malgun Gothic','Noto Sans KR',sans-serif;background:#0E1726;color:#F3F4F6;display:grid;place-items:center;min-height:100vh;text-align:center;font-size:18px}}a{{color:#FFD66B;font-weight:800}}</style>
</head><body><p>HeirWise 안내로 이동합니다…<br><a href="{url_attr}">바로 열기</a></p></body></html>
"""
import json
for no,(who,path,anchor) in LINKS.items():
    url = target(no, path, anchor)
    d = os.path.join(ROOT, "m", no); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "index.html"), "w", encoding="utf-8", newline="\n").write(
        PAGE.format(path=path, url_attr=html.escape(url, quote=True), url_js=json.dumps(url)))
    print(f"{no}\t{who}\tfinitart.com/m/{no}\t{url}")
