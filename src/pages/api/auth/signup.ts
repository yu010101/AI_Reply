import { NextApiRequest, NextApiResponse } from 'next';
import { AuthService } from '@/services/auth';
import { SignUpData } from '@/types/auth';
import { securityMiddleware } from '@/utils/security';
import { errorMonitoringMiddleware } from '@/utils/monitoring';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data: SignUpData = req.body;
    const authService = AuthService.getInstance();
    const { user, error } = await authService.signUp(data);

    if (error) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(201).json({ user });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default securityMiddleware(errorMonitoringMiddleware(handler)); 