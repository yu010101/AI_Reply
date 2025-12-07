import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Switch,
  FormControlLabel,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Check, ExpandMore, Star } from '@mui/icons-material';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface PricingPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
  maxLocations: number;
  maxAIReplies: number;
  analytics: string;
  support: string;
  cta: string;
  ctaVariant: 'contained' | 'outlined';
  popular?: boolean;
  apiAccess?: boolean;
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    description: '個人や小規模店舗に最適',
    features: [
      '1店舗まで',
      '月10件のAI返信',
      '基本分析',
      'レビュー管理',
      '手動返信',
    ],
    maxLocations: 1,
    maxAIReplies: 10,
    analytics: '基本',
    support: 'コミュニティ',
    cta: '無料で始める',
    ctaVariant: 'outlined',
  },
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 5000,
    annualPrice: 4000,
    description: '成長中のビジネスに最適',
    features: [
      '3店舗まで',
      '月100件のAI返信',
      '詳細分析',
      'AI返信生成',
      'LINE通知',
      'カスタムトーン設定',
      'メールサポート',
    ],
    maxLocations: 3,
    maxAIReplies: 100,
    analytics: '詳細',
    support: 'メール',
    cta: '14日間無料トライアル',
    ctaVariant: 'contained',
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPrice: 15000,
    annualPrice: 12000,
    description: '大規模なビジネスに最適',
    features: [
      '10店舗まで',
      '無制限のAI返信',
      '高度な分析',
      'すべてのStarterプラン機能',
      '統計分析',
      '優先サポート',
      'API アクセス',
      'カスタム統合',
    ],
    maxLocations: 10,
    maxAIReplies: -1, // unlimited
    analytics: '高度',
    support: '優先',
    cta: 'お問い合わせ',
    ctaVariant: 'contained',
    apiAccess: true,
  },
];

const faqs = [
  {
    question: '支払い方法は何が利用できますか？',
    answer:
      'クレジットカード（Visa、MasterCard、American Express、JCB）をご利用いただけます。Stripeを通じて安全に決済処理を行います。',
  },
  {
    question: 'プラン変更はいつでもできますか？',
    answer:
      'はい、いつでもプランをアップグレードまたはダウングレードできます。アップグレードは即座に反映され、ダウングレードは次回請求サイクルから適用されます。',
  },
  {
    question: '解約について教えてください',
    answer:
      'サブスクリプションはいつでもキャンセルできます。解約後も、現在の請求期間が終了するまでサービスをご利用いただけます。データは90日間保持されます。',
  },
  {
    question: '返金ポリシーはどうなっていますか？',
    answer:
      '14日間の無料トライアル期間中はいつでもキャンセル可能で、料金は発生しません。有料プランへの移行後は、月単位での日割り返金はございませんが、次回更新前にキャンセルすることで課金を停止できます。',
  },
  {
    question: 'AI返信の制限を超えた場合はどうなりますか？',
    answer:
      'AI返信の月間制限に達した場合、手動での返信は引き続き可能です。上位プランへのアップグレードをご検討いただくか、次月の更新をお待ちください。',
  },
  {
    question: '年間プランの割引について詳しく教えてください',
    answer:
      '年間プランをご選択いただくと、月額料金が20%オフになります。例えば、Starterプランの場合、月額5,000円が年払いで4,000円/月（48,000円/年）になります。',
  },
];

