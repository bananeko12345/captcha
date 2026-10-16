# Server-verified image text CAPTCHA

画像に表示した文字を入力して、サーバーAPIで検証するCAPTCHAの学習用デモです。

## 起動

```bash
npm start
# http://localhost:3000
```

## API

- `POST /api/captcha/challenge` — ワンタイムチャレンジIDとCAPTCHA画像を発行
- `POST /api/captcha/verify` — チャレンジIDと入力文字を検証

答えはブラウザへ返さず、サーバーのメモリに5分間だけ保持します。正解または試行回数超過で破棄します。

## 本番で追加すべき対策

このデモは学習用です。本番では次を追加してください。

1. メモリMapをRedisなどの共有ストレージへ変更する（複数サーバー対応）。
2. IP・セッション単位のレート制限、CSRF対策、HTTPSを有効にする。
3. CAPTCHA成功をフォーム送信API側でも必ず検証する。フロントの`verified`状態だけを信用しない。
4. 大規模なボット対策が必要なら、自作画像CAPTCHAよりCloudflare Turnstile等の公式サービスを推奨する。
5. 漢字は誤読しやすくアクセシビリティも低いため、英数字や音声・別の検証手段を用意する。

外部OCR APIを検証ロジックに使うと、APIキー漏洩・コスト増・認識誤りが起きるため、利用者の回答との照合には使わず、画像生成・サーバー側の秘密値で判定する設計にしています。
