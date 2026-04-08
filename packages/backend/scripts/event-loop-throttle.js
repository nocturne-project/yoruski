/**
 * イベントループスロットル
 * キュー専用プロセスでioredis/BullMQのPromiseサイクルがCPUを占有する問題の対策。
 *
 * ダミーHTTPサーバーを起動し、イベントループのpollフェーズにソケットI/O待機を追加。
 * HTTPサーバーのlistenソケットがpollフェーズでepoll_waitを呼び出し、
 * ioredisのPromiseサイクルを自然にスロットルする。
 * これはHTTPサーバー同居時と同じ動作を再現する。
 */

const http = require('http');

const server = http.createServer((req, res) => {
	res.writeHead(200);
	res.end('ok');
});

// ポート0で起動（OSが空きポートを自動割り当て、外部からはアクセスされない）
server.listen(0, '127.0.0.1', () => {
	// サーバーは起動するだけでリクエストを受ける必要はない
	// listenソケットの存在がイベントループのpollフェーズを変化させる
});
