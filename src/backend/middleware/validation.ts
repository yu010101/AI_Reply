import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types';

// バリデーションエラーの型定義
export interface ValidationError {
  field: string;
  message: string;
}

// バリデーションルールの型定義
export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'uuid';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
}

// バリデーションミドルウェア
export const validateRequest = (rules: ValidationRule[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: ValidationError[] = [];

    rules.forEach(rule => {
      const value = req.body[rule.field];

      // 必須チェック
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: rule.field,
          message: `${rule.field}は必須です`
        });
        return;
      }

      // 型チェック
      if (value !== undefined && value !== null) {
        if (rule.type === 'string' && typeof value !== 'string') {
          errors.push({
            field: rule.field,
            message: `${rule.field}は文字列である必要があります`
          });
        } else if (rule.type === 'number' && typeof value !== 'number') {
          errors.push({
            field: rule.field,
            message: `${rule.field}は数値である必要があります`
          });
        } else if (rule.type === 'boolean' && typeof value !== 'boolean') {
          errors.push({
            field: rule.field,
            message: `${rule.field}は真偽値である必要があります`
          });
        } else if (rule.type === 'uuid' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
          errors.push({
            field: rule.field,
            message: `${rule.field}は有効なUUIDである必要があります`
          });
        }
      }

      // 文字列長チェック
      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push({
            field: rule.field,
            message: `${rule.field}は${rule.minLength}文字以上である必要があります`
          });
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push({
            field: rule.field,
            message: `${rule.field}は${rule.maxLength}文字以下である必要があります`
          });
        }
      }

      // パターンチェック
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        errors.push({
          field: rule.field,
          message: `${rule.field}の形式が正しくありません`
        });
      }
    });

    if (errors.length > 0) {
      const errorResponse: ErrorResponse = {
        error: {
          code: '400',
          message: '入力値が不正です',
          details: errors
        }
      };
      res.status(400).json(errorResponse);
      return;
    }

    next();
  };
}; 