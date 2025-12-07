# お問い合わせページ (Contact/Support Page)

## 概要

お客様からの問い合わせを受け付けるための専用ページです。フォームバリデーション、レート制限、FAQ機能を備えた本格的なお問い合わせシステムです。

## ファイル構成

```
/pages/contact.tsx                   # お問い合わせページ
/pages/api/contact/submit.ts         # フォーム送信APIエンドポイント
/e2e/contact.spec.ts                 # E2Eテスト
```

## 主な機能

### 1. お問い合わせフォーム

#### フォームフィールド
- **お名前（必須）**: テキスト入力、最大100文字
- **メールアドレス（必須）**: メールアドレス形式のバリデーション
- **会社名（任意）**: テキスト入力、最大200文字
- **お問い合わせ種別**: ドロップダウン選択
  - サービスについて
  - 技術的な問題
  - 料金・プランについて
  - 解約について
  - その他
- **お問い合わせ内容（必須）**: テキストエリア、10〜5000文字

#### バリデーション機能
- リアルタイムバリデーション（入力中にエラーがクリアされる）
- メールアドレスの形式チェック
- 文字数制限のチェック
- 必須フィールドのチェック
- わかりやすいエラーメッセージ

### 2. レート制限（スパム対策）

APIエンドポイントには以下のレート制限が実装されています：

- **制限**: 1時間あたり5回まで（IPアドレス単位）
- **実装**: インメモリストア（本番環境ではRedis推奨）
- **エラーレスポンス**: HTTP 429（Too Many Requests）

### 3. よくある質問（FAQ）

アコーディオン形式で8つの質問と回答を表示：
- サービス利用開始までの時間
- プラン選択のガイド
- AI返信の精度
- プラン変更・解約
- データセキュリティ
- 複数スタッフ利用
- プラットフォーム対応
- サポート体制

### 4. サイドバー情報

- メールでのお問い合わせ先
- サポート時間（平日10:00-18:00）
- 注意事項

### 5. SEO最適化

- タイトルタグ
- メタディスクリプション
- キーワード
- OGPタグ（Open Graph Protocol）

## API仕様

### エンドポイント

```
POST /api/contact/submit
```

### リクエストボディ

```json
{
  "name": "山田太郎",
  "email": "yamada@example.com",
  "company": "テスト株式会社",
  "inquiryType": "service",
  "message": "サービスについて詳しく教えてください。"
}
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "message": "お問い合わせを受け付けました",
  "success": true
}
```

#### エラー時（400 Bad Request）

```json
{
  "message": "入力内容に誤りがあります",
  "errors": [
    "お名前は必須です",
    "有効なメールアドレスを入力してください"
  ]
}
```

#### レート制限エラー（429 Too Many Requests）

```json
{
  "message": "送信回数の上限に達しました。しばらくしてから再度お試しください。",
  "retryAfter": 60
}
```

## メール通知の実装（オプション）

現在、APIは問い合わせ内容をコンソールに出力していますが、本番環境では以下のいずれかの実装を推奨します。

### 方法1: Nodemailerを使用

```typescript
// pages/api/contact/submit.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// サポートチームへの通知
await transporter.sendMail({
  from: process.env.SMTP_FROM,
  to: process.env.SUPPORT_EMAIL,
  subject: `新規お問い合わせ: ${getInquiryTypeLabel(sanitizedData.inquiryType)}`,
  text: `
お名前: ${sanitizedData.name}
メールアドレス: ${sanitizedData.email}
会社名: ${sanitizedData.company || '（未記入）'}
お問い合わせ種別: ${getInquiryTypeLabel(sanitizedData.inquiryType)}

お問い合わせ内容:
${sanitizedData.message}

送信日時: ${sanitizedData.submittedAt}
  `,
});

// お客様への自動返信
await transporter.sendMail({
  from: process.env.SMTP_FROM,
  to: sanitizedData.email,
  subject: 'お問い合わせを受け付けました - RevAI Concierge',
  text: `
${sanitizedData.name} 様

お問い合わせいただき、ありがとうございます。
以下の内容でお問い合わせを受け付けました。

お問い合わせ種別: ${getInquiryTypeLabel(sanitizedData.inquiryType)}
お問い合わせ内容:
${sanitizedData.message}

通常2営業日以内にご返信いたしますので、今しばらくお待ちください。

RevAI Concierge サポートチーム
  `,
});
```

### 方法2: SendGridを使用

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const msg = {
  to: process.env.SUPPORT_EMAIL!,
  from: process.env.SENDGRID_FROM_EMAIL!,
  subject: `新規お問い合わせ: ${getInquiryTypeLabel(sanitizedData.inquiryType)}`,
  text: `お名前: ${sanitizedData.name}...`,
};

await sgMail.send(msg);
```

### 方法3: Resendを使用（推奨）

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'support@revai-concierge.com',
  to: process.env.SUPPORT_EMAIL!,
  subject: `新規お問い合わせ: ${getInquiryTypeLabel(sanitizedData.inquiryType)}`,
  text: `お名前: ${sanitizedData.name}...`,
});
```

