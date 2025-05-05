import { Router } from 'express';
import { authenticate } from '../middleware/security';
import { db } from '../db';

const router = Router();

// テナント一覧の取得
router.get('/', authenticate, async (_req, res) => {
  try {
    const result = await db.query('SELECT * FROM tenants');
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'テナント一覧の取得に失敗しました' });
  }
});

// テナントの作成
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, plan } = req.body;
    const result = await db.query(
      'INSERT INTO tenants (name, plan, status) VALUES ($1, $2, $3) RETURNING *',
      [name, plan, 'active']
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    res.status(400).json({ error: 'テナントの作成に失敗しました' });
  }
});

// テナントの更新
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, plan, status } = req.body;
    const result = await db.query(
      'UPDATE tenants SET name = $1, plan = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name, plan, status, id]
    );
    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(400).json({ error: 'テナントの更新に失敗しました' });
  }
});

// テナントの削除
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM tenants WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'テナントの削除に失敗しました' });
  }
});

export default router; 