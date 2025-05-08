import { Review } from '@/types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ReplyGenerationOptions {
  tone?: 'formal' | 'casual' | 'friendly';
  language?: 'ja' | 'en';
  maxLength?: number;
}

export async function generateAIReply(
  review: Review,
  options: ReplyGenerationOptions = {}
): Promise<string> {
  const {
    tone = 'friendly',
    language = 'ja',
    maxLength = 200
  } = options;

  const prompt = `
以下のレビューに対する返信を生成してください：
評価: ${review.rating}星
コメント: ${review.comment}
言語: ${language}
トーン: ${tone}
最大文字数: ${maxLength}

返信は以下の点に注意して生成してください：
1. レビューの内容に適切に対応
2. 感謝の意を示す
3. 具体的な改善点があれば言及
4. 指定されたトーンを維持
5. 指定された言語で返信
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "あなたは顧客対応のプロフェッショナルです。レビューへの返信を生成してください。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: maxLength * 2,
    });

    return completion.choices[0].message.content || '';
  } catch (error) {
    console.error('AI返信生成エラー:', error);
    throw new Error('返信の生成に失敗しました');
  }
}

export function analyzeReviewSentiment(review: Review): {
  sentiment: 'positive' | 'neutral' | 'negative';
  keywords: string[];
  topics: string[];
} {
  // 感情分析のロジックを実装
  const sentiment = review.rating >= 4 ? 'positive' : review.rating >= 3 ? 'neutral' : 'negative';
  
  // キーワード抽出（簡易実装）
  const keywords = extractKeywords(review.comment);
  
  // トピック抽出（簡易実装）
  const topics = extractTopics(review.comment);

  return {
    sentiment,
    keywords,
    topics
  };
}

function extractKeywords(text: string): string[] {
  // キーワード抽出のロジックを実装
  const commonKeywords = ['サービス', '対応', '商品', '価格', '品質', '雰囲気'];
  return commonKeywords.filter(keyword => text.includes(keyword));
}

function extractTopics(text: string): string[] {
  // トピック抽出のロジックを実装
  const commonTopics = ['サービス品質', 'スタッフ対応', '商品価格', '店内環境'];
  return commonTopics.filter(topic => text.includes(topic));
} 