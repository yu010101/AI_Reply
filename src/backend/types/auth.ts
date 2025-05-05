import { User } from './index';

export interface TokenPayload {
  userId: string;
  exp: number;
}

export interface AuthUser extends Omit<User, 'tenant_id'> {
  tenantId: string;
  token: string;
} 