## Supabaseデータベースへの保存

問い合わせ履歴を保存する場合のテーブル定義：

```sql
-- お問い合わせテーブルの作成
CREATE TABLE contact_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company VARCHAR(200),
  inquiry_type VARCHAR(50),
  message TEXT NOT NULL,
  client_ip VARCHAR(45),
  status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, resolved
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_contact_submissions_email ON contact_submissions(email);
CREATE INDEX idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX idx_contact_submissions_created_at ON contact_submissions(created_at DESC);

-- RLSポリシーの設定（管理者のみアクセス可能）
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "管理者のみアクセス可能"
  ON contact_submissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

実装例：

```typescript
// pages/api/contact/submit.ts
import { supabase } from '@/utils/supabase';

const { error: dbError } = await supabase
  .from('contact_submissions')
  .insert([{
    name: sanitizedData.name,
    email: sanitizedData.email,
    company: sanitizedData.company,
    inquiry_type: sanitizedData.inquiryType,
    message: sanitizedData.message,
    client_ip: sanitizedData.clientIp,
    created_at: sanitizedData.submittedAt,
  }]);

if (dbError) {
  console.error('Database error:', dbError);
  return res.status(500).json({
    message: 'お問い合わせの保存に失敗しました',
  });
}
```

## Slack/Discord通知の実装

### Slack Webhook

```typescript
const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

await fetch(slackWebhookUrl!, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: '新規お問い合わせ',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*新規お問い合わせ*\n\n*お名前:* ${sanitizedData.name}\n*メール:* ${sanitizedData.email}\n*種別:* ${getInquiryTypeLabel(sanitizedData.inquiryType)}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*内容:*\n${sanitizedData.message}`,
        },
      },
    ],
  }),
});
```

## 環境変数の設定

`.env.local`に以下の環境変数を追加：

```bash
# メール設定（Nodemailerの場合）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@revai-concierge.com
SUPPORT_EMAIL=support@revai-concierge.com

# SendGridの場合
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=support@revai-concierge.com

# Resendの場合
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Slack通知の場合
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/xxx/xxx
```

## テスト実行

E2Eテストを実行：

```bash
# すべてのテストを実行
npm run test:e2e

# お問い合わせページのテストのみ実行
npx playwright test e2e/contact.spec.ts

# UIモードで実行
npx playwright test e2e/contact.spec.ts --ui

# デバッグモードで実行
npx playwright test e2e/contact.spec.ts --debug
```

## カスタマイズ

### FAQの追加・変更

`pages/contact.tsx`の`faqs`配列を編集：

```typescript
const faqs = [
  {
    question: '新しい質問',
    answer: '新しい回答',
  },
  // ... 既存のFAQ
];
```

### お問い合わせ種別の追加

`pages/contact.tsx`と`pages/api/contact/submit.ts`の両方を更新：

```typescript
// pages/contact.tsx
const inquiryTypes = [
  { value: 'service', label: 'サービスについて' },
  { value: 'new_type', label: '新しい種別' }, // 追加
  // ...
];

// pages/api/contact/submit.ts
const validInquiryTypes = ['service', 'technical', 'pricing', 'cancellation', 'other', 'new_type'];
```

### レート制限の調整

`pages/api/contact/submit.ts`の定数を変更：

```typescript
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 時間枠（ミリ秒）
const MAX_REQUESTS_PER_WINDOW = 5; // 最大リクエスト数
```

## セキュリティ考慮事項

1. **レート制限**: IPアドレスベースのレート制限を実装済み
2. **入力バリデーション**: サーバーサイドで厳格なバリデーション
3. **サニタイゼーション**: 入力値のトリムと正規化
4. **XSS対策**: Reactの自動エスケープを使用
5. **CSRF対策**: Next.jsのAPIルートは同一オリジンのみ許可

## 本番環境への展開チェックリスト

- [ ] メール通知の実装と動作確認
- [ ] データベースへの保存機能の実装
- [ ] レート制限の適切な設定（Redis推奨）
- [ ] エラーログの監視設定
- [ ] 自動返信メールのテンプレート作成
- [ ] FAQ内容の最終確認
- [ ] サポートメールアドレスの設定
- [ ] 環境変数の本番環境への設定
- [ ] E2Eテストの実行と合格確認
- [ ] アクセシビリティチェック

## トラブルシューティング

### フォーム送信後にエラーが表示される

1. ブラウザのコンソールでネットワークエラーを確認
2. APIエンドポントが正しく動作しているか確認：`http://localhost:3000/api/contact/submit`
3. サーバーログでエラー内容を確認

### レート制限が機能しない

本番環境では、IPアドレスの取得方法を環境に合わせて調整する必要があります：

```typescript
const clientIp =
  req.headers['cf-connecting-ip'] || // Cloudflare
  req.headers['x-real-ip'] ||        // Nginx
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  req.socket.remoteAddress;
```

## 関連ドキュメント

- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [MUI Form Components](https://mui.com/material-ui/react-text-field/)
- [Playwright Testing](https://playwright.dev/)
