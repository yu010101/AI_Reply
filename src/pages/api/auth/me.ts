import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // 仮のユーザー情報を返す
  res.status(200).json({
    data: {
      id: 'dummy-user-id',
      email: 'dummy@example.com',
      tenantId: 'dummy-tenant',
      role: 'user',
    },
  });
} 