import { Box, Container, Typography, Paper, Divider, Link as MuiLink, List, ListItem, ListItemIcon, ListItemText, Alert } from '@mui/material';
import Layout from '@/components/layout/Layout';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SecurityIcon from '@mui/icons-material/Security';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import Head from 'next/head';

export default function GoogleAPIDisclosure() {
  return (
    <>
      <Head>
        <title>Google API使用に関する情報開示 | AI Reply</title>
        <meta name="description" content="AI ReplyにおけるGoogle API、Google Business Profile API、Google OAuth 2.0の使用に関する情報開示およびデータ取り扱いについて" />
      </Head>

      <Layout>
        <Container maxWidth="md" sx={{ py: 6 }}>
          <Typography variant="h3" component="h1" gutterBottom align="center" sx={{ mb: 4 }}>
            Google API使用に関する情報開示
          </Typography>

          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 6 }}>
            最終更新日: {new Date().toLocaleDateString('ja-JP')}
          </Typography>

          {/* Section 1: Google APIの使用について */}
          <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <InfoOutlinedIcon sx={{ mr: 1, color: 'primary.main' }} />
              Google APIの使用について
            </Typography>

            <Typography variant="body1" paragraph>
              AI Replyは、お客様のビジネスレビュー管理を効率化するため、以下のGoogle APIサービスを利用しています。
            </Typography>

            <Box sx={{ ml: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                1. Google Business Profile API
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                お客様のGoogle ビジネスプロフィール情報（店舗情報、レビュー、評価など）にアクセスし、
                レビューの取得、返信の投稿、店舗情報の管理を行います。
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                2. Google OAuth 2.0
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                セキュアな認証プロトコルを使用して、お客様のGoogleアカウントと安全に連携します。
                お客様のパスワードを当サービスが保持することはありません。
              </Typography>
            </Box>

            <Alert severity="info" sx={{ mt: 3 }}>
              これらのAPIは、お客様が明示的に連携を承認した場合にのみ使用されます。
            </Alert>
          </Paper>

          {/* Section 2: データの取り扱い */}
          <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
              データの取り扱い
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              取得するデータの種類
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleOutlineIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="ビジネスプロフィール情報"
                  secondary="店舗名、住所、営業時間、カテゴリなど"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleOutlineIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="レビュー情報"
                  secondary="レビュー本文、評価、投稿者情報（公開情報のみ）、投稿日時"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleOutlineIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="基本的なプロフィール情報"
                  secondary="氏名、メールアドレス（認証に必要な範囲）"
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              データの使用目的
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              取得したデータは、以下の目的にのみ使用されます：
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleOutlineIcon fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText primary="レビューの表示および管理機能の提供" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleOutlineIcon fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText primary="AI返信機能による自動返信生成" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleOutlineIcon fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText primary="レビュー分析およびインサイトの提供" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleOutlineIcon fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText primary="サービスの改善および不正利用の防止" />
              </ListItem>
            </List>

            <Alert severity="warning" sx={{ mt: 2 }}>
              取得したデータを第三者への販売、広告目的での利用は一切行いません。
            </Alert>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              データの保存と削除
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              取得したデータは、セキュアなデータベース（Supabase）に暗号化して保存されます。
              お客様がアカウントを削除した場合、または連携を解除した場合、関連するデータは速やかに削除されます。
            </Typography>
            <Typography variant="body2" color="text.secondary">
              データ保持期間: アカウント有効期間中、または法令により保持が求められる期間
            </Typography>
          </Paper>

          {/* Section 3: Googleブランドガイドラインの遵守 */}
          <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
              Googleブランドガイドラインの遵守
            </Typography>

            <Typography variant="body2" color="text.secondary" paragraph>
              AI Replyは、Google APIサービスの利用にあたり、
              <MuiLink
                href="https://developers.google.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ mx: 0.5 }}
              >
                Google API利用規約
              </MuiLink>
              および
              <MuiLink
                href="https://developers.google.com/terms/branding-guidelines"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ mx: 0.5 }}
              >
                Googleブランドガイドライン
              </MuiLink>
              を遵守しています。
            </Typography>

            <Typography variant="body2" color="text.secondary" paragraph>
              Google、Google Business Profile、およびその他のGoogleの商標は、Google LLCの商標です。
            </Typography>
          </Paper>

          {/* Section 4: ユーザーの権限 */}
          <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
              お客様の権限
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <LinkOffIcon sx={{ mr: 1, fontSize: 20 }} />
                いつでも連携解除可能
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                お客様は、いつでもAI ReplyとGoogleアカウントの連携を解除することができます。
                解除方法：
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="1. AI Reply設定ページから「連携解除」ボタンをクリック"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="2. Googleアカウント設定の「アクセス権を持つアプリ」から削除"
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondary={
                      <MuiLink
                        href="https://myaccount.google.com/permissions"
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="caption"
                      >
                        https://myaccount.google.com/permissions
                      </MuiLink>
                    }
                  />
                </ListItem>
              </List>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
                データ削除リクエスト
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                お客様は、AI Replyが保持するお客様のデータの削除を要請する権利があります。
              </Typography>
              <Typography variant="body2" color="text.secondary">
                データ削除のリクエストは、アカウント設定ページの「アカウント削除」機能、
                または当サービスのサポート窓口までお問い合わせください。
              </Typography>
            </Box>
          </Paper>

          {/* Section 5: 免責事項 */}
          <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
              免責事項
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Google社との関係性
              </Typography>
              <Typography variant="body2">
                AI Replyは、Google LLCまたはその関連会社とは提携関係になく、
                これらの企業からの承認、後援、または推奨を受けたものではありません。
              </Typography>
            </Alert>

            <Typography variant="body2" color="text.secondary" paragraph>
              本サービスは、Googleが提供するAPIを利用していますが、独立したサードパーティアプリケーションです。
              Google Business ProfileやGoogleアカウントに関する問題については、Googleの公式サポートをご利用ください。
            </Typography>

            <Typography variant="body2" color="text.secondary" paragraph>
              当サービスは、Google APIの利用規約およびポリシーの変更により、
              予告なく機能の変更や一時的な利用停止が発生する可能性があります。
            </Typography>
          </Paper>

          {/* Contact Information */}
          <Paper elevation={2} sx={{ p: 4, backgroundColor: 'grey.50' }}>
            <Typography variant="h6" gutterBottom>
              お問い合わせ
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              本開示内容に関するご質問、またはデータの取り扱いに関するご懸念がございましたら、
              以下の窓口までお問い合わせください。
            </Typography>
            <Typography variant="body2" color="text.secondary">
              サポート窓口: support@ai-reply.example.com
            </Typography>
          </Paper>

          {/* Footer Links */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              関連ドキュメント:
              {' '}
              <MuiLink href="/legal/privacy-policy" sx={{ mx: 1 }}>
                プライバシーポリシー
              </MuiLink>
              {' | '}
              <MuiLink href="/legal/terms-of-service" sx={{ mx: 1 }}>
                利用規約
              </MuiLink>
            </Typography>
          </Box>
        </Container>
      </Layout>
    </>
  );
}
