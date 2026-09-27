# 길잡이(A안) 적용 스크립트 — 저장소 루트에서 python3 tools/lobby/apply.py
import io, os, sys, re
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
here = os.path.dirname(os.path.abspath(__file__))
def rd(p): return io.open(p, encoding='utf-8').read()
def wr(p, s): io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# 1) index.html
p = os.path.join(root, 'index.html'); s = rd(p)
if 'LOBBY:START' in s: print('index.html: 이미 적용됨'); 
else:
    frag = rd(os.path.join(here, 'lobby-fragment.html'))
    anchor = '<main id="main">\n'
    assert s.count(anchor) == 1, 'main 앵커를 찾지 못함'
    s = s.replace(anchor, anchor + '\n' + frag + '\n', 1)
    assert s.count('<div class="ceolead">') == 1
    s = s.replace('<div class="ceolead">', '<div class="ceolead" id="ceo">', 1)
    wr(p, s); print('index.html: 길잡이 삽입 + #ceo 앵커')

# 2) heirwise-common.js
p = os.path.join(root, 'heirwise-common.js'); s = rd(p)
if 'injectLobbyReturn' in s: print('heirwise-common.js: 이미 적용됨')
else:
    add = rd(os.path.join(here, 'common-addition.js'))
    anchor = '  function boot() {\n'
    assert s.count(anchor) == 1, 'boot() 앵커를 찾지 못함'
    s = s.replace(anchor, add + '\n' + anchor, 1)
    line = '    try { injectAnnounce(); } catch (e) { if (HW_CONFIG.DEBUG) console.error(e); }\n'
    assert s.count(line) == 1
    s = s.replace(line, line + '    try { injectLobbyReturn(); } catch (e) { if (HW_CONFIG.DEBUG) console.error(e); }\n', 1)
    wr(p, s); print('heirwise-common.js: injectLobbyReturn 추가')
