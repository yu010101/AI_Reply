import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { supabase } from '@/utils/supabase';
import { recordUsage } from '@/utils/usage-metrics';
import { logger } from '@/utils/logger';

// OpenAI API設定
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface BulkGenerateRequest {
  reviewIds: string[];
  tone?: string;
  templateId?: string;
}

interface GeneratedReply {
  reviewId: string;
  reply: string;
  success: boolean;
  error?: string;
}

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
    const { reviewIds, tone, templateId }: BulkGenerateRequest = req.body;

    if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
      return res.status(400).json({ error: 'レビューIDの配列が必要です' });
    }

    // 最大処理件数をチェック（一度に50件まで）
    if (reviewIds.length > 50) {
      return res.status(400).json({ error: '一度に処理できるのは50件までです' });
    }

    // 使用量をカウント（一括処理の場合も個別にカウント）
    try {
      await recordUsage('ai_reply', reviewIds.length);
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

    // レビュー情報を取得
    const { data: reviews, error: reviewError } = await supabase
      .from('reviews')
      .select('*')
      .in('id', reviewIds);

    if (reviewError || !reviews) {
      return res.status(400).json({ error: 'レビュー情報の取得に失敗しました' });
    }

    // ロケーション情報を取得（一括）
    const locationIds = [...new Set(reviews.map(r => r.location_id))];
    const { data: locations, error: locationError } = await supabase
      .from('locations')
      .select('*')
      .in('id', locationIds);

    if (locationError || !locations) {
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

    // テンプレート情報を取得（指定がある場合）
    let templateContent = '';
    let selectedTone = tone || 'friendly';

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
      case 'formal':
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

    // 各レビューに対して返信を生成
    const results: GeneratedReply[] = [];

    for (const review of reviews) {
      try {
        const location = locations.find(l => l.id === review.location_id);
        const businessName = tenant.name || 'お店';
        const locationName = location?.name || '店舗';
        const rating = review.rating;
        const comment = review.comment || '';
        const reviewerName = review.reviewer_name || '匿名ユーザー';

        let prompt = '';

        if (templateContent) {
          const baseContent = templateContent
            .replace(/{{店舗名}}/g, locationName)
            .replace(/{{ビジネス名}}/g, businessName)
            .replace(/{{レビュー評価}}/g, String(rating))
            .replace(/{{投稿者名}}/g, reviewerName)
            .replace(/{{コメント}}/g, comment);

          prompt = `
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
        } else {
          prompt = `
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
        }

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

        results.push({
          reviewId: review.id,
          reply: generatedReply,
          success: true,
        });

        // API rate limitを考慮して少し待機（OpenAIのレート制限対策）
        if (reviews.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error: any) {
        logger.error('個別レビューのAI返信生成エラー', { reviewId: review.id, error });
        results.push({
          reviewId: review.id,
          reply: '',
          success: false,
          error: error.message || 'AI返信の生成に失敗しました',
        });
      }
    }

    // 成功・失敗の集計
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return res.status(200).json({
      results,
      summary: {
        total: reviewIds.length,
        success: successCount,
        failed: failedCount,
      },
    });
  } catch (error) {
    logger.error('一括AI返信生成エラー', { error });
    return res.status(500).json({ error: 'AI返信の生成に失敗しました' });
  }
}
