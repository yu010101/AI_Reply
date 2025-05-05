// import { Request } from 'express'; // 未使用のため削除
import { AuthUser } from './auth';

export interface User {
  id: string;
  email: string;
  tenant_id: string;
  role: string;
  created_at: Date;
  updated_at: Date;
}

export interface Tenant {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface Location {
  id: string;
  tenant_id: string;
  name: string;
  tone: string;
  line_user_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Review {
  id: string;
  location_id: string;
  author: string;
  rating: number;
  comment: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface Reply {
  id: string;
  review_id: string;
  content: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface ApiResponse<T> {
  data: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      tenant?: Tenant;
    }
  }
} 