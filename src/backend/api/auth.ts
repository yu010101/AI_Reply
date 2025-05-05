import { Router } from 'express';
import { AuthService } from '../auth/auth';
import { authenticate } from '../middleware/security';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: '認証に失敗しました' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, tenantId } = req.body;
    const user = await AuthService.register(email, password, tenantId);
    res.status(201).json({ data: user });
  } catch (error) {
    res.status(400).json({ error: 'ユーザー登録に失敗しました' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await AuthService.getUser(req.user!.id);
    res.json({ data: user });
  } catch (error) {
    res.status(401).json({ error: 'ユーザー情報の取得に失敗しました' });
  }
});

export default router; 