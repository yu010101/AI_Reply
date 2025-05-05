import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/security';
import { db } from '../database';
import { Review, ApiResponse, ErrorResponse } from '../types';

const router = Router();

// レビュー一覧の取得
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { location_id, status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT r.*, l.name as location_name
      FROM reviews r
      JOIN locations l ON r.location_id = l.id
      WHERE l.tenant_id = $1
    `;
    const params: any[] = [req.user?.tenantId];

    if (location_id) {
      query += ' AND r.location_id = $' + (params.length + 1);
      params.push(location_id);
    }

    if (status) {
      query += ' AND r.status = $' + (params.length + 1);
      params.push(status);
    }

    query += ' ORDER BY r.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(Number(limit), offset);

    const result = await db.query<Review>(query, params);
    const countResult = await db.query<{ count: string }>(
      'SELECT COUNT(*) FROM reviews r JOIN locations l ON r.location_id = l.id WHERE l.tenant_id = $1',
      [req.user?.tenantId]
    );

    const response: ApiResponse<Review[]> = {
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: Number(page),
        limit: Number(limit)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    const errorResponse: ErrorResponse = {
      error: {
        code: '500',
        message: 'レビュー一覧の取得に失敗しました'
      }
    };
    res.status(500).json(errorResponse);
  }
});

// レビューの更新
router.put('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      const errorResponse: ErrorResponse = {
        error: {
          code: '400',
          message: 'ステータスを指定してください'
        }
      };
      res.status(400).json(errorResponse);
      return;
    }

    const result = await db.query<Review>(
      `UPDATE reviews r
       SET status = $1, updated_at = NOW()
       FROM locations l
       WHERE r.id = $2 AND r.location_id = l.id AND l.tenant_id = $3
       RETURNING r.*`,
      [status, id, req.user?.tenantId]
    );

    if (result.rows.length === 0) {
      const errorResponse: ErrorResponse = {
        error: {
          code: '404',
          message: 'レビューが見つかりません'
        }
      };
      res.status(404).json(errorResponse);
      return;
    }

    const response: ApiResponse<Review> = {
      data: result.rows[0]
    };

    res.json(response);
  } catch (error) {
    console.error('Failed to update review:', error);
    const errorResponse: ErrorResponse = {
      error: {
        code: '500',
        message: 'レビューの更新に失敗しました'
      }
    };
    res.status(500).json(errorResponse);
  }
});

export default router; 