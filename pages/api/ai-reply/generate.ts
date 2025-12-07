import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { supabase } from '@/utils/supabase';
import { recordUsage } from '@/utils/usage-metrics';
import { logger } from '@/utils/logger';

// OpenAI API設定
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // セッションからユーザー情報を取得
    const { data: { session: authSession } } = await supabase.auth.getSession();

    if (!authSession) {
      return res.status(401).json({ error: '認証されていません' });
    }

    const userId = authSession.user.id;
    const { reviewId, tone, templateId } = req.body;

    if (!reviewId) {
      return res.status(400).json({ error: 'レビューIDが必要です' });
    }

    // レビュー情報を取得
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (reviewError) {
      return res.status(400).json({ error: 'レビュー情報の取得に失敗しました' });
    }

    // ロケーション情報を取得
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('name')
      .eq('id', review.location_id)
      .single();

    if (locationError) {
      return res.status(400).json({ error: 'ロケーション情報の取得に失敗しました' });
    }

    // テナント情報を取得
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', userId)
      .single();

    if (tenantError) {
      return res.status(400).json({ error: 'テナント情報の取得に失敗しました' });
    }

    // 使用量をカウント
    try {
      await recordUsage('ai_reply', 1);
    } catch (err: any) {
      if (err.limitExceeded) {
        return res.status(403).json({
          error: 'AI返信生成の上限に達しました',
          limitExceeded: true,
          currentUsage: err.currentUsage,
          limit: err.limit
        });
      }
      throw err;
    }

    // 基本情報
    const businessName = tenant.name || 'お店';
    const locationName = location.name || '店舗';
    const rating = review.rating;
    const comment = review.comment || '';
    const reviewerName = review.reviewer_name || '匿名ユーザー';

    let templateContent = '';
    let selectedTone = tone || 'polite';

    // テンプレートIDが提供された場合、そのテンプレートを使用
    if (templateId) {
      const { data: template, error: templateError } = await supabase
        .from('reply_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (!templateError && template) {
        templateContent = template.content;
        selectedTone = template.tone;
      }
    } else if (!tone) {
      // トーンもテンプレートIDも指定されていない場合、デフォルトテンプレートを取得
      const { data: defaultTemplate, error: defaultTemplateError } = await supabase
        .from('reply_templates')
        .select('*')
        .eq('is_default', true)
        .single();

      if (!defaultTemplateError && defaultTemplate) {
        templateContent = defaultTemplate.content;
        selectedTone = defaultTemplate.tone;
      }
    }

    // トーン指示を設定
    let toneInstruction = '';
    switch (selectedTone) {
      case 'polite':
        toneInstruction = '丁寧かつフォーマルな口調で';
        break;
      case 'friendly':
        toneInstruction = '親しみやすく友好的な口調で';
        break;
      case 'apologetic':
        toneInstruction = '謝罪の気持ちを込めて';
        break;
      case 'grateful':
        toneInstruction = '感謝の気持ちを強調して';
        break;
      case 'professional':
        toneInstruction = 'プロフェッショナルで信頼感のある口調で';
        break;
      default:
        toneInstruction = '誠実な口調で';
    }

    // テンプレートが提供された場合、変数を置換
    let baseContent = '';
    if (templateContent) {
      baseContent = templateContent
        .replace(/{{店舗名}}/g, locationName)
        .replace(/{{ビジネス名}}/g, businessName)
        .replace(/{{レビュー評価}}/g, String(rating))
        .replace(/{{投稿者名}}/g, reviewerName)
        .replace(/{{コメント}}/g, comment);

      // プロンプトを構築（テンプレートベース）
      const prompt = `
以下のテンプレートに基づいて、${businessName}の${locationName}店舗のGoogleレビューに対する返信を${toneInstruction}作成してください。

レビュー評価: ${rating}点 (5点満点)
レビュー投稿者: ${reviewerName}
レビューコメント: 
"${comment}"

テンプレート:
"${baseContent}"

このテンプレートを元に、自然な返信を生成してください。文脈に合わせて適切に調整してください。
返信は日本語で、150文字以内にまとめてください。
ユーザー名には敬称（様、さん）を付けてください。
返信文のみを出力し、余計な説明は不要です。

返信:
`;

      // OpenAI APIを呼び出し
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "あなたはGoogleビジネスプロフィールのレビューに対する返信を代行する専門家です。" },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      const generatedReply = completion.choices[0].message.content?.trim() || '';

      return res.status(200).json({ 
        reply: generatedReply,
        reviewId: reviewId,
        usedTemplate: true
      });
    } else {
      // テンプレートなしの通常のプロンプト
      const prompt = `
あなたは${businessName}の${locationName}の店舗スタッフです。以下のGoogleレビューに対する返信を${toneInstruction}作成してください。

レビュー評価: ${rating}点 (5点満点)
レビュー投稿者: ${reviewerName}
レビューコメント: 
"${comment}"

返信は日本語で、150文字以内にまとめてください。
ユーザー名には敬称（様、さん）を付けてください。
返信文のみを出力し、余計な説明は不要です。

返信:
`;

      // OpenAI APIを呼び出し
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "あなたはGoogleビジネスプロフィールのレビューに対する返信を代行する専門家です。" },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      const generatedReply = completion.choices[0].message.content?.trim() || '';

      return res.status(200).json({ 
        reply: generatedReply,
        reviewId: reviewId,
        usedTemplate: false
      });
    }
  } catch (error) {
    logger.error('AI返信生成エラー', { error });
    return res.status(500).json({ error: 'AI返信の生成に失敗しました' });
  }
} 