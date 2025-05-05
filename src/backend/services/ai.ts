import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateReply(comment: string, tone: string): Promise<string> {
  try {
    const prompt = `以下のレビューに対して、${tone}なトーンで返信を生成してください：

${comment}

返信：`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "あなたは店舗のレビューに対する返信を生成するAIアシスタントです。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    });

    return completion.choices[0].message.content || '';
  } catch (error) {
    console.error('返信の生成に失敗しました:', error);
    throw new Error('返信の生成に失敗しました');
  }
} 