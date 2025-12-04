import { NextApiRequest, NextApiResponse } from 'next';
import { AuthService } from '@/services/auth';
import { SignInData } from '@/types/auth';
import { securityMiddleware } from '@/utils/security';
import { errorMonitoringMiddleware } from '@/utils/monitoring';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data: SignInData = req.body;
    const authService = AuthService.getInstance();
    const { user, error } = await authService.signIn(data);

    if (error) {
      return res.status((error as any).statusCode || 500).json({ error: error.message });
    }

    return res.status(200).json({ user });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default securityMiddleware(errorMonitoringMiddleware(handler)); 