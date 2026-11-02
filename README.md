# 事業再編TODO（gotodo）

オアシスケア根岸・後藤医院・NPO・組合・GMS の12か月実行計画を、グループで確認・更新するサイト。

- 画面：GitHub Pages（`index.html` / `app.js` / `config.js`）、公開URL https://todo.115en.com
- データ：Cloudflare Worker `gotodo-api` + D1 `gotodo-db`（`worker/`）
- ログイン：名前（後藤基温／大下甚／伊藤晋／森久保康希）＋個人のパスワード。初回は 5555 で入り、その場で自分のパスワードに変更する

## 構成

| ファイル | 内容 |
|---|---|
| `index.html` / `app.js` | 一覧・ガントチャート・カレンダー・利益化の画面 |
| `config.js` | 接続先 API の URL |
| `CNAME` | カスタムドメイン（todo.115en.com） |
| `worker/src/index.js` | 共有データ API |
| `worker/schema.sql` | テーブル定義 |
| `worker/seed.sql` | 初期データ（9事業・63タスク）。流すと既存データは消えるので初回のみ |

## API

`POST /api/login`（名前・パスワード）で受け取ったトークンを `Authorization: Bearer <token>` で送る。初回ログイン後は `POST /api/password` でパスワードを変えるまで他のAPIは使えない。

- `GET /api/data` 事業とタスクの一覧
- `POST /api/tasks` タスク追加
- `PUT /api/tasks/:id` タスク更新
- `DELETE /api/tasks/:id` タスク削除
- `PUT /api/groups/:id` 事業の利益化目標・状況・メモを更新

## 土日祝の扱い

- 期限・開始日に土日祝を選ぶと、保存時に直前の平日へ自動で移す
- カレンダーは土日祝を灰色、祝日名を表示
- `worker/fix-weekends.sql`（`npm run db:fix`）：初期データのうち土日祝に入っていた日付を平日へ移す。手で変更済みのタスクには触れない

## 記録と変更履歴

- 記録（`notes`）は書いた本人だけが編集・削除できる（サーバー側で判定）
- タスク・記録・事業の保存はすべて `logs` に日時と入力者つきで残り、タスクの編集画面と「履歴」タブで見られる

## パスワードを忘れたとき

`worker` フォルダで次のどれかを実行すると、その人は次回 5555 で入り直してパスワードを決め直す。

- `npm run reset:goto`（後藤基温）
- `npm run reset:oshita`（大下甚）
- `npm run reset:ito`（伊藤晋）
- `npm run reset:morikubo`（森久保康希）
