import OpenAI from 'openai';
import { Tone } from '@/constants/tone';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export const generateReply = async (
  review: string,
  tone: Tone,
  maxLength: number = 200
): Promise<string> => {
  try {
    const tonePrompt = {
      formal: '丁寧で礼儀正しい口調で',
      casual: 'カジュアルで親しみやすい口調で',
      friendly: 'フレンドリーで温かみのある口調で',
    }[tone];

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `あなたは店舗のレビューに返信する担当者です。
${tonePrompt}、以下のルールに従って返信を作成してください：
1. 感謝の気持ちを伝える
2. 具体的なフィードバックに応える
3. 今後の改善を約束する
4. 再度の来店を促す
5. 文字数は${maxLength}文字以内`,
        },
        {
          role: 'user',
          content: review,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0].message.content || '返信の生成に失敗しました';
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('返信の生成に失敗しました');
  }
}; 