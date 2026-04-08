/**
 * イベントループスロットル
 * キュー専用プロセスでioredis/BullMQのPromiseサイクルがCPUを占有する問題の対策。
 *
 * ダミーHTTPサーバーを起動し、自分自身に定期的にリクエストを送信する。
 * HTTPリクエスト処理がイベントループに挟まることで、ioredisのPromiseサイクルが
 * 自然にスロットルされる（oru.skiのHTTPサーバー同居と同じ効果）。
 */

const http = require('http');

const server = http.createServer((req, res) => {
	res.writeHead(200);
	res.end('ok');
});

server.listen(0, '127.0.0.1', () => {
	const port = server.address().port;

	// 50ms間隔で自分自身にリクエストを送信
	setInterval(() => {
		http.get(`http://127.0.0.1:${port}/`, (res) => {
			res.resume(); // レスポンスを読み捨て
		}).on('error', () => {}); // エラーは無視
	}, 50);
});
