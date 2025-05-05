# デプロイメントガイド

## 前提条件

- Vercelアカウント
- Supabaseアカウント
- AWSアカウント
- LINE Developersアカウント
- ドメイン（オプション）

## 環境変数の設定

### 本番環境

1. **Vercel環境変数**
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

2. **Supabase環境変数**
   ```
   OPENAI_API_KEY=your-openai-api-key
   LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
   LINE_CHANNEL_SECRET=your-line-channel-secret
   ```

3. **AWS Lambda環境変数**
   ```
   OPENAI_API_KEY=your-openai-api-key
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_KEY=your-supabase-service-key
   ```

## フロントエンドのデプロイ

### Vercelへのデプロイ

1. **プロジェクトの作成**
   ```bash
   vercel
   ```

2. **環境変数の設定**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

3. **デプロイ**
   ```bash
   vercel --prod
   ```

### カスタムドメインの設定

1. **ドメインの追加**
   ```bash
   vercel domains add your-domain.com
   ```

2. **DNSレコードの設定**
   - Aレコード: `@` → VercelのIPアドレス
   - CNAMEレコード: `www` → `cname.vercel-dns.com`

## バックエンドのデプロイ

### Supabaseの設定

1. **プロジェクトの作成**
   ```bash
   supabase init
   ```

2. **データベースのマイグレーション**
   ```bash
   supabase db push
   ```

3. **RLSポリシーの適用**
   ```bash
   supabase db reset
   ```

### AWS Lambdaのデプロイ

1. **関数の作成**
   ```bash
   aws lambda create-function \
     --function-name generate-reply \
     --runtime nodejs18.x \
     --handler index.handler \
     --zip-file fileb://function.zip
   ```

2. **環境変数の設定**
   ```bash
   aws lambda update-function-configuration \
     --function-name generate-reply \
     --environment Variables={OPENAI_API_KEY=your-key,SUPABASE_URL=your-url}
   ```

3. **API Gatewayの設定**
   ```bash
   aws apigateway create-rest-api \
     --name revai-concierge-api
   ```

## LINE通知の設定

1. **Webhook URLの設定**
   ```
   https://your-domain.com/api/webhook/line
   ```

2. **チャネル設定の確認**
   - Webhook送信: 有効
   - 自動応答メッセージ: 無効
   - 友だち追加時のあいさつ: 無効

## セキュリティ設定

### SSL/TLS

1. **Vercelの自動SSL**
   - デフォルトで有効
   - カスタムドメインでも自動設定

2. **AWS API GatewayのSSL**
   ```bash
   aws apigateway create-domain-name \
     --domain-name api.your-domain.com \
     --certificate-arn your-certificate-arn
   ```

### ファイアウォール

1. **SupabaseのIP制限**
   ```sql
   -- 特定のIPからのアクセスのみ許可
   CREATE POLICY "特定IPからのアクセスのみ許可"
   ON public.locations
   FOR ALL
   USING (client_ip() IN ('123.456.789.0/24'));
   ```

2. **AWS WAFの設定**
   ```bash
   aws waf create-web-acl \
     --name revai-concierge-waf \
     --default-action Block
   ```

## モニタリングの設定

### ログ収集

1. **Vercelのログ**
   ```bash
   vercel logs
   ```

2. **Supabaseのログ**
   ```sql
   -- ログの有効化
   ALTER DATABASE postgres SET log_statement = 'all';
   ```

3. **AWS CloudWatch**
   ```bash
   aws logs create-log-group \
     --log-group-name /aws/lambda/generate-reply
   ```

### アラート設定

1. **Vercelのアラート**
   - デプロイ失敗
   - エラーレートの上昇
   - レスポンスタイムの増加

2. **Supabaseのアラート**
   - データベース接続数
   - クエリ実行時間
   - エラーレート

3. **AWS CloudWatchアラート**
   ```bash
   aws cloudwatch put-metric-alarm \
     --alarm-name lambda-errors \
     --metric-name Errors \
     --namespace AWS/Lambda \
     --statistic Sum \
     --period 300 \
     --threshold 1 \
     --comparison-operator GreaterThanThreshold
   ```

## バックアップとリカバリー

### データベースバックアップ

1. **自動バックアップ**
   ```sql
   -- バックアップスケジュールの設定
   ALTER SYSTEM SET archive_mode = on;
   ALTER SYSTEM SET archive_command = 'test ! -f /mnt/server/archivedir/%f && cp %p /mnt/server/archivedir/%f';
   ```

2. **手動バックアップ**
   ```bash
   pg_dump -U postgres -d revai_concierge > backup.sql
   ```

### リカバリープラン

1. **データベースの復元**
   ```bash
   psql -U postgres -d revai_concierge < backup.sql
   ```

2. **アプリケーションのロールバック**
   ```bash
   vercel rollback <deployment-id>
   ```

## メンテナンス

### 定期メンテナンス

1. **データベースの最適化**
   ```sql
   VACUUM ANALYZE;
   ```

2. **ログのローテーション**
   ```bash
   logrotate /etc/logrotate.conf
   ```

### アップデート手順

1. **依存関係の更新**
   ```bash
   npm update
   ```

2. **マイグレーションの実行**
   ```bash
   supabase db push
   ```

3. **デプロイの実行**
   ```bash
   vercel --prod
   ``` 