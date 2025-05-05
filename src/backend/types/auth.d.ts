import { User } from './index';

export interface TokenPayload {
  userId: string;
  tenantId: string;
  role: string;
  iat: number;
  exp: number;
}

export interface AuthUser extends Omit<User, 'tenant_id'> {
  userId: string;
  tenantId: string;
  token: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
} 