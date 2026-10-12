#!/usr/bin/env python3
"""home-v2-build.py — finitart.com 홈 v2 (2026-10-12) 생성기.
나이대 카드 내용은 lifemap/index.html 의 MAP 에서 읽는다(두 번 관리 금지).
사용: node 로 MAP 을 JSON 으로 내보낸 뒤(python 이 node 를 부름) index.html 을 새로 쓴다.
    python3 tools/home-v2-build.py
보안등급: 공개용 | 제작: HeirWise_Syn Dae Sik (申大湜)
"""
import json, os, subprocess, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = r'''
const fs=require("fs"),vm=require("vm");
const h=fs.readFileSync(process.argv[1]+"/lifemap/index.html","utf8");
const m=h.match(/var MAP = (\{[\s\S]*?\n\});/);const M=vm.runInNewContext("("+m[1]+")");
const o={};for(const b of [20,30,40,50,60,70]){o[b]={axis:M[b].axis,title:M[b].title,cards:M[b].cards.map(c=>({ev:c.ev,h:c.h,img:c.img||"",alt:c.alt||"",money:c.money.replace(/<[^>]+>/g,"")}))}}
process.stdout.write(JSON.stringify(o));
'''
MAP = json.loads(subprocess.check_output(["node", "-e", JS, ROOT]).decode("utf-8"))
esc = lambda s: html.escape(str(s), quote=True)

LABEL = {"20": "20대", "30": "30대", "40": "40대", "50": "50대", "60": "60대", "70": "70·80대"}
LEAD_EV = {"20": "gift_parent", "30": "first_home", "40": "parent_care", "50": "inherit_now", "60": "my_estate", "70": "after"}
HOOK = {
    "20": "처음 큰돈을 받거나 독립할 때",
    "30": "집을 마련하고 가정을 꾸릴 때",
    "40": "부모님의 일이 내 일이 될 때",
    "50": "은퇴와 부모 상속이 겹칠 때",
    "60": "내 상속을 직접 설계할 때",
    "70": "결정할 사람을 미리 정해 둘 때",
}

def age_card(b):
    d = MAP[b]
    lead = next(c for c in d["cards"] if c["ev"] == LEAD_EV[b])
    items = "".join(
        f'<li><a href="/lifemap/{b}/#{esc(c["ev"])}">{esc(c["h"].split(" — ")[0])}</a></li>' for c in d["cards"])
    img = (f'<img src="{esc(lead["img"])}" alt="" loading="lazy" decoding="async" width="1200" height="825">'
           if lead["img"] else "")
    return f'''<li class="age" data-band="{b}">
  <a class="age-pic" href="/lifemap/{b}/?src=home" tabindex="-1" aria-hidden="true">{img}</a>
  <div class="age-body">
    <p class="age-k"><span class="hw-band-chip">{LABEL[b]}</span><span>{esc(d["axis"])}</span></p>
    <h3><a href="/lifemap/{b}/?src=home" data-age="{b}">{esc(HOOK[b])}</a></h3>
    <ul class="age-ev" aria-label="{LABEL[b]} 변곡점 3가지">{items}</ul>
    <a class="age-go" href="/lifemap/{b}/?src=home" data-age="{b}">{LABEL[b]} 지도 보기 <span aria-hidden="true">→</span></a>
  </div>
</li>'''

AGES = "\n".join(age_card(b) for b in ["20", "30", "40", "50", "60", "70"])
CHIPS = "".join(f'<a class="chip" data-band="{b}" data-age="{b}" href="/lifemap/{b}/?src=home-hero">{LABEL[b]}</a>'
                for b in ["20", "30", "40", "50", "60", "70"])

LD = open(os.path.join(ROOT, "tools", "home-v2-ld.html"), encoding="utf-8").read().strip()

TOOLS = [
    ("/calculator.html", "상속세 종합 계산기", "재산·가족 구성을 넣으면 상속세를 개략으로 추정합니다"),
    ("/inheritdebt.html", "상속채무 진단기", "빚이 더 많을 때 한정승인·포기 기한과 선택지를 비교합니다"),
    ("/gift/", "부모님께 받는 돈", "결혼·출산·전세 자금, 받기 전에 세금부터 확인합니다"),
    ("/retirement/", "노후자금 진단", "연금 3층과 생활비로 은퇴 후 현금흐름을 봅니다"),
    ("/ceo/", "대표로 산다는 것", "법인 대표가 부딪히는 28가지 문제와 계산 도구"),
    ("/field/", "현장을 지킨다는 것", "사업장 안전관리 의무와 사고 뒤 24시간"),
    ("/insurance-two-faces.html", "보험의 두 얼굴", "보험금이 상속재산이 되는 경우와 아닌 경우"),
    ("/disability-trust.html", "장애인 신탁 계산", "장애 가족에게 남길 때 비과세 요건을 확인합니다"),
    ("/car-accident.html", "교통사고 보상 계산", "사고 보상금과 상속을 함께 봅니다"),
]
TOOL_LIS = "".join(f'<li><a class="tool" href="{h}?src=home"><b>{esc(t)}</b><span>{esc(d)}</span></a></li>' for h, t, d in TOOLS)

PAGE = open(os.path.join(ROOT, "tools", "home-v2-template.html"), encoding="utf-8").read()
out = PAGE.replace("{{LD}}", LD).replace("{{AGES}}", AGES).replace("{{CHIPS}}", CHIPS).replace("{{TOOLS}}", TOOL_LIS)
assert "{{" not in out
open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write(out)
print("index.html v2 생성:", len(out), "bytes")
