import { useState } from 'react';
import Head from 'next/head';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  MenuItem,
  Paper,
  Alert,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SendIcon from '@mui/icons-material/Send';
import EmailIcon from '@mui/icons-material/Email';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

type ContactFormData = {
  name: string;
  email: string;
  company: string;
  inquiryType: string;
  message: string;
};

type FormErrors = {
  name?: string;
  email?: string;
  message?: string;
};

const inquiryTypes = [
  { value: 'service', label: 'サービスについて' },
  { value: 'technical', label: '技術的な問題' },
  { value: 'pricing', label: '料金・プランについて' },
  { value: 'cancellation', label: '解約について' },
  { value: 'other', label: 'その他' },
];

const faqs = [
  {
    question: 'サービスの利用開始までにどのくらい時間がかかりますか？',
    answer: 'アカウント作成後、すぐにご利用いただけます。Google My Businessアカウントとの連携設定を行っていただくと、レビューの自動取得とAI返信機能がご利用可能になります。通常、設定には5〜10分程度かかります。',
  },
  {
    question: 'どのプランを選べばよいですか？',
    answer: '店舗数やレビューの件数に応じてプランをお選びください。スタータープランは1〜3店舗、ビジネスプランは4〜10店舗、エンタープライズプランは11店舗以上の運営に最適です。まずは無料トライアルでお試しいただくことをお勧めします。',
  },
  {
    question: 'AI返信の精度はどの程度ですか？',
    answer: '当社のAIは最新の自然言語処理技術を使用しており、高精度な返信文を生成します。ただし、生成された返信は必ず確認・編集してから投稿することをお勧めします。お客様のブランドやトーンに合わせてカスタマイズも可能です。',
  },
  {
    question: 'プランの変更や解約はいつでもできますか？',
    answer: 'はい、プランの変更や解約はいつでも可能です。設定画面から簡単に変更できます。解約後も、契約期間の終了までサービスをご利用いただけます。',
  },
  {
    question: 'データのセキュリティは保証されていますか？',
    answer: '当社はお客様のデータセキュリティを最優先に考えています。すべてのデータは暗号化され、業界標準のセキュリティプロトコルで保護されています。また、定期的なセキュリティ監査を実施しています。',
  },
  {
    question: '複数のスタッフで利用できますか？',
    answer: 'はい、ビジネスプラン以上では、複数のユーザーアカウントを作成して、チームでご利用いただけます。各ユーザーの権限設定も可能です。',
  },
  {
    question: 'Google My Business以外のプラットフォームにも対応していますか？',
    answer: '現在はGoogle My Businessに特化したサービスを提供していますが、今後、他のレビュープラットフォームへの対応も計画しています。ご要望がございましたら、お気軽にお問い合わせください。',
  },
  {
    question: 'サポート体制について教えてください',
    answer: 'メールでのサポートを提供しており、通常2営業日以内に返信いたします。ビジネスプラン以上では、優先サポートをご利用いただけます。また、よくある質問やガイドドキュメントもご用意しています。',
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    company: '',
    inquiryType: '',
    message: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'お名前は必須です';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'メールアドレスは必須です';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'お問い合わせ内容は必須です';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'お問い合わせ内容は10文字以上入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof ContactFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [field]: e.target.value,
    });
    // Clear error for this field when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors({
        ...errors,
        [field]: undefined,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/contact/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus({
          type: 'success',
          message: 'お問い合わせを受け付けました。2営業日以内にご返信いたします。',
        });
        // Reset form
        setFormData({
          name: '',
          email: '',
          company: '',
          inquiryType: '',
          message: '',
        });
      } else {
        setSubmitStatus({
          type: 'error',
          message: data.message || 'お問い合わせの送信に失敗しました。しばらくしてから再度お試しください。',
        });
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: 'ネットワークエラーが発生しました。しばらくしてから再度お試しください。',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>お問い合わせ | RevAI Concierge - レビュー返信AI自動化サービス</title>
        <meta
          name="description"
          content="RevAI Conciergeへのお問い合わせはこちらから。サービスに関するご質問、技術的なサポート、料金プランについてなど、お気軽にお問い合わせください。2営業日以内にご返信いたします。"
        />
        <meta name="keywords" content="お問い合わせ,サポート,カスタマーサポート,ヘルプ,FAQ,よくある質問" />
        <meta property="og:title" content="お問い合わせ | RevAI Concierge" />
        <meta
          property="og:description"
          content="RevAI Conciergeへのお問い合わせ。サービスに関するご質問やサポートが必要な場合は、お気軽にご連絡ください。"
        />
        <meta property="og:type" content="website" />
      </Head>

      <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', py: 6 }}>
        <Container maxWidth="lg">
          {/* Header Section */}
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              sx={{ fontWeight: 700, color: '#1976d2' }}
            >
              お問い合わせ
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              サービスに関するご質問やサポートが必要な場合は、お気軽にお問い合わせください
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 2 }}>
              <AccessTimeIcon color="primary" />
              <Typography variant="body1" color="text.secondary">
                通常2営業日以内にご返信いたします
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={4}>
            {/* Contact Form */}
            <Grid item xs={12} md={7}>
              <Paper elevation={2} sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                  お問い合わせフォーム
                </Typography>

                {submitStatus && (
                  <Alert
                    severity={submitStatus.type}
                    sx={{ mb: 3 }}
                    onClose={() => setSubmitStatus(null)}
                  >
                    {submitStatus.message}
                  </Alert>
                )}

                <form onSubmit={handleSubmit}>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField
                        required
                        fullWidth
                        label="お名前"
                        value={formData.name}
                        onChange={handleChange('name')}
                        error={!!errors.name}
                        helperText={errors.name}
                        disabled={loading}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        required
                        fullWidth
                        type="email"
                        label="メールアドレス"
                        value={formData.email}
                        onChange={handleChange('email')}
                        error={!!errors.email}
                        helperText={errors.email}
                        disabled={loading}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="会社名（任意）"
                        value={formData.company}
                        onChange={handleChange('company')}
                        disabled={loading}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        select
                        label="お問い合わせ種別"
                        value={formData.inquiryType}
                        onChange={handleChange('inquiryType')}
                        disabled={loading}
                      >
                        {inquiryTypes.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        required
                        fullWidth
                        multiline
                        rows={6}
                        label="お問い合わせ内容"
                        value={formData.message}
                        onChange={handleChange('message')}
                        error={!!errors.message}
                        helperText={errors.message || '詳細をご記入ください（10文字以上）'}
                        disabled={loading}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        fullWidth
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                        sx={{ py: 1.5 }}
                      >
                        {loading ? '送信中...' : '送信する'}
                      </Button>
                    </Grid>
                  </Grid>
                </form>
              </Paper>
            </Grid>

            {/* Sidebar - Contact Info */}
            <Grid item xs={12} md={5}>
              <Card elevation={2} sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <EmailIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      メールでのお問い合わせ
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    フォームからのお問い合わせが困難な場合は、直接メールでもお問い合わせいただけます。
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    support@revai-concierge.com
                  </Typography>
                </CardContent>
              </Card>

              <Card elevation={2} sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AccessTimeIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      サポート時間
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    平日: 10:00 - 18:00
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ※土日祝日は休業日となります
                  </Typography>
                </CardContent>
              </Card>

              <Card elevation={2}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <HelpOutlineIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      ご注意事項
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    • お問い合わせ内容によっては、回答にお時間をいただく場合がございます
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    • 営業時間外のお問い合わせは、翌営業日以降の対応となります
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    • お急ぎの場合は、よくある質問もご確認ください
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* FAQ Section */}
          <Box sx={{ mt: 6 }}>
            <Divider sx={{ mb: 4 }} />
            <Typography
              variant="h4"
              component="h2"
              gutterBottom
              sx={{ fontWeight: 700, textAlign: 'center', mb: 4 }}
            >
              よくある質問
            </Typography>
            <Paper elevation={2} sx={{ p: 3 }}>
              {faqs.map((faq, index) => (
                <Accordion
                  key={index}
                  sx={{
                    '&:before': {
                      display: 'none',
                    },
                    mb: 1,
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls={`faq-${index}-content`}
                    id={`faq-${index}-header`}
                  >
                    <Typography sx={{ fontWeight: 600 }}>
                      {faq.question}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography color="text.secondary">
                      {faq.answer}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Paper>
          </Box>
        </Container>
      </Box>
    </>
  );
}
