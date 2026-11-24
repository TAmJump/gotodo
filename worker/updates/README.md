# updates

予算・TODOの更新データ（暗号化済み）を置く場所。
`*.sql.cms` を追加して main に push すると、GitHub Actions（.github/workflows/apply.yml）が復号してデータベースに反映する。
暗号化には `recipient-cert.pem`（公開鍵）を使う。復号用の鍵は GitHub の Secrets（GOTODO_KEY）にだけ置く。

```
openssl cms -encrypt -binary -aes256 -outform DER -in update.sql -out updates/YYYYMMDD-n.sql.cms updates/recipient-cert.pem
```

