/**
 * 내돈내가 파일럿 신청 접수기 (Google Apps Script)
 * - 신청서 → 구글 시트 한 줄
 * - 올린 자료 → 구글 드라이브 「내돈내가 접수」 폴더 아래 접수번호별 폴더
 * - 새 접수 알림 → NOTIFY 메일
 *
 * 처음 한 번: 편집기 위쪽에서 함수 「setup」을 골라 ▶ 실행 → 권한 허용.
 * 그다음: 배포 → 새 배포 → 유형 「웹 앱」 → 실행: 나 / 액세스: 모든 사용자 → 배포 → 웹 앱 URL 복사.
 */

var NOTIFY = 'itart@finitart.com';
var MAX_FILES = 8;
var MAX_BYTES = 20 * 1024 * 1024;           // 원본 기준 합계 20MB
var ALLOWED = /^(image\/(jpeg|png|webp|heic|heif|gif)|application\/pdf)$/;
var HEADERS = ['접수번호','접수시각','휴대폰','연락 시간','받을 돈','상대방','금액','경과 기간','시효 표시',
  '보유 자료','상대방 상황','해본 것','막막한 점','원하는 도움','첨부 수','자료 폴더','처리 상태','회신 분류','메모'];

function setup() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty('FOLDER_ID');
  var sheetId = props.getProperty('SHEET_ID');
  var folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.createFolder('내돈내가 접수');
  var ss = sheetId ? SpreadsheetApp.openById(sheetId) : SpreadsheetApp.create('내돈내가 접수 목록');
  if (!sheetId) {
    DriveApp.getFileById(ss.getId()).moveTo(folder);
    var sh = ss.getSheets()[0];
    sh.setName('접수');
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#ffd23f');
    sh.setFrozenRows(1);
    var rule = SpreadsheetApp.newDataValidation().requireValueInList(['접수','검토 중','회신 완료','보류'], true).build();
    sh.getRange('Q2:Q').setDataValidation(rule);
    var rule2 = SpreadsheetApp.newDataValidation().requireValueInList(['① 파일럿 참여 가능','② 변호사 상담 권장','③ 이번 대상 아님'], true).build();
    sh.getRange('R2:R').setDataValidation(rule2);
  }
  props.setProperty('FOLDER_ID', folder.getId());
  props.setProperty('SHEET_ID', ss.getId());
  Logger.log('자료 폴더: ' + folder.getUrl());
  Logger.log('접수 시트: ' + ss.getUrl());
}

function doGet() {
  return out_({ ok: true, service: 'naedon' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d.hp) return out_({ ok: true, id: 'ND-0' });                       // 스팸 차단(숨은 칸)
    var phone = String(d.phone || '').replace(/\D/g, '');
    if (!/^01[016789]\d{7,8}$/.test(phone)) return out_({ ok: false, error: '휴대폰 번호 형식' });
    var files = Array.isArray(d.files) ? d.files : [];
    if (files.length > MAX_FILES) return out_({ ok: false, error: '파일 개수 초과' });

    var blobs = [], total = 0;
    files.forEach(function (f, i) {
      var type = String(f.type || '');
      if (!ALLOWED.test(type)) throw new Error('허용되지 않는 파일 형식');
      var bytes = Utilities.base64Decode(String(f.data || ''));
      total += bytes.length;
      if (total > MAX_BYTES) throw new Error('파일 용량 초과');
      var name = String(f.name || ('file' + (i + 1))).replace(/[\\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 80);
      blobs.push(Utilities.newBlob(bytes, type, (i + 1) + '_' + name));
    });

    lock.waitLock(20000);
    var props = PropertiesService.getScriptProperties();
    var root = DriveApp.getFolderById(props.getProperty('FOLDER_ID'));
    var sh = SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getSheetByName('접수');

    var tz = Session.getScriptTimeZone() || 'Asia/Seoul';
    var now = new Date();
    var id = 'ND-' + Utilities.formatDate(now, tz, 'yyMMdd-HHmm') + '-' + Math.floor(100 + Math.random() * 900);
    var masked = phone.slice(0, 3) + '-****-' + phone.slice(-4);

    var link = '';
    if (blobs.length) {
      var sub = root.createFolder(id + ' ' + masked);
      blobs.forEach(function (b) { sub.createFile(b); });
      link = sub.getUrl();
    }

    var a = d.answers || {};
    var lim = d.limit === 'over' ? '경과 가능' : d.limit === 'near' ? '임박 가능' : '';
    var row = [id, Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm'), "'" + fmtPhone_(phone), clip_(d.callTime),
      clip_(a.kind), clip_(a.debtor), clip_(a.amount), clip_(a.since), lim,
      clip_(a.evidence), clip_(a.status), clip_(a.tried), clip_(a.hard), clip_(a.want),
      blobs.length, link, '접수', '', ''];
    sh.appendRow(row);
    if (lim) sh.getRange(sh.getLastRow(), 1, 1, HEADERS.length).setBackground('#ffe0e0');
    lock.releaseLock();

    var subj = (lim ? '[시효 ' + lim + '] ' : '') + '[내돈내가] 새 신청 ' + id + ' · ' + clip_(a.kind) + ' ' + clip_(a.amount);
    var html = '<h2>새 파일럿 신청 ' + id + '</h2><table border="1" cellpadding="6" style="border-collapse:collapse">' +
      HEADERS.slice(1, 15).map(function (h, i) { return '<tr><th align="left">' + h + '</th><td>' + esc_(row[i + 1]).replace(/^'/, '') + '</td></tr>'; }).join('') +
      '</table>' + (link ? '<p><a href="' + link + '">자료 폴더 열기</a></p>' : '') +
      '<p><a href="' + SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getUrl() + '">접수 목록 열기</a></p>';
    MailApp.sendEmail({ to: NOTIFY, subject: subj, htmlBody: html });

    return out_({ ok: true, id: id });
  } catch (err) {
    try { lock.releaseLock(); } catch (e2) {}
    return out_({ ok: false, error: String(err && err.message || err) });
  }
}

function fmtPhone_(d) { return d.slice(0, 3) + '-' + d.slice(3, d.length - 4) + '-' + d.slice(-4); }
function clip_(v) { return String(v == null ? '' : v).slice(0, 300); }
function esc_(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
