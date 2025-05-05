import { Client } from '@line/bot-sdk';

const client = new Client({
  channelAccessToken: process.env.NEXT_PUBLIC_LINE_CHANNEL_ACCESS_TOKEN || '',
});

export const sendLineNotification = async (
  userId: string,
  message: string
): Promise<void> => {
  try {
    await client.pushMessage(userId, {
      type: 'text',
      text: message,
    });
  } catch (error) {
    console.error('LINE通知エラー:', error);
    throw new Error('LINE通知の送信に失敗しました');
  }
};

export const formatReviewNotification = (
  locationName: string,
  reviewCount: number
): string => {
  return `${locationName}に${reviewCount}件の新しいレビューが届いています。\n\nレビュー管理ページで確認してください。`;
};

export const formatReplyNotification = (
  locationName: string,
  reviewAuthor: string
): string => {
  return `${locationName}の${reviewAuthor}様からのレビューに返信しました。\n\nレビュー管理ページで確認してください。`;
}; 