const featureComparison = [
  { feature: '店舗数', free: '1', starter: '3', business: '10' },
  { feature: 'AI返信生成数/月', free: '10件', starter: '100件', business: '無制限' },
  { feature: 'レビュー管理', free: true, starter: true, business: true },
  { feature: '手動返信', free: true, starter: true, business: true },
  { feature: 'AI返信生成', free: false, starter: true, business: true },
  { feature: 'LINE通知', free: false, starter: true, business: true },
  { feature: 'カスタムトーン設定', free: false, starter: true, business: true },
  { feature: '基本分析', free: true, starter: true, business: true },
  { feature: '詳細分析', free: false, starter: true, business: true },
  { feature: '統計分析', free: false, starter: false, business: true },
  { feature: 'カスタム統合', free: false, starter: false, business: true },
  { feature: 'APIアクセス', free: false, starter: false, business: true },
  { feature: 'サポート', free: 'コミュニティ', starter: 'メール', business: '優先' },
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handlePlanSelect = (planId: string) => {
    if (planId === 'free') {
      router.push('/auth/signup');
    } else if (planId === 'business') {
      router.push('/contact');
    } else {
      router.push(`/auth/signup?plan=${planId}&billing=${isAnnual ? 'annual' : 'monthly'}`);
    }
  };

  const formatPrice = (monthlyPrice: number, annualPrice: number) => {
    if (monthlyPrice === 0) return '¥0';
    const price = isAnnual ? annualPrice : monthlyPrice;
    return `¥${price.toLocaleString()}`;
  };

  const calculateSavings = (monthlyPrice: number, annualPrice: number) => {
    if (monthlyPrice === 0) return 0;
    return ((monthlyPrice - annualPrice) / monthlyPrice * 100).toFixed(0);
  };

  return (
    <>
      <Head>
        <title>料金プラン | AI Reply</title>
        <meta
          name="description"
          content="AI Replyの料金プランをご確認ください。無料プランから始めて、ビジネスの成長に合わせてアップグレードできます。"
        />
      </Head>

      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 8 }}>
        <Container maxWidth="lg">
          {/* Header Section */}
          <Box textAlign="center" mb={6}>
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              fontWeight="bold"
              sx={{ fontSize: { xs: '2rem', md: '3rem' } }}
            >
              シンプルで透明な料金プラン
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ mb: 4, fontSize: { xs: '1rem', md: '1.25rem' } }}
            >
              ビジネスの規模に合わせて最適なプランをお選びください
            </Typography>

            {/* Billing Toggle */}
            <Box display="flex" alignItems="center" justifyContent="center" gap={2}>
              <Typography variant="body1" color={!isAnnual ? 'primary' : 'text.secondary'}>
                月払い
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={isAnnual}
                    onChange={(e) => setIsAnnual(e.target.checked)}
                    color="primary"
                  />
                }
                label=""
              />
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body1" color={isAnnual ? 'primary' : 'text.secondary'}>
                  年払い
                </Typography>
                <Chip
                  label="20% OFF"
                  color="success"
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
            </Box>
          </Box>

          {/* Pricing Cards */}
          <Grid container spacing={4} mb={8}>
            {pricingPlans.map((plan) => (
              <Grid item xs={12} md={4} key={plan.id}>
                <Card
                  elevation={plan.popular ? 8 : 2}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                    border: plan.popular ? '2px solid' : '1px solid',
                    borderColor: plan.popular ? 'primary.main' : 'divider',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: theme.shadows[12],
                    },
                  }}
                >
                  {plan.popular && (
                    <Chip
                      icon={<Star />}
                      label="人気プラン"
                      color="primary"
                      sx={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        fontWeight: 'bold',
                      }}
                    />
                  )}

                  <CardContent sx={{ flexGrow: 1, pt: plan.popular ? 6 : 3 }}>
                    <Typography variant="h5" component="h2" gutterBottom fontWeight="bold">
                      {plan.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={3}>
                      {plan.description}
                    </Typography>

                    <Box mb={3}>
                      <Box display="flex" alignItems="baseline" gap={1}>
                        <Typography variant="h3" component="span" fontWeight="bold">
                          {formatPrice(plan.monthlyPrice, plan.annualPrice)}
                        </Typography>
                        {plan.monthlyPrice > 0 && (
                          <Typography variant="h6" color="text.secondary">
                            /月
                          </Typography>
                        )}
                      </Box>
                      {isAnnual && plan.monthlyPrice > 0 && (
                        <Typography variant="body2" color="success.main" sx={{ mt: 0.5 }}>
                          年払いで{calculateSavings(plan.monthlyPrice, plan.annualPrice)}%お得
                        </Typography>
                      )}
                      {isAnnual && plan.monthlyPrice > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          年額 ¥{(plan.annualPrice * 12).toLocaleString()}
                        </Typography>
                      )}
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box>
                      {plan.features.map((feature, index) => (
                        <Box
                          key={index}
                          display="flex"
                          alignItems="flex-start"
                          gap={1}
                          mb={1.5}
                        >
                          <Check color="primary" sx={{ mt: 0.5, fontSize: 20 }} />
                          <Typography variant="body2">{feature}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>

                  <CardActions sx={{ p: 3, pt: 0 }}>
                    <Button
                      variant={plan.ctaVariant}
                      color="primary"
                      fullWidth
                      size="large"
                      onClick={() => handlePlanSelect(plan.id)}
                      sx={{
                        py: 1.5,
                        fontWeight: 'bold',
                        fontSize: '1rem',
                      }}
                    >
                      {plan.cta}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Feature Comparison Table */}
          <Box mb={8}>
            <Typography variant="h4" component="h2" gutterBottom textAlign="center" mb={4}>
              機能比較表
            </Typography>
            <TableContainer component={Paper} elevation={2}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.main' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '1rem' }}>
                      機能
                    </TableCell>
                    <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold', fontSize: '1rem' }}>
                      Free
                    </TableCell>
                    <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold', fontSize: '1rem' }}>
                      Starter
                    </TableCell>
                    <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold', fontSize: '1rem' }}>
                      Business
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {featureComparison.map((row, index) => (
                    <TableRow
                      key={row.feature}
                      sx={{
                        '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                        '&:hover': { bgcolor: 'action.selected' },
                      }}
                    >
                      <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                        {row.feature}
                      </TableCell>
                      <TableCell align="center">
                        {typeof row.free === 'boolean' ? (
                          row.free ? (
                            <Check color="success" />
                          ) : (
                            <Typography color="text.disabled">-</Typography>
                          )
                        ) : (
                          <Typography variant="body2">{row.free}</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {typeof row.starter === 'boolean' ? (
                          row.starter ? (
                            <Check color="success" />
                          ) : (
                            <Typography color="text.disabled">-</Typography>
                          )
                        ) : (
                          <Typography variant="body2">{row.starter}</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {typeof row.business === 'boolean' ? (
                          row.business ? (
                            <Check color="success" />
                          ) : (
                            <Typography color="text.disabled">-</Typography>
                          )
                        ) : (
                          <Typography variant="body2">{row.business}</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* FAQ Section */}
          <Box mb={8}>
            <Typography variant="h4" component="h2" gutterBottom textAlign="center" mb={4}>
              よくある質問
            </Typography>
            {faqs.map((faq, index) => (
              <Accordion
                key={index}
                elevation={2}
                sx={{
                  mb: 2,
                  '&:before': { display: 'none' },
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  sx={{
                    '& .MuiAccordionSummary-content': {
                      my: 2,
                    },
                  }}
                >
                  <Typography variant="h6" fontWeight="medium">
                    {faq.question}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body1" color="text.secondary">
                    {faq.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>

          {/* Enterprise CTA */}
          <Paper
            elevation={3}
            sx={{
              p: 6,
              textAlign: 'center',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            }}
          >
            <Typography variant="h4" component="h2" gutterBottom fontWeight="bold">
              より大規模なご利用をご検討ですか？
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
              50店舗以上、カスタムニーズに対応したエンタープライズプランをご用意しています
            </Typography>
            <Box display="flex" justifyContent="center" gap={2} flexWrap="wrap">
              <Button
                variant="contained"
                size="large"
                sx={{
                  bgcolor: 'white',
                  color: 'primary.main',
                  px: 4,
                  py: 1.5,
                  fontWeight: 'bold',
                  '&:hover': {
                    bgcolor: 'grey.100',
                  },
                }}
                onClick={() => router.push('/contact')}
              >
                お問い合わせ
              </Button>
              <Button
                variant="outlined"
                size="large"
                sx={{
                  borderColor: 'white',
                  color: 'white',
                  px: 4,
                  py: 1.5,
                  fontWeight: 'bold',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
                onClick={() => router.push('/demo')}
              >
                デモを見る
              </Button>
            </Box>
          </Paper>

          {/* Bottom CTA */}
          <Box textAlign="center" mt={8}>
            <Typography variant="body1" color="text.secondary" mb={2}>
              まだ迷っていますか？まずは無料プランから始めましょう
            </Typography>
            <Button
              variant="outlined"
              size="large"
              onClick={() => router.push('/auth/signup')}
              sx={{ px: 4 }}
            >
              無料で始める
            </Button>
          </Box>
        </Container>
      </Box>
    </>
  );
}
