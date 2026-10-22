/* 내돈내가 공통 저장소·계산 모듈 — 데이터는 이 브라우저(localStorage)에만 저장됩니다. */
(function(){
  var KEY = 'naedon-v1', mem = null, writable = true;

  function load(){
    if(mem) return mem;
    var d = null;
    try{ var s = localStorage.getItem(KEY); if(s) d = JSON.parse(s); }catch(e){ writable = false; }
    if(!d || typeof d !== 'object') d = {};
    if(!Array.isArray(d.items)) d.items = [];
    if(!d.me || typeof d.me !== 'object') d.me = {};
    mem = d; return d;
  }
  function save(){
    try{ localStorage.setItem(KEY, JSON.stringify(load())); writable = true; return true; }
    catch(e){ writable = false; return false; }
  }
  function canStore(){
    try{ var k='__nd_t'; localStorage.setItem(k,'1'); localStorage.removeItem(k); return true; }catch(e){ return false; }
  }
  function uid(){ return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
  function get(id){ var d = load(); for(var i=0;i<d.items.length;i++) if(d.items[i].id===id) return d.items[i]; return null; }
  function upsert(it){
    var d = load(); it.updated = new Date().toISOString();
    if(!it.id) it.id = uid();
    for(var i=0;i<d.items.length;i++) if(d.items[i].id===it.id){ d.items[i]=it; save(); return it; }
    d.items.push(it); save(); return it;
  }
  function remove(id){ var d=load(); d.items = d.items.filter(function(x){return x.id!==id;}); save(); }

  var TYPES = {
    goods:{l:'물품·납품대금', y:3},
    construction:{l:'공사대금', y:3},
    service:{l:'용역대금', y:5},
    loan:{l:'사업상 대여금', y:5},
    judgment:{l:'판결·지급명령 확정 채권', y:10},
    etc:{l:'기타', y:null}
  };

  function parseD(s){ if(!s) return null; var p=String(s).split('-'); if(p.length!==3) return null; var d=new Date(+p[0],+p[1]-1,+p[2]); return isNaN(d)?null:d; }
  function today(){ var t=new Date(); t.setHours(0,0,0,0); return t; }
  function days(a,b){ return Math.round((b-a)/86400000); }
  function addY(d,n){ var x=new Date(d); x.setFullYear(x.getFullYear()+n); return x; }
  function addM(d,n){ var x=new Date(d); x.setMonth(x.getMonth()+n); return x; }
  function addD(d,n){ var x=new Date(d); x.setDate(x.getDate()+n); return x; }
  function fmt(d){ return d ? d.getFullYear()+'. '+(d.getMonth()+1)+'. '+d.getDate()+'.' : '-'; }
  function iso(d){ var m=d.getMonth()+1, x=d.getDate(); return d.getFullYear()+'-'+(m<10?'0':'')+m+'-'+(x<10?'0':'')+x; }
  function num(s){ var n=parseInt(String(s==null?'':s).replace(/[^0-9]/g,''),10); return isNaN(n)?0:n; }
  function won(n){ return Number(n||0).toLocaleString('ko-KR')+'원'; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function unpaid(it){ return Math.max(0, num(it.amount) - num(it.paid)); }

  /* 일반 기준 소멸시효 참고 계산 — 중단·연장 사유 미반영 */
  function limitation(it){
    var t = TYPES[it.type], due = parseD(it.due);
    if(!t || !t.y || !due) return null;
    var end = addY(due, t.y);
    return {years:t.y, end:end, left:days(today(), end)};
  }

  /* 사장님이 입력한 사실만으로 계산하는 참고 등급 (신용평가 아님) */
  function risk(it){
    var r=[], p=0, amt=unpaid(it);
    if(amt<=0) return {g:'A', w:'정상', p:0, r:['미수금 없음']};
    var due = parseD(it.due);
    if(due){
      var od = days(due, today());
      if(od>180){p+=3;r.push('연체 '+od+'일');}
      else if(od>90){p+=2;r.push('연체 '+od+'일');}
      else if(od>30){p+=1;r.push('연체 '+od+'일');}
    }
    var f = it.flags || {};
    if(f.closed){p+=4;r.push('휴·폐업 확인');}
    if(f.auction){p+=4;r.push('경매·압류·회생 소식');}
    if(f.noContact){p+=2;r.push('연락 두절');}
    if(f.terms){p+=1;r.push('어음·분할·결제연기 요청');}
    if(num(it.delays)>=3){p+=1;r.push('결제 지연 '+num(it.delays)+'회');}
    var L = limitation(it);
    if(L && L.left<=180){p+=2;r.push(L.left<0?'일반 시효기간 경과 가능 — 중단 사유 확인 필요':'일반 기준 시효 '+L.left+'일 남음');}
    var g = p>=6?'D':p>=4?'C':p>=2?'B':'A';
    if(!r.length) r.push('특이 신호 없음');
    return {g:g, w:{A:'정상',B:'주의',C:'경고',D:'위험'}[g], p:p, r:r};
  }

  function initTheme(){
    var root=document.documentElement, b=document.getElementById('themeBtn');
    function set(t){
      if(t==='light'){root.setAttribute('data-theme','light'); if(b) b.textContent='어두운 화면';}
      else{root.removeAttribute('data-theme'); if(b) b.textContent='밝은 화면';}
      try{localStorage.setItem('naedon-theme',t);}catch(e){}
    }
    try{ if(localStorage.getItem('naedon-theme')==='light') set('light'); }catch(e){}
    if(b) b.addEventListener('click',function(){ set(root.getAttribute('data-theme')==='light'?'dark':'light'); });
  }

  function download(name, text, type){
    var blob = new Blob([text], {type:type||'text/plain;charset=utf-8'});
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1500);
  }
  function copy(text, onOk, onFail){
    function fb(){
      var ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select();
      try{ document.execCommand('copy'); onOk&&onOk(); }catch(e){ onFail&&onFail(); }
      document.body.removeChild(ta);
    }
    try{ if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(onOk, fb); else fb(); }catch(e){ fb(); }
  }
  function printText(title, text){
    var w = window.open('', '_blank');
    if(!w){ alert('팝업이 차단되었습니다. 팝업을 허용한 뒤 다시 눌러 주세요.'); return; }
    w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>'+esc(title)+'</title>'+
      '<style>body{font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif;font-size:13pt;line-height:1.9;margin:24mm 20mm;color:#000}'+
      'pre{white-space:pre-wrap;font-family:inherit;margin:0}</style></head><body><pre>'+esc(text)+'</pre></body></html>');
    w.document.close(); w.focus(); setTimeout(function(){ w.print(); }, 300);
  }

  window.ND = {load:load, save:save, canStore:canStore, uid:uid, get:get, upsert:upsert, remove:remove,
    TYPES:TYPES, parseD:parseD, today:today, days:days, addY:addY, addM:addM, addD:addD, fmt:fmt, iso:iso,
    num:num, won:won, esc:esc, unpaid:unpaid, limitation:limitation, risk:risk, initTheme:initTheme,
    download:download, copy:copy, printText:printText};
})();
