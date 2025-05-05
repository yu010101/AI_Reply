import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // 仮のサブスクリプションデータを返す
  res.status(200).json({
    data: {
      id: 'dummy-subscription-id',
      plan: 'basic',
      status: 'active',
      startDate: '2024-01-01',
      endDate: '2025-01-01',
    },
  });
} 