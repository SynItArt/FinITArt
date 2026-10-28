/*!
 * sw.js — HeirWise 웹앱(PWA) 서비스 워커 v1.0 (2026.10.28)
 * 보안등급: 공유 가능 | 제작: HeirWise_Syn Dae Sik (申大湜)
 *
 * 원칙
 *  1. 이 사이트의 글·계산기·법령 기준일은 늘 최신이어야 합니다.
 *     → 페이지·스크립트·데이터는 "네트워크 먼저", 끊겼을 때만 저장본을 씁니다.
 *  2. 그림(png·jpg·svg·webp)만 저장본을 먼저 보여 주고 뒤에서 새로 받습니다.
 *  3. 다른 도메인(Apps Script 접수, GA4, 글꼴 CDN)과 POST 요청은 건드리지 않습니다.
 *     → 리드 접수·계측 흐름은 이 파일과 무관하게 그대로 동작합니다.
 *  4. PDF(책·소책자)는 용량이 커서 저장하지 않습니다.
 *
 * 수정 후에는 VERSION 숫자를 올리십시오. 이전 저장본은 자동으로 지워집니다.
 */
var VERSION = "hw-pwa-v1-20261028";
var PAGES = VERSION + "-pages";
var IMAGES = VERSION + "-img";

var PRECACHE = [
  "/",
  "/offline.html",
  "/app/",
  "/manifest.webmanifest",
  "/hw-bands.css",
  "/heirwise-common.js",
  "/img/app/icon-192.png",
  "/img/app/icon-512.png",
  "/img/brand/heirwise-symbol.svg"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(PAGES).then(function (cache) {
      // 하나가 실패해도 설치 전체가 멈추지 않도록 개별로 담습니다.
      return Promise.all(PRECACHE.map(function (url) {
        return cache.add(new Request(url, { cache: "reload" })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k.indexOf(VERSION) !== 0) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isImage(url) { return /\.(png|jpe?g|svg|webp|gif|ico)$/i.test(url.pathname); }
function isSkipped(url) { return /\.(pdf|mp4|webm|zip)$/i.test(url.pathname); }

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (isSkipped(url)) return;

  if (isImage(url)) {
    // 그림: 저장본 먼저, 뒤에서 갱신
    event.respondWith(
      caches.open(IMAGES).then(function (cache) {
        return cache.match(req).then(function (hit) {
          var net = fetch(req).then(function (res) {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          }).catch(function () { return hit; });
          return hit || net;
        });
      })
    );
    return;
  }

  // 페이지·스크립트·스타일·데이터: 네트워크 먼저
  event.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && res.type === "basic") {
        var copy = res.clone();
        caches.open(PAGES).then(function (cache) { cache.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: req.mode === "navigate" }).then(function (hit) {
        if (hit) return hit;
        if (req.mode === "navigate") return caches.match("/offline.html");
        return new Response("", { status: 504, statusText: "offline" });
      });
    })
  );
});
