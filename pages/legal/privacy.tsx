import { Box, Container, Typography, Paper, Divider, Link as MuiLink, Breadcrumbs, Chip } from '@mui/material';
import Layout from '@/components/layout/Layout';
import Link from 'next/link';
import { Shield, Info, Lock, Storage, Cloud, Cookie, ChildCare, Public, Update, ContactMail } from '@mui/icons-material';

export default function PrivacyPolicy() {
  const lastUpdated = '2025年12月7日';

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          {/* ブレッドクラム */}
          <Breadcrumbs sx={{ mb: 3 }}>
            <Link href="/dashboard" passHref legacyBehavior>
              <MuiLink underline="hover" color="inherit">
                ホーム
              </MuiLink>
            </Link>
            <Typography color="text.primary">プライバシーポリシー</Typography>
          </Breadcrumbs>

          {/* ヘッダー */}
          <Paper sx={{ p: 4, mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <Box display="flex" alignItems="center" mb={2}>
              <Shield sx={{ fontSize: 40, mr: 2 }} />
              <Typography variant="h3" component="h1" fontWeight="bold">
                プライバシーポリシー
              </Typography>
            </Box>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              Privacy Policy
            </Typography>
            <Chip
              label={`最終更新日: ${lastUpdated}`}
              sx={{ mt: 2, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
            />
          </Paper>

          {/* ナビゲーション */}
          <Paper sx={{ p: 3, mb: 4, bgcolor: '#f5f5f5' }}>
            <Typography variant="h6" gutterBottom>
              関連ページ
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Link href="/legal/terms" passHref legacyBehavior>
                <MuiLink underline="hover">利用規約</MuiLink>
              </Link>
              <Link href="/legal/sla" passHref legacyBehavior>
                <MuiLink underline="hover">サービスレベル合意（SLA）</MuiLink>
              </Link>
              <Link href="/settings" passHref legacyBehavior>
                <MuiLink underline="hover">プライバシー設定</MuiLink>
              </Link>
            </Box>
          </Paper>

          {/* コンテンツ */}
          <Paper sx={{ p: 4 }}>
            {/* 1. はじめに */}
            <Box mb={4}>
              <Box display="flex" alignItems="center" mb={2}>
                <Info sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h5" component="h2" fontWeight="bold">
                  1. はじめに
                </Typography>
              </Box>
              <Typography paragraph>
                RevAI Concierge（以下「当サービス」）は、Google Business Profile上のレビューに対するAI返信管理サービスを提供しています。
              </Typography>
              <Typography paragraph>
                本プライバシーポリシー（以下「本ポリシー」）は、当サービスがユーザーの個人情報をどのように収集、使用、保護、共有するかについて説明するものです。
              </Typography>
              <Typography paragraph fontWeight="bold">
                <strong>データ管理者情報：</strong>
              </Typography>
              <Typography component="div" paragraph>
                <Box sx={{ pl: 3 }}>
                  サービス名：RevAI Concierge<br />
                  運営者：[会社名または運営者名]<br />
                  所在地：[住所]<br />
                  連絡先：privacy@revai-concierge.com<br />
                  データ保護責任者：[DPO名]（dpo@revai-concierge.com）
                </Box>
              </Typography>
              <Typography paragraph>
                当サービスは、EU一般データ保護規則（GDPR）および日本の個人情報保護法に準拠して運営されています。
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 2. 収集する個人情報の種類 */}
            <Box mb={4}>
              <Box display="flex" alignItems="center" mb={2}>
                <Storage sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h5" component="h2" fontWeight="bold">
                  2. 収集する個人情報の種類
                </Typography>
              </Box>
              <Typography paragraph>
                当サービスでは、以下の個人情報を収集します：
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                2.1 アカウント情報
              </Typography>
              <Typography component="div" paragraph>
                <ul>
                  <li>メールアドレス（認証・通知用）</li>
                  <li>氏名またはユーザー名</li>
                  <li>パスワード（ハッシュ化して保存）</li>
                  <li>プロフィール画像（任意）</li>
                  <li>会社名または店舗名</li>
                  <li>電話番号（任意）</li>
                </ul>
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                2.2 Google Business Profile データ
              </Typography>
              <Typography component="div" paragraph>
                <ul>
                  <li>Google アカウント情報（OAuth認証時）</li>
                  <li>ビジネスプロフィール情報（店舗名、住所、営業時間等）</li>
                  <li>アクセストークン（暗号化して保存）</li>
                  <li>リフレッシュトークン（暗号化して保存）</li>
                </ul>
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                2.3 レビュー・返信データ
              </Typography>
              <Typography component="div" paragraph>
                <ul>
                  <li>顧客レビュー内容（レビュアー名、評価、コメント、投稿日時）</li>
                  <li>返信内容（AI生成返信および手動返信）</li>
                  <li>レビューと返信の履歴</li>
                  <li>返信のトーン設定</li>
                  <li>返信テンプレート</li>
                </ul>
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                2.4 利用ログ・Cookie
              </Typography>
              <Typography component="div" paragraph>
                <ul>
                  <li>IPアドレス</li>
                  <li>アクセス日時</li>
                  <li>使用デバイス情報（ブラウザ、OS、デバイスタイプ）</li>
                  <li>ページ閲覧履歴</li>
                  <li>セッション情報</li>
                  <li>エラーログ</li>
                  <li>パフォーマンスメトリクス</li>
                </ul>
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                2.5 決済情報
              </Typography>
              <Typography component="div" paragraph>
                <ul>
                  <li>クレジットカード情報（Stripeにて安全に処理、当社サーバーには保存されません）</li>
                  <li>請求先住所</li>
                  <li>取引履歴</li>
                  <li>サブスクリプション情報</li>
                </ul>
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 3. 個人情報の利用目的 */}
            <Box mb={4}>
              <Box display="flex" alignItems="center" mb={2}>
                <Lock sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h5" component="h2" fontWeight="bold">
                  3. 個人情報の利用目的
                </Typography>
              </Box>
              <Typography paragraph>
                収集した個人情報は、以下の目的で利用します：
              </Typography>
              <Typography component="div" paragraph>
                <ul>
                  <li><strong>サービス提供：</strong>アカウント管理、認証、レビュー同期、AI返信生成</li>
                  <li><strong>機能改善：</strong>サービスの品質向上、新機能の開発、ユーザー体験の最適化</li>
                  <li><strong>カスタマーサポート：</strong>問い合わせ対応、技術サポート、障害対応</li>
                  <li><strong>セキュリティ：</strong>不正アクセス検知、アカウント保護、脅威の監視</li>
                  <li><strong>決済処理：</strong>サブスクリプション管理、請求書発行、決済確認</li>
                  <li><strong>通知送信：</strong>重要なサービス更新、セキュリティアラート、請求関連通知</li>
                  <li><strong>法令遵守：</strong>法的義務の履行、規制当局への報告</li>
                  <li><strong>統計分析：</strong>匿名化されたデータの分析（個人を特定できない形式）</li>
                  <li><strong>マーケティング：</strong>ユーザーの同意を得た場合のみ、製品情報や特典のご案内</li>
                </ul>
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 4. 個人情報の第三者提供 */}
            <Box mb={4}>
              <Box display="flex" alignItems="center" mb={2}>
                <Cloud sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h5" component="h2" fontWeight="bold">
                  4. 個人情報の第三者提供
                </Typography>
              </Box>
              <Typography paragraph>
                当サービスは、以下の第三者サービスプロバイダーとデータを共有します。これらのプロバイダーは、適切なセキュリティ対策を講じており、データ処理契約（DPA）を締結しています。
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                4.1 Supabase（データベース・認証）
              </Typography>
              <Typography component="div" paragraph>
                <Box sx={{ pl: 3 }}>
                  <strong>提供データ：</strong>アカウント情報、レビューデータ、返信データ<br />
                  <strong>目的：</strong>データベース管理、ユーザー認証、データストレージ<br />
                  <strong>所在地：</strong>米国（AWS リージョン選択可能）<br />
                  <strong>プライバシーポリシー：</strong><MuiLink href="https://supabase.com/privacy" target="_blank" rel="noopener">https://supabase.com/privacy</MuiLink><br />
                  <strong>GDPR対応：</strong>対応済み（標準契約条項使用）
                </Box>
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                4.2 Stripe（決済処理）
              </Typography>
              <Typography component="div" paragraph>
                <Box sx={{ pl: 3 }}>
                  <strong>提供データ：</strong>決済情報、請求先情報、取引履歴<br />
                  <strong>目的：</strong>安全な決済処理、サブスクリプション管理<br />
                  <strong>所在地：</strong>米国<br />
                  <strong>プライバシーポリシー：</strong><MuiLink href="https://stripe.com/privacy" target="_blank" rel="noopener">https://stripe.com/privacy</MuiLink><br />
                  <strong>GDPR対応：</strong>対応済み（PCI DSS Level 1準拠）
                </Box>
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                4.3 Google APIs（レビュー同期）
              </Typography>
              <Typography component="div" paragraph>
                <Box sx={{ pl: 3 }}>
                  <strong>提供データ：</strong>Googleアクセストークン、ビジネスプロフィール情報<br />
                  <strong>目的：</strong>Google Business Profileとの連携、レビューの取得・返信投稿<br />
                  <strong>所在地：</strong>米国（グローバル）<br />
                  <strong>プライバシーポリシー：</strong><MuiLink href="https://policies.google.com/privacy" target="_blank" rel="noopener">https://policies.google.com/privacy</MuiLink><br />
                  <strong>GDPR対応：</strong>対応済み
                </Box>
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                4.4 OpenAI（AI返信生成）
              </Typography>
              <Typography component="div" paragraph>
                <Box sx={{ pl: 3 }}>
                  <strong>提供データ：</strong>レビュー内容（個人情報は最小化）、返信トーン設定<br />
                  <strong>目的：</strong>AI返信の自動生成<br />
                  <strong>所在地：</strong>米国<br />
                  <strong>プライバシーポリシー：</strong><MuiLink href="https://openai.com/privacy" target="_blank" rel="noopener">https://openai.com/privacy</MuiLink><br />
                  <strong>GDPR対応：</strong>対応済み<br />
                  <strong>データ保持：</strong>OpenAIはAPI経由で送信されたデータを30日間保持後、削除します（学習には使用されません）
                </Box>
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                4.5 Sentry（エラー監視）
              </Typography>
              <Typography component="div" paragraph>
                <Box sx={{ pl: 3 }}>
                  <strong>提供データ：</strong>エラーログ、パフォーマンスデータ、匿名化されたユーザー情報<br />
                  <strong>目的：</strong>アプリケーションエラーの検知と修正<br />
                  <strong>所在地：</strong>米国<br />
                  <strong>プライバシーポリシー：</strong><MuiLink href="https://sentry.io/privacy/" target="_blank" rel="noopener">https://sentry.io/privacy/</MuiLink><br />
                  <strong>GDPR対応：</strong>対応済み
                </Box>
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                4.6 法的要請に基づく開示
              </Typography>
              <Typography paragraph>
                以下の場合、ユーザーの同意なく個人情報を開示することがあります：
              </Typography>
              <Typography component="div" paragraph>
                <ul>
                  <li>法令に基づく開示義務がある場合</li>
                  <li>裁判所の命令や令状がある場合</li>
                  <li>政府機関からの正式な要請がある場合</li>
                  <li>ユーザーや第三者の生命、身体、財産の保護のために必要な場合</li>
                </ul>
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 5. データの保存期間 */}
            <Box mb={4}>
              <Box display="flex" alignItems="center" mb={2}>
                <Update sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h5" component="h2" fontWeight="bold">
                  5. データの保存期間
                </Typography>
              </Box>
              <Typography paragraph>
                個人情報は、利用目的の達成に必要な期間のみ保存します：
              </Typography>
              <Typography component="div" paragraph>
                <ul>
                  <li><strong>アカウント情報：</strong>アカウント削除まで保存。削除後30日以内に完全削除（バックアップからも削除）</li>
                  <li><strong>レビュー・返信データ：</strong>アカウント削除まで保存、または最終アクセスから3年間</li>
                  <li><strong>決済情報：</strong>税法・会計法に基づき7年間保存（Stripe上で管理）</li>
                  <li><strong>アクセスログ：</strong>セキュリティ目的で90日間保存後、自動削除</li>
                  <li><strong>エラーログ：</strong>Sentryにて90日間保存後、自動削除</li>
                  <li><strong>バックアップデータ：</strong>30日間保存後、暗号化キーと共に削除</li>
                  <li><strong>匿名化された統計データ：</strong>無期限保存（個人を特定できない形式）</li>
                </ul>
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 6. データのセキュリティ対策 */}
            <Box mb={4}>
              <Box display="flex" alignItems="center" mb={2}>
                <Shield sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h5" component="h2" fontWeight="bold">
                  6. データのセキュリティ対策
                </Typography>
              </Box>
              <Typography paragraph>
                当サービスは、個人情報を保護するため、以下のセキュリティ対策を実施しています：
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                6.1 技術的対策
              </Typography>
              <Typography component="div" paragraph>
                <ul>
                  <li><strong>暗号化：</strong>全データ通信をTLS 1.3で暗号化（HTTPS）</li>
                  <li><strong>データベース暗号化：</strong>保存データの暗号化（AES-256）</li>
                  <li><strong>パスワード保護：</strong>bcryptによるハッシュ化（ソルト付き）</li>
                  <li><strong>トークン管理：</strong>OAuth認証トークンの暗号化保存</li>
                  <li><strong>ファイアウォール：</strong>不正アクセスからの保護</li>
                  <li><strong>DDoS対策：</strong>分散型サービス拒否攻撃からの防御</li>
                  <li><strong>脆弱性スキャン：</strong>定期的なセキュリティ診断</li>
                </ul>
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                6.2 アクセス制御
              </Typography>
              <Typography component="div" paragraph>
                <ul>
                  <li><strong>多要素認証（MFA）：</strong>管理者アカウントに必須</li>
                  <li><strong>役割ベースアクセス制御（RBAC）：</strong>必要最小限の権限付与</li>
                  <li><strong>IPホワイトリスト：</strong>管理画面へのアクセス制限</li>
                  <li><strong>セッション管理：</strong>アイドルタイムアウト（30分）</li>
                  <li><strong>監査ログ：</strong>すべてのデータアクセスを記録</li>
                </ul>
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                6.3 組織的対策
              </Typography>
              <Typography component="div" paragraph>
                <ul>
                  <li><strong>従業員教育：</strong>定期的なセキュリティトレーニング</li>
                  <li><strong>秘密保持契約（NDA）：</strong>すべてのスタッフと締結</li>
                  <li><strong>アクセス権管理：</strong>業務上必要な範囲に限定</li>
                  <li><strong>インシデント対応計画：</strong>セキュリティ侵害時の対応手順</li>
                  <li><strong>定期監査：</strong>四半期ごとのセキュリティレビュー</li>
                </ul>
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                6.4 物理的対策
              </Typography>
              <Typography component="div" paragraph>
                <ul>
                  <li><strong>データセンター：</strong>ISO 27001認証取得施設を使用</li>
                  <li><strong>冗長化：</strong>複数リージョンでのバックアップ</li>
                  <li><strong>災害復旧：</strong>RPO（Recovery Point Objective）24時間、RTO（Recovery Time Objective）4時間</li>
                </ul>
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 7. ユーザーの権利（GDPR対応） */}
            <Box mb={4}>
              <Box display="flex" alignItems="center" mb={2}>
                <Info sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h5" component="h2" fontWeight="bold">
                  7. ユーザーの権利（GDPR対応）
                </Typography>
              </Box>
              <Typography paragraph>
                GDPR（EU一般データ保護規則）に基づき、ユーザーには以下の権利があります：
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                7.1 アクセス権（Right to Access）
              </Typography>
              <Typography paragraph>
                当サービスが保有するご自身の個人情報にアクセスし、コピーを取得する権利。
              </Typography>
              <Typography component="div" paragraph>
                <strong>行使方法：</strong><br />
                <Box sx={{ pl: 3 }}>
                  • 設定画面 &gt; アカウント &gt; データのエクスポート<br />
                  • privacy@revai-concierge.comへメールで請求<br />
                  • 通常、請求から30日以内にJSON形式でデータを提供
                </Box>
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                7.2 訂正権（Right to Rectification）
              </Typography>
              <Typography paragraph>
                不正確または不完全な個人情報を訂正する権利。
              </Typography>
              <Typography component="div" paragraph>
                <strong>行使方法：</strong><br />
                <Box sx={{ pl: 3 }}>
                  • 設定画面 &gt; プロフィール から直接編集<br />
                  • 訂正できない項目はサポートへ連絡
                </Box>
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                7.3 削除権（Right to Erasure / 忘れられる権利）
              </Typography>
              <Typography paragraph>
                個人情報の削除を要求する権利（法的保存義務がある場合を除く）。
              </Typography>
              <Typography component="div" paragraph>
                <strong>行使方法：</strong><br />
                <Box sx={{ pl: 3 }}>
                  • 設定画面 &gt; アカウント &gt; アカウント削除<br />
                  • 削除実行後30日以内に全データを完全削除<br />
                  • 削除前に30日間の猶予期間（復元可能）
                </Box>
              </Typography>
              <Typography paragraph>
                <em>※ 税法等により保存が義務付けられた決済情報は、法定保存期間（7年）経過後に削除されます。</em>
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                7.4 データポータビリティの権利（Right to Data Portability）
              </Typography>
              <Typography paragraph>
                個人情報を構造化された一般的な形式で受け取り、他のサービスに移行する権利。
              </Typography>
              <Typography component="div" paragraph>
                <strong>行使方法：</strong><br />
                <Box sx={{ pl: 3 }}>
                  • 設定画面 &gt; アカウント &gt; データのエクスポート<br />
                  • JSON、CSV形式でのダウンロード<br />
                  • エクスポート内容：プロフィール、店舗情報、レビュー、返信履歴
                </Box>
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                7.5 処理制限権（Right to Restriction of Processing）
              </Typography>
              <Typography paragraph>
                特定の状況下で個人情報の処理を制限する権利。
              </Typography>
              <Typography component="div" paragraph>
                <strong>行使方法：</strong><br />
                <Box sx={{ pl: 3 }}>
                  • privacy@revai-concierge.comへ制限内容を明記して請求<br />
                  • 審査後、適用可能な場合は制限を実施
                </Box>
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                7.6 異議申立権（Right to Object）
              </Typography>
              <Typography paragraph>
                個人情報の処理に異議を申し立てる権利（マーケティング目的等）。
              </Typography>
              <Typography component="div" paragraph>
                <strong>行使方法：</strong><br />
                <Box sx={{ pl: 3 }}>
                  • マーケティングメール内の「配信停止」リンク<br />
                  • 設定画面 &gt; 通知設定 &gt; マーケティングメールを無効化<br />
                  • privacy@revai-concierge.comへ連絡
                </Box>
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                7.7 自動処理に関する権利（Rights related to Automated Decision-making）
              </Typography>
              <Typography paragraph>
                AI返信生成は自動処理ですが、最終的な投稿判断はユーザー自身が行います。完全に自動化された意思決定は行っておりません。
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                7.8 監督機関への苦情申立権
              </Typography>
              <Typography paragraph>
                データ保護に関する懸念がある場合、以下の機関に苦情を申し立てることができます：
              </Typography>
              <Typography component="div" paragraph>
                <ul>
                  <li><strong>日本：</strong>個人情報保護委員会（https://www.ppc.go.jp/）</li>
                  <li><strong>EU：</strong>各加盟国のデータ保護機関（https://edpb.europa.eu/）</li>
                </ul>
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 8. Cookieポリシー */}
            <Box mb={4}>
              <Box display="flex" alignItems="center" mb={2}>
                <Cookie sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h5" component="h2" fontWeight="bold">
                  8. Cookieポリシー
                </Typography>
              </Box>
              <Typography paragraph>
                当サービスでは、以下の目的でCookieおよび類似技術を使用します：
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                8.1 必須Cookie（Strictly Necessary Cookies）
              </Typography>
              <Typography paragraph>
                サービスの基本機能を提供するために不可欠なCookie。無効化するとサービスが正常に動作しません。
              </Typography>
              <Typography component="div" paragraph>
                <ul>
                  <li><strong>セッションCookie：</strong>ログイン状態の維持</li>
                  <li><strong>セキュリティCookie：</strong>CSRF攻撃からの保護</li>
                  <li><strong>保存期間：</strong>セッション終了まで、または24時間</li>
                </ul>
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                8.2 機能Cookie（Functional Cookies）
              </Typography>
              <Typography paragraph>
                ユーザー体験を向上させるためのCookie。
              </Typography>
              <Typography component="div" paragraph>
                <ul>
                  <li><strong>言語設定：</strong>選択した言語の記憶</li>
                  <li><strong>テーマ設定：</strong>ダークモード等の設定</li>
                  <li><strong>表示設定：</strong>テーブルの列表示設定等</li>
                  <li><strong>保存期間：</strong>1年間</li>
                </ul>
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                8.3 分析Cookie（Analytics Cookies）
              </Typography>
              <Typography paragraph>
                サービスの利用状況を分析し、改善するためのCookie（使用していません）。
              </Typography>
              <Typography paragraph>
                <em>※ 現在、当サービスはGoogle AnalyticsやGoogle Tag Manager等の第三者分析ツールを使用していません。</em>
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                8.4 マーケティングCookie（Marketing Cookies）
              </Typography>
              <Typography paragraph>
                ターゲット広告を表示するためのCookie（使用していません）。
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                8.5 Cookie管理
              </Typography>
              <Typography paragraph>
                ブラウザ設定からCookieを削除・無効化できますが、必須Cookieを無効化するとサービスが利用できなくなる場合があります。
              </Typography>
              <Typography component="div" paragraph>
                <strong>主要ブラウザのCookie設定：</strong>
                <ul>
                  <li>Chrome: 設定 &gt; プライバシーとセキュリティ &gt; Cookie</li>
                  <li>Firefox: 設定 &gt; プライバシーとセキュリティ &gt; Cookie</li>
                  <li>Safari: 環境設定 &gt; プライバシー &gt; Cookie</li>
                  <li>Edge: 設定 &gt; プライバシー &gt; Cookie</li>
                </ul>
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 9. 子供のプライバシー */}
            <Box mb={4}>
              <Box display="flex" alignItems="center" mb={2}>
                <ChildCare sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h5" component="h2" fontWeight="bold">
                  9. 子供のプライバシー
                </Typography>
              </Box>
              <Typography paragraph>
                当サービスは、ビジネス向けSaaSサービスであり、18歳未満の方を対象としていません。
              </Typography>
              <Typography paragraph>
                18歳未満の方の個人情報を故意に収集することはありません。万が一、18歳未満の方の情報が収集されたことが判明した場合、速やかに削除いたします。
              </Typography>
              <Typography paragraph>
                親権者の方で、お子様が当サービスに個人情報を提供した可能性がある場合は、privacy@revai-concierge.comまでご連絡ください。
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 10. 国際データ転送 */}
            <Box mb={4}>
              <Box display="flex" alignItems="center" mb={2}>
                <Public sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h5" component="h2" fontWeight="bold">
                  10. 国際データ転送
                </Typography>
              </Box>
              <Typography paragraph>
                当サービスは、日本国内のユーザーにサービスを提供していますが、データ処理の一部は日本国外（主に米国）で行われます。
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                10.1 EU域外への転送（GDPR対応）
              </Typography>
              <Typography paragraph>
                EU圏内のユーザーの個人情報を域外に転送する場合、以下の保護措置を講じます：
              </Typography>
              <Typography component="div" paragraph>
                <ul>
                  <li><strong>標準契約条項（SCC）：</strong>EU承認の標準契約条項を使用</li>
                  <li><strong>十分性認定：</strong>EU委員会が十分性認定した国へのデータ転送</li>
                  <li><strong>データ処理契約（DPA）：</strong>すべての第三者プロバイダーと締結</li>
                  <li><strong>データローカライゼーション：</strong>要望に応じてEU域内でのデータ保存オプション提供</li>
                </ul>
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                10.2 主要な転送先
              </Typography>
              <Typography component="div" paragraph>
                <ul>
                  <li><strong>米国：</strong>Supabase（AWS）、Stripe、OpenAI、Sentry</li>
                  <li><strong>保護措置：</strong>すべてのプロバイダーがGDPR準拠、SCC締結済み</li>
                </ul>
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 11. ポリシーの変更 */}
            <Box mb={4}>
              <Box display="flex" alignItems="center" mb={2}>
                <Update sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h5" component="h2" fontWeight="bold">
                  11. ポリシーの変更
                </Typography>
              </Box>
              <Typography paragraph>
                当サービスは、法令の変更、事業内容の変更、またはセキュリティ向上のため、本ポリシーを変更することがあります。
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                11.1 軽微な変更
              </Typography>
              <Typography paragraph>
                誤字脱字の修正、表現の明確化等の軽微な変更は、通知なく実施する場合があります。
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                11.2 重要な変更
              </Typography>
              <Typography paragraph>
                個人情報の取扱いに関する重要な変更がある場合は、以下の方法で事前にお知らせします：
              </Typography>
              <Typography component="div" paragraph>
                <ul>
                  <li>登録メールアドレスへの通知（変更の30日前）</li>
                  <li>ダッシュボード上での通知バナー表示</li>
                  <li>本ページ上部に「重要な変更」の告知</li>
                </ul>
              </Typography>
              <Typography paragraph>
                変更に同意できない場合は、変更の効力発生日までにアカウントを削除することで、新しいポリシーの適用を回避できます。
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                11.3 変更履歴
              </Typography>
              <Typography paragraph>
                過去のプライバシーポリシーは、以下で確認できます：
              </Typography>
              <Typography component="div" paragraph>
                <Box sx={{ pl: 3 }}>
                  <MuiLink href="/legal/privacy/archive" underline="hover">プライバシーポリシー変更履歴</MuiLink>
                </Box>
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* 12. お問い合わせ先 */}
            <Box mb={4}>
              <Box display="flex" alignItems="center" mb={2}>
                <ContactMail sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h5" component="h2" fontWeight="bold">
                  12. お問い合わせ先
                </Typography>
              </Box>
              <Typography paragraph>
                本ポリシーに関するご質問、個人情報の取扱いに関するお問い合わせは、以下までご連絡ください：
              </Typography>

              <Paper sx={{ p: 3, bgcolor: '#f9f9f9', mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  RevAI Concierge データ保護窓口
                </Typography>
                <Typography component="div">
                  <strong>一般お問い合わせ：</strong><br />
                  Email: privacy@revai-concierge.com<br />
                  <br />
                  <strong>データ保護責任者（DPO）：</strong><br />
                  Email: dpo@revai-concierge.com<br />
                  <br />
                  <strong>GDPR関連のお問い合わせ：</strong><br />
                  Email: gdpr@revai-concierge.com<br />
                  <br />
                  <strong>郵送先：</strong><br />
                  〒[郵便番号]<br />
                  [住所]<br />
                  RevAI Concierge プライバシー担当<br />
                  <br />
                  <strong>対応時間：</strong><br />
                  月曜日～金曜日 9:00～18:00（日本時間）<br />
                  ※祝日を除く<br />
                  <br />
                  <strong>回答期間：</strong><br />
                  通常、お問い合わせから5営業日以内に回答<br />
                  複雑な案件の場合、最大30日（GDPR要件に準拠）
                </Typography>
              </Paper>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* フッター */}
            <Box sx={{ mt: 6, pt: 4, borderTop: '1px solid #e0e0e0' }}>
              <Typography variant="body2" color="text.secondary" align="center">
                最終更新日: {lastUpdated}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                バージョン: 1.0.0
              </Typography>
              <Box display="flex" justifyContent="center" gap={3} mt={2}>
                <Link href="/legal/terms" passHref legacyBehavior>
                  <MuiLink variant="body2" underline="hover">利用規約</MuiLink>
                </Link>
                <Link href="/legal/sla" passHref legacyBehavior>
                  <MuiLink variant="body2" underline="hover">SLA</MuiLink>
                </Link>
                <Link href="/settings" passHref legacyBehavior>
                  <MuiLink variant="body2" underline="hover">プライバシー設定</MuiLink>
                </Link>
                <MuiLink variant="body2" href="mailto:privacy@revai-concierge.com" underline="hover">
                  お問い合わせ
                </MuiLink>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Container>
    </Layout>
  );
}
