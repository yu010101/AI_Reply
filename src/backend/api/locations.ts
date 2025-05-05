import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/security';
import { db } from '../database';
import { Location, ApiResponse, ErrorResponse } from '../types';

const router = Router();

// 店舗一覧の取得
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.query<Location>(
      'SELECT * FROM locations WHERE tenant_id = $1 ORDER BY created_at DESC',
      [req.user?.tenantId]
    );

    const response: ApiResponse<Location[]> = {
      data: result.rows
    };

    res.json(response);
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    const errorResponse: ErrorResponse = {
      error: {
        code: '500',
        message: '店舗一覧の取得に失敗しました'
      }
    };
    res.status(500).json(errorResponse);
  }
});

// 店舗の作成
router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, tone, line_user_id } = req.body;

    if (!name || !tone || !line_user_id) {
      const errorResponse: ErrorResponse = {
        error: {
          code: '400',
          message: '必須項目が不足しています'
        }
      };
      res.status(400).json(errorResponse);
      return;
    }

    const result = await db.query<Location>(
      `INSERT INTO locations (tenant_id, name, tone, line_user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user?.tenantId, name, tone, line_user_id]
    );

    const response: ApiResponse<Location> = {
      data: result.rows[0]
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Failed to create location:', error);
    const errorResponse: ErrorResponse = {
      error: {
        code: '500',
        message: '店舗の作成に失敗しました'
      }
    };
    res.status(500).json(errorResponse);
  }
});

// 店舗の更新
router.put('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, tone, line_user_id } = req.body;

    if (!name || !tone || !line_user_id) {
      const errorResponse: ErrorResponse = {
        error: {
          code: '400',
          message: '必須項目が不足しています'
        }
      };
      res.status(400).json(errorResponse);
      return;
    }

    const result = await db.query<Location>(
      `UPDATE locations
       SET name = $1, tone = $2, line_user_id = $3, updated_at = NOW()
       WHERE id = $4 AND tenant_id = $5
       RETURNING *`,
      [name, tone, line_user_id, id, req.user?.tenantId]
    );

    if (result.rows.length === 0) {
      const errorResponse: ErrorResponse = {
        error: {
          code: '404',
          message: '店舗が見つかりません'
        }
      };
      res.status(404).json(errorResponse);
      return;
    }

    const response: ApiResponse<Location> = {
      data: result.rows[0]
    };

    res.json(response);
  } catch (error) {
    console.error('Failed to update location:', error);
    const errorResponse: ErrorResponse = {
      error: {
        code: '500',
        message: '店舗の更新に失敗しました'
      }
    };
    res.status(500).json(errorResponse);
  }
});

export default router; 