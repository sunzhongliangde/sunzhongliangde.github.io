/* ===========================================================
 * sw.js
 * ===========================================================
 * Copyright 2016 @huxpro
 * Licensed under Apache 2.0 
 * Register service worker.
 * ========================================================== */

const PRECACHE = 'precache-2020-03-30';
const RUNTIME = 'runtime';
const HOSTNAME_WHITELIST = [
	self.location.hostname,
	"cdn.bootcss.com",
];
const FILES_CACHE = [
	"/"
]

// 监听 service worker 的 install 事件
self.addEventListener('install', function (event) {
	// 如果监听到了 service worker 已经安装成功的话，就会调用 event.waitUntil 回调函数
	event.waitUntil(
		// 安装成功后操作 CacheStorage 缓存，使用之前需要先通过 caches.open() 打开对应缓存空间。
		caches.open(PRECACHE).then(function (cache) {
			// 通过 cache 缓存对象的 addAll 方法添加 precache 缓存
			return cache.addAll(FILES_CACHE);
		}).then(function () {
			return self.skipWaiting();
		})
	);
});

self.addEventListener('activate', function (event) {
	event.waitUntil(
		Promise.all([
			// 更新客户端
			self.clients.claim(),
			// 清理旧版本
			caches.keys().then(function (cacheList) {
				return Promise.all(
					cacheList.map(function (cacheName) {
						if (cacheName !== PRECACHE) {
							return caches.delete(cacheName);
						}
					})
				);
			})
		])
	);
});

const isCORSRequest = function (url, host) {
	return url.search(host) === -1;
};

self.addEventListener('fetch', function (event) {

	if (HOSTNAME_WHITELIST.indexOf(new URL(event.request.url).hostname) > -1) {
		event.respondWith(
			caches.match(event.request).then(function (response) {
				// 来来来，代理可以搞一些代理的事情
				// console.log(`fetch: ${event.request.url}`)

				// 如果 Service Worker 有自己的返回，就直接返回，减少一次 http 请求
				if (response) {
					console.log(`service work命中缓存: ${event.request.url}`)
					return response;
				}

				var request = null;
				if (isCORSRequest(event.request.url, self.location.hostname)) {
					if (event.request.url.indexOf("cnblogs.com") > -1) {
						request = new Request(event.request.url, {
							mode: 'no-cors', cache: "no-store", header: {
								'Access-Control-Allow-Origin': '*',
								'origin': 'https://www.cnblogs.com',
								'referer': 'https://www.cnblogs.com'
							}
						});
					}
					else {
						request = new Request(event.request.url, { mode: 'cors', cache: "no-store" });
					}
				}
				else {
					request = event.request.clone();
				}

				// 如果 service worker 没有返回，那就得直接请求真实远程服务
				return fetch(request, { cache: "no-store" }).then(function (httpRes) {
					// http请求的返回已被抓到，可以处置了。
					// 请求失败了，直接返回失败的结果就好了。。
					if (!httpRes || httpRes.status !== 200) {
						console.log(`service worker请求失败 ${httpRes.url}`);
						return httpRes;
					}

					// 请求成功的话，将请求缓存起来。
					var responseClone = httpRes.clone();
					caches.open(PRECACHE).then(function (cache) {
						console.log(`service worker请求成功 ${httpRes.url}`);
						cache.put(event.request, responseClone);
					});

					return httpRes;
				});
			})
		);
	}
});

