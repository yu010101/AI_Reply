import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/security';
import { db } from '../database';
import { Reply, ApiResponse, ErrorResponse } from '../types';
import { generateReply } from '../services/ai';

const router = Router();

// 返信の生成
router.post('/generate', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { review_id, tone } = req.body;

    if (!review_id || !tone) {
      const errorResponse: ErrorResponse = {
        error: {
          code: '400',
          message: '必須項目が不足しています'
        }
      };
      res.status(400).json(errorResponse);
      return;
    }

    // レビューの存在確認とテナントの確認
    const reviewResult = await db.query(
      `SELECT r.*, l.tone as location_tone
       FROM reviews r
       JOIN locations l ON r.location_id = l.id
       WHERE r.id = $1 AND l.tenant_id = $2`,
      [review_id, req.user?.tenantId]
    );

    if (reviewResult.rows.length === 0) {
      const errorResponse: ErrorResponse = {
        error: {
          code: '404',
          message: 'レビューが見つかりません'
        }
      };
      res.status(404).json(errorResponse);
      return;
    }

    const review = reviewResult.rows[0];
    const content = await generateReply(review.comment, tone || review.location_tone);

    // 返信の保存
    const result = await db.query<Reply>(
      `INSERT INTO replies (review_id, content, status)
       VALUES ($1, $2, 'draft')
       RETURNING *`,
      [review_id, content]
    );

    const response: ApiResponse<Reply> = {
      data: result.rows[0]
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Failed to generate reply:', error);
    const errorResponse: ErrorResponse = {
      error: {
        code: '500',
        message: '返信の生成に失敗しました'
      }
    };
    res.status(500).json(errorResponse);
  }
});

// 返信の更新
router.put('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { content, status } = req.body;

    if (!content || !status) {
      const errorResponse: ErrorResponse = {
        error: {
          code: '400',
          message: '必須項目が不足しています'
        }
      };
      res.status(400).json(errorResponse);
      return;
    }

    const result = await db.query<Reply>(
      `UPDATE replies r
       SET content = $1, status = $2, updated_at = NOW()
       FROM reviews rev
       JOIN locations l ON rev.location_id = l.id
       WHERE r.id = $3 AND r.review_id = rev.id AND l.tenant_id = $4
       RETURNING r.*`,
      [content, status, id, req.user?.tenantId]
    );

    if (result.rows.length === 0) {
      const errorResponse: ErrorResponse = {
        error: {
          code: '404',
          message: '返信が見つかりません'
        }
      };
      res.status(404).json(errorResponse);
      return;
    }

    const response: ApiResponse<Reply> = {
      data: result.rows[0]
    };

    res.json(response);
  } catch (error) {
    console.error('Failed to update reply:', error);
    const errorResponse: ErrorResponse = {
      error: {
        code: '500',
        message: '返信の更新に失敗しました'
      }
    };
    res.status(500).json(errorResponse);
  }
});

export default router; 