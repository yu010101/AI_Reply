import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
} from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { motion, useInView } from 'framer-motion';
import Head from 'next/head';

// Animated counter hook
function useCounter(end: number, duration: number = 2000, startOnView: boolean = true) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const hasStarted = useRef(false);

  useEffect(() => {
    if (startOnView && !isInView) return;
    if (hasStarted.current) return;
    hasStarted.current = true;

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration, isInView, startOnView]);

  return { count, ref };
}

// Simple fade animation
const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

export default function LandingPage() {
  const router = useRouter();

  const timeCounter = useCounter(97, 1500);
  const companiesCounter = useCounter(500, 2000);
  const repliesCounter = useCounter(100, 2000);

  return (
    <>
      <Head>
        <title>RevAI Concierge - Google口コミ返信をAIで自動化</title>
        <meta name="description" content="口コミ返信を15分から30秒に。AIが自然で丁寧な返信を自動生成し、購買率30%向上を実現。" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Hero Section - Impact First */}
      <Box
        component="section"
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          bgcolor: '#FFFFFF',
          pt: { xs: 8, md: 0 },
          pb: { xs: 8, md: 0 },
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={8} alignItems="center">
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {/* Main Impact Statement */}
                <Box sx={{ mb: 4 }}>
                  <Typography
                    variant="h1"
                    sx={{
                      fontSize: { xs: '3rem', md: '4.5rem', lg: '5.5rem' },
                      fontWeight: 400,
                      color: '#1A1A1A',
                      lineHeight: 1,
                      letterSpacing: '-0.03em',
                      mb: 1,
                    }}
                  >
                    15分
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: '1.5rem', md: '2rem' },
                      color: '#6B7280',
                      fontWeight: 400,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      mb: 1,
                    }}
                  >
                    <span style={{ fontSize: '2rem' }}>↓</span>
                  </Typography>
                  <Typography
                    variant="h1"
                    sx={{
                      fontSize: { xs: '3rem', md: '4.5rem', lg: '5.5rem' },
                      fontWeight: 400,
                      color: '#1A1A1A',
                      lineHeight: 1,
                      letterSpacing: '-0.03em',
                    }}
                  >
                    30秒
                  </Typography>
                </Box>

                <Typography
                  sx={{
                    fontSize: { xs: '1.125rem', md: '1.25rem' },
                    color: '#6B7280',
                    lineHeight: 1.7,
                    mb: 4,
                    maxWidth: '480px',
                  }}
                >
                  口コミ返信にかかる時間を
                  <Box component="span" sx={{ color: '#1A1A1A', fontWeight: 500 }}>97%削減</Box>。
                  <br />
                  AIが自然で丁寧な返信を自動生成します。
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 6 }}>
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
                      borderRadius: '2px',
                      '&:hover': {
                        bgcolor: '#333333',
                      },
                    }}
                  >
                    無料で始める
                  </Button>
                </Box>

                {/* Trust Indicators */}
                <Box sx={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', letterSpacing: '0.1em', textTransform: 'uppercase', mb: 0.5 }}>
                      導入企業
                    </Typography>
                    <Typography sx={{ fontSize: '1.5rem', color: '#1A1A1A', fontWeight: 400 }}>
                      500社+
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', letterSpacing: '0.1em', textTransform: 'uppercase', mb: 0.5 }}>
                      返信生成数
                    </Typography>
                    <Typography sx={{ fontSize: '1.5rem', color: '#1A1A1A', fontWeight: 400 }}>
                      100万件+
                    </Typography>
                  </Box>
                </Box>
              </motion.div>
            </Grid>

            {/* Demo Preview */}
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Box
                  sx={{
                    bgcolor: '#FAFAFA',
                    border: '1px solid #E5E7EB',
                    p: { xs: 3, md: 4 },
                  }}
                >
                  {/* Mock Review */}
                  <Box sx={{ mb: 4 }}>
                    <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', letterSpacing: '0.05em', textTransform: 'uppercase', mb: 2 }}>
                      受信した口コミ
                    </Typography>
                    <Box sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', p: 3 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                        {[...Array(5)].map((_, i) => (
                          <Box key={i} sx={{ color: i < 4 ? '#FBBF24' : '#E5E7EB', fontSize: '1rem' }}>★</Box>
                        ))}
                      </Box>
                      <Typography sx={{ fontSize: '0.875rem', color: '#1A1A1A', lineHeight: 1.7 }}>
                        料理は美味しかったですが、待ち時間が少し長かったです。次回はもう少しスムーズだと嬉しいです。
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', mt: 1 }}>
                        山田太郎 - 2日前
                      </Typography>
                    </Box>
                  </Box>

                  {/* AI Generated Reply */}
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        AI生成された返信
                      </Typography>
                      <Box sx={{
                        fontSize: '0.625rem',
                        color: '#059669',
                        bgcolor: 'rgba(5, 150, 105, 0.1)',
                        px: 1,
                        py: 0.25,
                        borderRadius: '2px',
                      }}>
                        30秒で生成
                      </Box>
                    </Box>
                    <Box sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', p: 3 }}>
                      <Typography sx={{ fontSize: '0.875rem', color: '#1A1A1A', lineHeight: 1.8 }}>
                        山田様、この度はご来店いただき誠にありがとうございます。お料理をお楽しみいただけたとのこと、大変嬉しく存じます。
                        <br /><br />
                        一方で、お待たせしてしまい申し訳ございませんでした。スタッフ一同、オペレーションの改善に努めてまいります。
                        <br /><br />
                        またのご来店を心よりお待ちしております。
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Social Proof Section */}
      <Box
        component="section"
        sx={{
          py: { xs: 10, md: 16 },
          bgcolor: '#FAFAFA',
          borderTop: '1px solid #E5E7EB',
          borderBottom: '1px solid #E5E7EB',
        }}
      >
        <Container maxWidth="lg">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeIn}
          >
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: '#9CA3AF',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                textAlign: 'center',
                mb: 4,
              }}
            >
              なぜ口コミ返信が重要なのか
            </Typography>

            <Grid container spacing={6} justifyContent="center">
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    ref={timeCounter.ref}
                    sx={{
                      fontSize: { xs: '3rem', md: '4rem' },
                      fontWeight: 400,
                      color: '#1A1A1A',
                      lineHeight: 1,
                      mb: 1,
                    }}
                  >
                    {timeCounter.count}%
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', lineHeight: 1.6 }}>
                    返信があると購買検討率が向上
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', mt: 1 }}>
                    出典: BrightLocal調査
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    sx={{
                      fontSize: { xs: '3rem', md: '4rem' },
                      fontWeight: 400,
                      color: '#1A1A1A',
                      lineHeight: 1,
                      mb: 1,
                    }}
                  >
                    30%
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', lineHeight: 1.6 }}>
                    返信のある口コミは予約率向上
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', mt: 1 }}>
                    出典: Google調査
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    sx={{
                      fontSize: { xs: '3rem', md: '4rem' },
                      fontWeight: 400,
                      color: '#1A1A1A',
                      lineHeight: 1,
                      mb: 1,
                    }}
                  >
                    53%
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', lineHeight: 1.6 }}>
                    の顧客は1週間以内の返信を期待
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', mt: 1 }}>
                    出典: ReviewTrackers
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </motion.div>
        </Container>
      </Box>

      {/* How It Works - Simple 3 Steps */}
      <Box
        component="section"
        sx={{
          py: { xs: 10, md: 16 },
          bgcolor: '#FFFFFF',
        }}
      >
        <Container maxWidth="md">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeIn}
          >
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: '#9CA3AF',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                textAlign: 'center',
                mb: 2,
              }}
            >
              使い方
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '1.75rem', md: '2.25rem' },
                fontWeight: 400,
                color: '#1A1A1A',
                textAlign: 'center',
                mb: 8,
                letterSpacing: '-0.02em',
              }}
            >
              3ステップで完了
            </Typography>

            <Grid container spacing={6}>
              {[
                {
                  step: '01',
                  title: 'Google連携',
                  description: 'Googleビジネスプロフィールと連携。数クリックで設定完了。',
                },
                {
                  step: '02',
                  title: 'AI生成',
                  description: '口コミの内容・トーンを分析し、最適な返信を自動生成。',
                },
                {
                  step: '03',
                  title: 'ワンクリック投稿',
                  description: '内容を確認して投稿。必要に応じて編集も可能。',
                },
              ].map((item, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Box>
                      <Typography
                        sx={{
                          fontSize: '0.75rem',
                          color: '#9CA3AF',
                          letterSpacing: '0.1em',
                          mb: 1,
                        }}
                      >
                        {item.step}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '1.25rem',
                          fontWeight: 400,
                          color: '#1A1A1A',
                          mb: 1,
                        }}
                      >
                        {item.title}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.875rem',
                          color: '#6B7280',
                          lineHeight: 1.7,
                        }}
                      >
                        {item.description}
                      </Typography>
                    </Box>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Container>
      </Box>

      {/* Pricing - Simple */}
      <Box
        component="section"
        sx={{
          py: { xs: 10, md: 16 },
          bgcolor: '#FAFAFA',
          borderTop: '1px solid #E5E7EB',
        }}
      >
        <Container maxWidth="md">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeIn}
          >
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: '#9CA3AF',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                textAlign: 'center',
                mb: 2,
              }}
            >
              料金
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '1.75rem', md: '2.25rem' },
                fontWeight: 400,
                color: '#1A1A1A',
                textAlign: 'center',
                mb: 2,
                letterSpacing: '-0.02em',
              }}
            >
              シンプルな料金体系
            </Typography>
            <Typography
              sx={{
                fontSize: '1rem',
                color: '#6B7280',
                textAlign: 'center',
                mb: 8,
              }}
            >
              14日間無料トライアル。クレジットカード不要。
            </Typography>

            <Grid container spacing={4} justifyContent="center">
              {[
                {
                  name: 'スターター',
                  price: '¥4,900',
                  description: '小規模店舗向け',
                  features: ['月50件まで', '1ロケーション', 'メールサポート'],
                },
                {
                  name: 'ビジネス',
                  price: '¥14,900',
                  description: '成長中の企業向け',
                  features: ['月200件まで', '5ロケーション', '優先サポート', 'カスタムテンプレート'],
                  highlighted: true,
                },
                {
                  name: 'エンタープライズ',
                  price: 'お問い合わせ',
                  description: '大規模企業向け',
                  features: ['無制限', '無制限', '専任サポート', 'API連携'],
                },
              ].map((plan, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    style={{ height: '100%' }}
                  >
                    <Box
                      sx={{
                        height: '100%',
                        p: 4,
                        bgcolor: '#FFFFFF',
                        border: plan.highlighted ? '2px solid #1A1A1A' : '1px solid #E5E7EB',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '0.875rem',
                          color: '#1A1A1A',
                          fontWeight: 500,
                          mb: 1,
                        }}
                      >
                        {plan.name}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '2rem',
                          color: '#1A1A1A',
                          fontWeight: 400,
                          mb: 0.5,
                        }}
                      >
                        {plan.price}
                        {plan.price !== 'お問い合わせ' && (
                          <Typography component="span" sx={{ fontSize: '0.875rem', color: '#6B7280' }}>
                            /月
                          </Typography>
                        )}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.875rem',
                          color: '#6B7280',
                          mb: 3,
                        }}
                      >
                        {plan.description}
                      </Typography>
                      <Box sx={{ mb: 3, flexGrow: 1 }}>
                        {plan.features.map((feature, i) => (
                          <Typography
                            key={i}
                            sx={{
                              fontSize: '0.875rem',
                              color: '#6B7280',
                              mb: 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <span style={{ color: '#1A1A1A' }}>—</span> {feature}
                          </Typography>
                        ))}
                      </Box>
                      <Button
                        variant={plan.highlighted ? 'contained' : 'outlined'}
                        fullWidth
                        onClick={() => router.push('/auth/signup')}
                        sx={{
                          py: 1.5,
                          borderRadius: '2px',
                          ...(plan.highlighted
                            ? {
                                bgcolor: '#1A1A1A',
                                color: '#FFFFFF',
                                '&:hover': { bgcolor: '#333333' },
                              }
                            : {
                                borderColor: '#1A1A1A',
                                color: '#1A1A1A',
                                '&:hover': { bgcolor: 'rgba(26,26,26,0.04)' },
                              }),
                        }}
                      >
                        {plan.price === 'お問い合わせ' ? 'お問い合わせ' : '無料で始める'}
                      </Button>
                    </Box>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Container>
      </Box>

      {/* Final CTA */}
      <Box
        component="section"
        sx={{
          py: { xs: 12, md: 20 },
          bgcolor: '#1A1A1A',
        }}
      >
        <Container maxWidth="sm">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeIn}
          >
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '1.75rem', md: '2.5rem' },
                fontWeight: 400,
                color: '#FFFFFF',
                textAlign: 'center',
                mb: 2,
                letterSpacing: '-0.02em',
              }}
            >
              口コミ返信を、
              <br />
              今日から自動化
            </Typography>
            <Typography
              sx={{
                fontSize: '1rem',
                color: '#9CA3AF',
                textAlign: 'center',
                mb: 4,
              }}
            >
              14日間無料。クレジットカード不要。
            </Typography>
            <Box sx={{ textAlign: 'center' }}>
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                onClick={() => router.push('/auth/signup')}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1rem',
                  bgcolor: '#FFFFFF',
                  color: '#1A1A1A',
                  borderRadius: '2px',
                  '&:hover': {
                    bgcolor: '#F5F5F5',
                  },
                }}
              >
                無料で始める
              </Button>
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 6,
          bgcolor: '#0A0A0A',
          borderTop: '1px solid #1A1A1A',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Typography
                sx={{
                  fontSize: '1rem',
                  color: '#FFFFFF',
                  fontWeight: 400,
                  mb: 2,
                }}
              >
                RevAI Concierge
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  color: '#6B7280',
                  lineHeight: 1.7,
                }}
              >
                AIで口コミ返信を自動化し、
                <br />
                ビジネスの成長を支援します。
              </Typography>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', letterSpacing: '0.05em', textTransform: 'uppercase', mb: 2 }}>
                製品
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography
                  sx={{ fontSize: '0.875rem', color: '#6B7280', cursor: 'pointer', '&:hover': { color: '#FFFFFF' } }}
                  onClick={() => router.push('/pricing')}
                >
                  料金
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', letterSpacing: '0.05em', textTransform: 'uppercase', mb: 2 }}>
                サポート
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography
                  sx={{ fontSize: '0.875rem', color: '#6B7280', cursor: 'pointer', '&:hover': { color: '#FFFFFF' } }}
                  onClick={() => router.push('/contact')}
                >
                  お問い合わせ
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', letterSpacing: '0.05em', textTransform: 'uppercase', mb: 2 }}>
                法務
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography
                  sx={{ fontSize: '0.875rem', color: '#6B7280', cursor: 'pointer', '&:hover': { color: '#FFFFFF' } }}
                  onClick={() => router.push('/legal/terms')}
                >
                  利用規約
                </Typography>
                <Typography
                  sx={{ fontSize: '0.875rem', color: '#6B7280', cursor: 'pointer', '&:hover': { color: '#FFFFFF' } }}
                  onClick={() => router.push('/legal/privacy')}
                >
                  プライバシー
                </Typography>
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ mt: 8, pt: 4, borderTop: '1px solid #1A1A1A' }}>
            <Typography sx={{ fontSize: '0.75rem', color: '#6B7280', textAlign: 'center' }}>
              © 2024 RevAI Concierge. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </>
  );
}
