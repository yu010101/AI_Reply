import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  AutoAwesome,
  Speed,
  Analytics,
  LocationOn,
  CheckCircle,
  ExpandMore,
  TrendingUp,
  Schedule,
  Star,
  ThumbUp,
  Security,
  Language,
  ArrowForward,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import Head from 'next/head';

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.5 }
};

export default function LandingPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expandedFaq, setExpandedFaq] = useState<string | false>(false);

  const handleFaqChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedFaq(isExpanded ? panel : false);
  };

  const features = [
    {
      icon: <AutoAwesome sx={{ fontSize: 40 }} />,
      title: 'AI自動返信生成',
      description: '最新のAI技術で、顧客の口コミに対して自然で丁寧な返信を自動生成。トーンやスタイルもカスタマイズ可能です。',
      color: theme.palette.primary.main,
    },
    {
      icon: <Speed sx={{ fontSize: 40 }} />,
      title: '一括返信管理',
      description: '複数の口コミをまとめて管理。未返信の口コミを一覧で確認し、効率的に対応できます。',
      color: theme.palette.secondary.main,
    },
    {
      icon: <Analytics sx={{ fontSize: 40 }} />,
      title: '分析ダッシュボード',
      description: '口コミのトレンドや顧客満足度を可視化。データドリブンな意思決定をサポートします。',
      color: theme.palette.info.main,
    },
    {
      icon: <LocationOn sx={{ fontSize: 40 }} />,
      title: 'マルチロケーション対応',
      description: '複数の店舗や拠点を一元管理。それぞれの店舗に最適化された返信を自動生成します。',
      color: theme.palette.success.main,
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Google連携',
      description: 'Googleビジネスプロフィールと簡単に連携。数クリックで設定完了です。',
      icon: <Language />,
    },
    {
      number: '02',
      title: 'AIが返信を生成',
      description: '口コミの内容を分析し、適切なトーンで返信文を自動生成します。',
      icon: <AutoAwesome />,
    },
    {
      number: '03',
      title: 'ワンクリックで投稿',
      description: '生成された返信を確認・編集して、ワンクリックで投稿できます。',
      icon: <ThumbUp />,
    },
  ];

  const plans = [
    {
      name: 'スターター',
      price: '¥9,800',
      period: '/月',
      description: '個人事業主や小規模店舗向け',
      features: [
        '月間50件まで返信生成',
        '1ロケーション',
        '基本的な分析レポート',
        'メールサポート',
      ],
      popular: false,
    },
    {
      name: 'ビジネス',
      price: '¥29,800',
      period: '/月',
      description: '成長中の企業向け',
      features: [
        '月間200件まで返信生成',
        '最大5ロケーション',
        '詳細な分析ダッシュボード',
        '優先サポート',
        'カスタムテンプレート',
      ],
      popular: true,
    },
    {
      name: 'エンタープライズ',
      price: 'お問い合わせ',
      period: '',
      description: '大規模企業向け',
      features: [
        '無制限の返信生成',
        '無制限のロケーション',
        '高度な分析とレポート',
        '専任サポート',
        'API連携',
        'カスタム開発対応',
      ],
      popular: false,
    },
  ];

  const testimonials = [
    {
      name: '田中 太郎',
      role: 'レストランオーナー',
      company: '銀座レストランA',
      content: 'RevAI Conciergeを導入してから、口コミへの返信率が95%に向上しました。AIが生成する返信は自然で、顧客からの評価も上がっています。',
      avatar: 'T',
      rating: 5,
    },
    {
      name: '佐藤 花子',
      role: 'マーケティング担当',
      company: '美容サロンB',
      content: '複数店舗の口コミ管理が大変でしたが、このツールで一元管理できるようになり、業務効率が3倍になりました。',
      avatar: 'S',
      rating: 5,
    },
    {
      name: '鈴木 次郎',
      role: 'オーナー',
      company: 'ホテルC',
      content: '返信のある口コミは予約率が30%向上するというデータを実感しています。RevAI Conciergeは投資対効果が非常に高いツールです。',
      avatar: 'S',
      rating: 5,
    },
  ];

  const faqs = [
    {
      question: '無料トライアルはありますか？',
      answer: 'はい、14日間の無料トライアルをご用意しています。クレジットカード登録不要で、全ての機能をお試しいただけます。',
    },
    {
      question: 'AIが生成する返信の品質はどうですか？',
      answer: '最新のGPT技術を使用しており、自然で丁寧な日本語の返信を生成します。また、返信内容は投稿前に確認・編集できるため、ブランドのトーンに合わせてカスタマイズ可能です。',
    },
    {
      question: 'セットアップは難しくないですか？',
      answer: 'とても簡単です。Googleビジネスプロフィールと連携するだけで、数分で開始できます。技術的な知識は必要ありません。',
    },
    {
      question: '既存の口コミにも対応できますか？',
      answer: 'はい、過去の未返信の口コミにも対応できます。一括でインポートして、効率的に返信を生成できます。',
    },
    {
      question: 'データのセキュリティは大丈夫ですか？',
      answer: '業界標準のSSL暗号化通信を使用し、データは安全に保護されています。また、GDPR、個人情報保護法に準拠しています。',
    },
    {
      question: 'プランの変更はいつでもできますか？',
      answer: 'はい、いつでもプランのアップグレード・ダウングレードが可能です。日割り計算で料金が調整されます。',
    },
  ];

  return (
    <>
      <Head>
        <title>RevAI Concierge - Google口コミ返信をAIで自動化</title>
        <meta name="description" content="Google口コミへの返信をAIが自動生成。返信率を上げて、ビジネスを成長させましょう。14日間無料トライアル実施中。" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: '#FFFFFF',
          pt: { xs: 10, md: 16 },
          pb: { xs: 10, md: 16 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Typography
                  variant="overline"
                  sx={{
                    color: '#6B7280',
                    letterSpacing: '0.1em',
                    mb: 2,
                    display: 'block',
                  }}
                >
                  14日間無料トライアル
                </Typography>
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4rem' },
                    fontWeight: 400,
                    mb: 3,
                    color: '#1A1A1A',
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Google口コミ返信を、
                  <br />
                  AIで自動化
                </Typography>
                <Typography
                  variant="h5"
                  color="text.secondary"
                  sx={{ mb: 4, fontWeight: 400, lineHeight: 1.6 }}
                >
                  返信のある口コミは購買率が30%向上。
                  <br />
                  AIが自然で丁寧な返信を自動生成し、顧客満足度とビジネスの成長を支援します。
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => router.push('/auth/signup')}
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontSize: '1rem',
                      bgcolor: '#1A1A1A',
                      color: '#FFFFFF',
                      '&:hover': {
                        bgcolor: '#333333',
                      },
                    }}
                  >
                    無料で始める
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => {
                      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontSize: '1rem',
                      borderColor: '#1A1A1A',
                      color: '#1A1A1A',
                      '&:hover': {
                        borderColor: '#1A1A1A',
                        bgcolor: 'rgba(26, 26, 26, 0.04)',
                      },
                    }}
                  >
                    デモを見る
                  </Button>
                </Box>
                <Box sx={{ mt: 6, display: 'flex', gap: 4, alignItems: 'center' }}>
                  <Typography variant="body2" color="#6B7280">
                    クレジットカード不要
                  </Typography>
                  <Typography variant="body2" color="#6B7280">
                    即日利用可能
                  </Typography>
                </Box>
              </motion.div>
            </Grid>
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    height: { xs: 300, md: 450 },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      bgcolor: '#FAFAFA',
                      border: '1px solid #E5E7EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AutoAwesome sx={{ fontSize: 80, color: '#E5E7EB' }} />
                  </Box>
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Problem Statement Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <Typography
              variant="h2"
              align="center"
              sx={{ fontSize: { xs: '2rem', md: '2.5rem' }, fontWeight: 700, mb: 2 }}
            >
              こんなお悩みありませんか？
            </Typography>
            <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 6, maxWidth: 800, mx: 'auto' }}>
              口コミ管理は重要だと分かっていても、日々の業務で手が回らない...
            </Typography>
          </motion.div>

          <Grid container spacing={3}>
            {[
              { icon: <Schedule />, text: '口コミへの返信に時間がかかりすぎる', stat: '平均15分/件' },
              { icon: <TrendingUp />, text: '未返信の口コミが増えて、評価が下がっている', stat: '返信率40%以下' },
              { icon: <LocationOn />, text: '複数店舗の口コミ管理が煩雑', stat: '管理時間2時間/日' },
              { icon: <Star />, text: '返信の質にばらつきがあり、ブランドイメージが統一できない', stat: '品質にばらつき' },
            ].map((item, index) => (
              <Grid item xs={12} sm={6} key={index}>
                <motion.div
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true }}
                  variants={fadeInUp}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    sx={{
                      height: '100%',
                      borderLeft: `4px solid ${theme.palette.error.main}`,
                      bgcolor: alpha(theme.palette.error.main, 0.02),
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Avatar sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main }}>
                          {item.icon}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>
                            {item.text}
                          </Typography>
                          <Chip label={item.stat} size="small" color="error" variant="outlined" />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 6, p: 4, bgcolor: alpha(theme.palette.success.main, 0.05), borderRadius: 2 }}>
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={scaleIn}
            >
              <Typography variant="h4" align="center" fontWeight={700} color="success.main" sx={{ mb: 2 }}>
                返信のある口コミは購買率が30%向上
              </Typography>
              <Typography variant="body1" align="center" color="text.secondary">
                迅速で丁寧な返信は、新規顧客の信頼を獲得し、リピート率を向上させます。
                <br />
                RevAI Conciergeで、返信業務を自動化し、ビジネスの成長に集中しましょう。
              </Typography>
            </motion.div>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
        <Container maxWidth="lg">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <Typography
              variant="h2"
              align="center"
              sx={{ fontSize: { xs: '2rem', md: '2.5rem' }, fontWeight: 700, mb: 2 }}
            >
              主な機能
            </Typography>
            <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 6, maxWidth: 800, mx: 'auto' }}>
              RevAI Conciergeが提供する、口コミ管理を革新する機能
            </Typography>
          </motion.div>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <motion.div
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true }}
                  variants={fadeInUp}
                  transition={{ delay: index * 0.1 }}
                  style={{ height: '100%' }}
                >
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: `0 12px 24px ${alpha(feature.color, 0.2)}`,
                      },
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                      <Avatar
                        sx={{
                          bgcolor: alpha(feature.color, 0.1),
                          color: feature.color,
                          width: 64,
                          height: 64,
                          mx: 'auto',
                          mb: 2,
                        }}
                      >
                        {feature.icon}
                      </Avatar>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* How It Works Section */}
      <Box id="how-it-works" sx={{ py: { xs: 8, md: 12 }, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <Typography
              variant="h2"
              align="center"
              sx={{ fontSize: { xs: '2rem', md: '2.5rem' }, fontWeight: 700, mb: 2 }}
            >
              使い方はとても簡単
            </Typography>
            <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 6, maxWidth: 800, mx: 'auto' }}>
              3つのステップで、すぐに始められます
            </Typography>
          </motion.div>

          <Grid container spacing={4} alignItems="center">
            {steps.map((step, index) => (
              <Grid item xs={12} md={4} key={index}>
                <motion.div
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true }}
                  variants={fadeInUp}
                  transition={{ delay: index * 0.2 }}
                >
                  <Box sx={{ textAlign: 'center', position: 'relative' }}>
                    <Typography
                      variant="h1"
                      sx={{
                        fontSize: '5rem',
                        fontWeight: 900,
                        color: alpha(theme.palette.primary.main, 0.1),
                        position: 'absolute',
                        top: -20,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 0,
                      }}
                    >
                      {step.number}
                    </Typography>
                    <Avatar
                      sx={{
                        bgcolor: theme.palette.primary.main,
                        width: 80,
                        height: 80,
                        mx: 'auto',
                        mb: 2,
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      {step.icon}
                    </Avatar>
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                      {step.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {step.description}
                    </Typography>
                  </Box>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForward />}
              onClick={() => router.push('/auth/signup')}
              sx={{ px: 4, py: 1.5, fontSize: '1.1rem' }}
            >
              今すぐ無料で始める
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Pricing Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: alpha(theme.palette.secondary.main, 0.02) }}>
        <Container maxWidth="lg">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <Typography
              variant="h2"
              align="center"
              sx={{ fontSize: { xs: '2rem', md: '2.5rem' }, fontWeight: 700, mb: 2 }}
            >
              シンプルな料金プラン
            </Typography>
            <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 6, maxWidth: 800, mx: 'auto' }}>
              ビジネスの規模に合わせて選べる3つのプラン
            </Typography>
          </motion.div>

          <Grid container spacing={4} justifyContent="center">
            {plans.map((plan, index) => (
              <Grid item xs={12} md={4} key={index}>
                <motion.div
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true }}
                  variants={scaleIn}
                  transition={{ delay: index * 0.1 }}
                  style={{ height: '100%' }}
                >
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      border: plan.popular ? `2px solid ${theme.palette.primary.main}` : '1px solid',
                      borderColor: plan.popular ? theme.palette.primary.main : 'rgba(0, 0, 0, 0.08)',
                      transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: plan.popular ? 'scale(1.08)' : 'scale(1.03)',
                      },
                    }}
                  >
                    {plan.popular && (
                      <Chip
                        label="人気プラン"
                        color="primary"
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: -12,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontWeight: 700,
                        }}
                      />
                    )}
                    <CardContent sx={{ flexGrow: 1, p: 4 }}>
                      <Typography variant="h5" fontWeight={700} gutterBottom>
                        {plan.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {plan.description}
                      </Typography>
                      <Box sx={{ mb: 3 }}>
                        <Typography
                          variant="h3"
                          component="span"
                          fontWeight={800}
                          color="primary"
                        >
                          {plan.price}
                        </Typography>
                        <Typography variant="body1" component="span" color="text.secondary">
                          {plan.period}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 3 }}>
                        {plan.features.map((feature, idx) => (
                          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <CheckCircle color="success" fontSize="small" />
                            <Typography variant="body2">{feature}</Typography>
                          </Box>
                        ))}
                      </Box>
                      <Button
                        variant={plan.popular ? 'contained' : 'outlined'}
                        fullWidth
                        size="large"
                        onClick={() => router.push('/auth/signup')}
                        sx={{ mt: 'auto' }}
                      >
                        {plan.price === 'お問い合わせ' ? 'お問い合わせ' : '無料で始める'}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="body2" color="text.secondary">
              すべてのプランで14日間の無料トライアルをご利用いただけます
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <Typography
              variant="h2"
              align="center"
              sx={{ fontSize: { xs: '2rem', md: '2.5rem' }, fontWeight: 700, mb: 2 }}
            >
              お客様の声
            </Typography>
            <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 6, maxWidth: 800, mx: 'auto' }}>
              RevAI Conciergeを導入された企業様の声
            </Typography>
          </motion.div>

          <Grid container spacing={4}>
            {testimonials.map((testimonial, index) => (
              <Grid item xs={12} md={4} key={index}>
                <motion.div
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true }}
                  variants={fadeInUp}
                  transition={{ delay: index * 0.1 }}
                  style={{ height: '100%' }}
                >
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', mb: 2 }}>
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} sx={{ color: theme.palette.warning.main, fontSize: 20 }} />
                        ))}
                      </Box>
                      <Typography variant="body1" sx={{ mb: 3, fontStyle: 'italic' }}>
                        &ldquo;{testimonial.content}&rdquo;
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                          {testimonial.avatar}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700}>
                            {testimonial.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {testimonial.role} - {testimonial.company}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 6, textAlign: 'center' }}>
            <Box sx={{ display: 'inline-flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Chip icon={<Security />} label="SSL暗号化通信" variant="outlined" />
              <Chip icon={<CheckCircle />} label="GDPR準拠" variant="outlined" />
              <Chip icon={<Star />} label="平均評価4.8/5" variant="outlined" />
            </Box>
          </Box>
        </Container>
      </Box>

      {/* FAQ Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: alpha(theme.palette.info.main, 0.02) }}>
        <Container maxWidth="md">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <Typography
              variant="h2"
              align="center"
              sx={{ fontSize: { xs: '2rem', md: '2.5rem' }, fontWeight: 700, mb: 2 }}
            >
              よくある質問
            </Typography>
            <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 6 }}>
              お客様からよくいただく質問をまとめました
            </Typography>
          </motion.div>

          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
              transition={{ delay: index * 0.05 }}
            >
              <Accordion
                expanded={expandedFaq === `panel${index}`}
                onChange={handleFaqChange(`panel${index}`)}
                sx={{
                  mb: 2,
                  '&:before': { display: 'none' },
                  boxShadow: 'none',
                  border: '1px solid',
                  borderColor: 'rgba(0, 0, 0, 0.08)',
                }}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography fontWeight={600}>{faq.question}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography color="text.secondary">{faq.answer}</Typography>
                </AccordionDetails>
              </Accordion>
            </motion.div>
          ))}
        </Container>
      </Box>

      {/* Final CTA Section */}
      <Box
        sx={{
          py: { xs: 10, md: 16 },
          bgcolor: '#1A1A1A',
          color: '#FFFFFF',
        }}
      >
        <Container maxWidth="md">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <Typography
              variant="h2"
              align="center"
              sx={{ fontSize: { xs: '2rem', md: '2.5rem' }, fontWeight: 400, mb: 2, color: '#FFFFFF' }}
            >
              今すぐ始めて、
              <br />
              ビジネスを加速させましょう
            </Typography>
            <Typography variant="body1" align="center" sx={{ mb: 6, color: '#9CA3AF' }}>
              14日間無料トライアル - クレジットカード登録不要
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => router.push('/auth/signup')}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1rem',
                  bgcolor: '#FFFFFF',
                  color: '#1A1A1A',
                  '&:hover': {
                    bgcolor: '#F5F5F5',
                  },
                }}
              >
                無料で始める
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => router.push('/contact')}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1rem',
                  borderColor: '#6B7280',
                  color: '#FFFFFF',
                  '&:hover': {
                    borderColor: '#FFFFFF',
                    bgcolor: 'rgba(255, 255, 255, 0.04)',
                  },
                }}
              >
                お問い合わせ
              </Button>
            </Box>
            <Box sx={{ mt: 8, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { value: '95%', label: '返信率達成' },
                { value: '70%', label: '業務時間削減' },
                { value: '98%', label: '満足度' },
              ].map((stat, index) => (
                <Box key={index} sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ fontWeight: 400, color: '#FFFFFF' }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6B7280' }}>
                    {stat.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 6, bgcolor: alpha(theme.palette.grey[900], 0.95), color: 'white' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                RevAI Concierge
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
                AIで口コミ管理を自動化し、ビジネスの成長を支援します。
              </Typography>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                製品
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" sx={{ opacity: 0.8, cursor: 'pointer' }}>
                  機能
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, cursor: 'pointer' }}>
                  料金
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, cursor: 'pointer' }}>
                  事例
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                サポート
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" sx={{ opacity: 0.8, cursor: 'pointer' }}>
                  ヘルプセンター
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, cursor: 'pointer' }}>
                  お問い合わせ
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, cursor: 'pointer' }}>
                  FAQ
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                会社
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" sx={{ opacity: 0.8, cursor: 'pointer' }}>
                  会社概要
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, cursor: 'pointer' }}>
                  ブログ
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, cursor: 'pointer' }}>
                  採用情報
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                法務
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" sx={{ opacity: 0.8, cursor: 'pointer' }}>
                  利用規約
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, cursor: 'pointer' }}>
                  プライバシーポリシー
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, cursor: 'pointer' }}>
                  特定商取引法
                </Typography>
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ mt: 6, pt: 4, borderTop: '1px solid', borderColor: alpha('#fff', 0.1), textAlign: 'center' }}>
            <Typography variant="body2" sx={{ opacity: 0.6 }}>
              © 2024 RevAI Concierge. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </>
  );
}
